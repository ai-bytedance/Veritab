import { createHmac, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma, WebhookProvider } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { WebhookCryptoService } from "./webhook-crypto.service";

interface ClaimedEvent {
  id: string;
  attempts: number;
  payload: Prisma.JsonValue;
}

interface NotificationPayload {
  channelId: string;
  provider: WebhookProvider;
  title: string;
  body: string | null;
  link: string | null;
}

@Injectable()
export class NotificationWorkerService {
  private readonly logger = new Logger(NotificationWorkerService.name);
  private readonly workerId = `notification-${process.pid}-${randomUUID()}`;
  private readonly maxAttempts = 8;

  constructor(private readonly prisma: PrismaService, private readonly crypto: WebhookCryptoService) {}

  async processOne(): Promise<boolean> {
    const events = await this.prisma.$queryRaw<ClaimedEvent[]>(Prisma.sql`
      WITH candidate AS (
        SELECT id FROM outbox_events
        WHERE event_type = 'NotificationRequested'
          AND processed_at IS NULL
          AND dead_lettered_at IS NULL
          AND next_attempt_at <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY occurred_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE outbox_events event
      SET locked_until = NOW() + INTERVAL '60 seconds', locked_by = ${this.workerId}, attempts = attempts + 1
      FROM candidate
      WHERE event.id = candidate.id
      RETURNING event.id, event.attempts, event.payload
    `);
    const event = events[0];
    if (!event) return false;
    try {
      await this.deliver(this.parsePayload(event.payload));
      await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, lockedBy: this.workerId },
        data: { processedAt: new Date(), lockedBy: null, lockedUntil: null, lastError: null },
      });
    } catch (reason) {
      const message = (reason instanceof Error ? reason.message : "Unknown delivery error").slice(0, 1000);
      const dead = event.attempts >= this.maxAttempts;
      const delaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, event.attempts - 1));
      await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, lockedBy: this.workerId },
        data: {
          lockedBy: null,
          lockedUntil: null,
          lastError: message,
          ...(dead ? { deadLetteredAt: new Date() } : { nextAttemptAt: new Date(Date.now() + delaySeconds * 1000) }),
        },
      });
      this.logger.warn(`Notification event ${event.id} failed on attempt ${event.attempts}: ${message}`);
    }
    return true;
  }

  private parsePayload(value: Prisma.JsonValue): NotificationPayload {
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid notification payload");
    const payload = value as Record<string, Prisma.JsonValue>;
    if (typeof payload.channelId !== "string" || typeof payload.provider !== "string" || typeof payload.title !== "string") throw new Error("Invalid notification payload");
    return {
      channelId: payload.channelId,
      provider: payload.provider as WebhookProvider,
      title: payload.title,
      body: typeof payload.body === "string" ? payload.body : null,
      link: typeof payload.link === "string" ? payload.link : null,
    };
  }

  private async deliver(payload: NotificationPayload): Promise<void> {
    const channel = await this.prisma.webhookConfig.findFirst({ where: { id: payload.channelId, enabled: true } });
    if (!channel?.encryptedEndpoint) throw new Error("Notification channel is unavailable");
    const endpoint = this.crypto.decrypt(channel.encryptedEndpoint);
    const secret = channel.encryptedSecret ? this.crypto.decrypt(channel.encryptedSecret) : null;
    const content = [payload.title, payload.body, payload.link].filter(Boolean).join("\n");
    let url = endpoint;
    let body: unknown;
    if (payload.provider === WebhookProvider.DINGTALK) {
      if (secret) {
        const timestamp = Date.now().toString();
        const sign = createHmac("sha256", secret).update(`${timestamp}\n${secret}`).digest("base64");
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
      }
      body = { msgtype: "text", text: { content } };
    } else if (payload.provider === WebhookProvider.FEISHU) {
      const signature = secret ? this.feishuSignature(secret) : {};
      body = { ...signature, msg_type: "text", content: { text: content } };
    } else {
      body = { msgtype: "text", text: { content } };
    }
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new Error("Notification provider is unreachable");
    }
    if (!response.ok) throw new Error(`Notification provider returned HTTP ${response.status}`);
  }

  private feishuSignature(secret: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = createHmac("sha256", `${timestamp}\n${secret}`).update("").digest("base64");
    return { timestamp, sign };
  }
}
