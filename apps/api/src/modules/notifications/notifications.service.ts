import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { WebhookProvider } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RequestNotificationDto } from "./dto/request-notification.dto";
import { UpdateChannelDto } from "./dto/update-channel.dto";
import { WebhookCryptoService } from "./webhook-crypto.service";

const supported = new Set<WebhookProvider>([WebhookProvider.FEISHU, WebhookProvider.WECOM, WebhookProvider.DINGTALK, WebhookProvider.CUSTOM]);

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly crypto: WebhookCryptoService) {}

  private view(channel: { id: string; provider: WebhookProvider; name: string; enabled: boolean; encryptedEndpoint: string | null; encryptedSecret: string | null; version: number; updatedAt: Date }) {
    return { id: channel.id, provider: channel.provider, name: channel.name, enabled: channel.enabled, endpointConfigured: Boolean(channel.encryptedEndpoint), secretConfigured: Boolean(channel.encryptedSecret), version: channel.version, updatedAt: channel.updatedAt };
  }

  async list(projectSpaceId: string) {
    const channels = await this.prisma.webhookConfig.findMany({ where: { projectSpaceId }, orderBy: [{ provider: "asc" }, { name: "asc" }] });
    return channels.map((channel) => this.view(channel));
  }

  async update(organizationId: string, projectSpaceId: string, actorId: string, provider: WebhookProvider, dto: UpdateChannelDto) {
    if (!supported.has(provider)) throw new BadRequestException("Unsupported notification provider");
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.webhookConfig.findFirst({ where: { organizationId, projectSpaceId, provider, name: dto.name } });
      if ((current?.version ?? 0) !== dto.version) throw new ConflictException("Notification channel was modified by another user");
      if (!current && !dto.endpoint) throw new BadRequestException("Endpoint is required for a new channel");
      if (dto.enabled && !dto.endpoint && !current?.encryptedEndpoint) throw new BadRequestException("Configured endpoint is required before enabling a channel");
      const credentials = {
        ...(dto.endpoint !== undefined ? { encryptedEndpoint: this.crypto.encrypt(dto.endpoint) } : {}),
        ...(dto.secret !== undefined ? { encryptedSecret: dto.secret ? this.crypto.encrypt(dto.secret) : null } : {}),
      };
      const channel = current
        ? await tx.webhookConfig.update({ where: { id: current.id }, data: { enabled: dto.enabled, ...credentials, version: { increment: 1 } } })
        : await tx.webhookConfig.create({ data: { organizationId, projectSpaceId, provider, name: dto.name, enabled: dto.enabled, ...credentials } });
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "notification.channel.update", resourceType: "WebhookConfig", resourceId: channel.id, metadata: { provider, name: dto.name, enabled: dto.enabled, endpointChanged: dto.endpoint !== undefined, secretChanged: dto.secret !== undefined } } });
      return this.view(channel);
    });
  }

  async enqueue(organizationId: string, projectSpaceId: string, actorId: string, dto: RequestNotificationDto) {
    if (!supported.has(dto.provider)) throw new BadRequestException("Unsupported notification provider");
    const channel = await this.prisma.webhookConfig.findFirst({ where: { organizationId, projectSpaceId, provider: dto.provider, enabled: true }, select: { id: true } });
    if (!channel) throw new NotFoundException("Enabled notification channel not found");
    const aggregateId = dto.dedupeKey
      ? createHash("sha256").update(`${organizationId}:${projectSpaceId}:${dto.provider}:${dto.dedupeKey}`).digest("hex")
      : randomUUID();
    return this.prisma.$transaction(async (tx) => {
      if (dto.dedupeKey) {
        const existing = await tx.outboxEvent.findFirst({ where: { aggregateType: "NotificationRequest", aggregateId, eventType: "NotificationRequested" }, select: { id: true, occurredAt: true } });
        if (existing) return { id: existing.id, acceptedAt: existing.occurredAt, duplicate: true };
      }
      const event = await tx.outboxEvent.create({
        data: {
          aggregateType: "NotificationRequest",
          aggregateId,
          eventType: "NotificationRequested",
          payload: { organizationId, projectSpaceId, actorId, channelId: channel.id, provider: dto.provider, title: dto.title, body: dto.body || null, link: dto.link || null },
        },
      });
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "notification.request", resourceType: "OutboxEvent", resourceId: event.id, metadata: { provider: dto.provider, deduplicated: Boolean(dto.dedupeKey) } } });
      return { id: event.id, acceptedAt: event.occurredAt, duplicate: false };
    });
  }
}
