import { createHmac, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, WebhookProvider } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { WebhookCryptoService } from "./webhook-crypto.service";
import { NOTIFICATION_EVENT_TYPES } from "./dto/update-channel.dto";

interface ClaimedEvent {
  id: string;
  attempts: number;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: WebhookCryptoService,
    private readonly config: ConfigService,
  ) {}

  async processOne(): Promise<boolean> {
    const events = await this.prisma.$queryRaw<ClaimedEvent[]>(Prisma.sql`
      WITH candidate AS (
        SELECT id FROM outbox_events
        WHERE event_type IN ('NotificationRequested', ${Prisma.join(NOTIFICATION_EVENT_TYPES)})
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
      RETURNING event.id, event.attempts, event.aggregate_type AS "aggregateType",
        event.aggregate_id AS "aggregateId", event.event_type AS "eventType", event.payload
    `);
    const event = events[0];
    if (!event) return false;
    try {
      if (event.eventType === "NotificationRequested") {
        await this.deliver(this.parsePayload(event.payload));
      } else {
        await this.dispatchDomainEvent(event);
      }
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

  private async dispatchDomainEvent(event: ClaimedEvent): Promise<void> {
    const context = this.parseDomainContext(event.payload);
    const message = await this.describeDomainEvent(event);
    await this.prisma.$transaction(async (tx) => {
      const channels = await tx.webhookConfig.findMany({
        where: {
          organizationId: context.organizationId,
          projectSpaceId: context.projectSpaceId,
          enabled: true,
          eventTypes: { has: event.eventType },
        },
        select: { id: true, provider: true },
      });
      for (const channel of channels) {
        await tx.outboxEvent.create({
          data: {
            aggregateType: "NotificationRequest",
            aggregateId: `${event.id}:${channel.id}`,
            eventType: "NotificationRequested",
            payload: {
              organizationId: context.organizationId,
              projectSpaceId: context.projectSpaceId,
              channelId: channel.id,
              provider: channel.provider,
              title: message.title,
              body: message.body,
              link: this.domainLink(context, event),
              sourceEventId: event.id,
            },
          },
        });
      }
      await tx.outboxEvent.updateMany({
        where: { id: event.id, lockedBy: this.workerId },
        data: { processedAt: new Date(), lockedBy: null, lockedUntil: null, lastError: null },
      });
    });
  }

  private parseDomainContext(value: Prisma.JsonValue): { organizationId: string; projectSpaceId: string } {
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid domain event payload");
    const payload = value as Record<string, Prisma.JsonValue>;
    if (typeof payload.organizationId !== "string" || typeof payload.projectSpaceId !== "string") {
      throw new Error("Invalid domain event context");
    }
    return { organizationId: payload.organizationId, projectSpaceId: payload.projectSpaceId };
  }

  private domainLink(context: { organizationId: string; projectSpaceId: string }, event: ClaimedEvent): string {
    const tabs: Record<string, string> = { Requirement: "requirement", Defect: "defect", TestCase: "testcase" };
    const baseUrl = new URL(this.config.get<string>("WEB_APP_URL", "http://localhost:5173"));
    baseUrl.searchParams.set("organizationId", context.organizationId);
    baseUrl.searchParams.set("projectSpaceId", context.projectSpaceId);
    baseUrl.searchParams.set("tab", tabs[event.aggregateType] ?? "overview");
    baseUrl.searchParams.set("focus", event.aggregateId);
    return baseUrl.toString();
  }

  private async describeDomainEvent(event: ClaimedEvent): Promise<{ title: string; body: string }> {
    const labels: Record<string, string> = {
      RequirementCreated: "需求已创建", RequirementUpdated: "需求已更新", RequirementStatusChanged: "需求状态已变更", RequirementDeleted: "需求已删除",
      DefectCreated: "缺陷已创建", DefectUpdated: "缺陷已更新", DefectStatusChanged: "缺陷状态已变更", DefectCommentCreated: "缺陷新增评论", DefectReplyCreated: "缺陷评论新增回复", DefectDeleted: "缺陷已删除",
      TestCaseCreated: "用例已创建", TestCaseUpdated: "用例已更新", TestCaseExecuted: "用例已执行", TestCaseDeleted: "用例已删除",
    };
    let resource: { displayNo: string; title: string } | null = null;
    if (event.aggregateType === "Requirement") {
      resource = await this.prisma.requirement.findUnique({ where: { id: event.aggregateId }, select: { displayNo: true, title: true } });
    } else if (event.aggregateType === "Defect") {
      resource = await this.prisma.defect.findUnique({ where: { id: event.aggregateId }, select: { displayNo: true, title: true } });
    } else if (event.aggregateType === "TestCase") {
      resource = await this.prisma.testCase.findUnique({ where: { id: event.aggregateId }, select: { displayNo: true, title: true } });
    }
    const action = labels[event.eventType] ?? event.eventType;
    const payload = event.payload && !Array.isArray(event.payload) && typeof event.payload === "object"
      ? event.payload as Record<string, Prisma.JsonValue>
      : {};
    const changes = payload.changes && !Array.isArray(payload.changes) && typeof payload.changes === "object"
      ? payload.changes as Record<string, Prisma.JsonValue>
      : {};
    const transition = typeof changes.from === "string" && typeof changes.to === "string"
      ? `**状态流转：** ${changes.from} → ${changes.to}`
      : typeof changes.status === "string"
        ? `**执行结论：** ${changes.status}`
        : null;
    return {
      title: `[Veritab] ${action}`,
      body: [
        resource ? `**对象：** ${resource.displayNo} ${resource.title}` : `**对象 ID：** ${event.aggregateId}`,
        `**事件：** ${action}`,
        transition,
        `**时间：** ${new Date().toISOString()}`,
      ].filter(Boolean).join("\n\n"),
    };
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
      body = { msgtype: "markdown", markdown: { title: payload.title, text: [payload.title, payload.body, payload.link ? `[查看详情](${payload.link})` : null].filter(Boolean).join("\n\n") } };
    } else if (payload.provider === WebhookProvider.FEISHU) {
      const signature = secret ? this.feishuSignature(secret) : {};
      body = {
        ...signature,
        msg_type: "interactive",
        card: {
          config: { wide_screen_mode: true, enable_forward: true },
          header: { template: this.cardTemplate(payload.title), title: { tag: "plain_text", content: payload.title } },
          elements: [
            { tag: "markdown", content: payload.body || "Veritab 研发协作事件" },
            ...(payload.link ? [{ tag: "action", actions: [{ tag: "button", type: "primary", text: { tag: "plain_text", content: "查看详情" }, url: payload.link }] }] : []),
            { tag: "note", elements: [{ tag: "plain_text", content: "由 Veritab 敏捷研发管理平台发送" }] },
          ],
        },
      };
    } else if (payload.provider === WebhookProvider.WECOM) {
      body = { msgtype: "markdown", markdown: { content: [`**${payload.title}**`, payload.body, payload.link ? `[查看详情](${payload.link})` : null].filter(Boolean).join("\n\n") } };
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
    const responseText = await response.text();
    if (responseText) {
      let result: unknown;
      try {
        result = JSON.parse(responseText);
      } catch {
        return;
      }
      if (result && typeof result === "object") {
        const record = result as Record<string, unknown>;
        const errorCode = payload.provider === WebhookProvider.FEISHU ? record.code : record.errcode;
        if (typeof errorCode === "number" && errorCode !== 0) {
          throw new Error("Notification provider rejected the request");
        }
      }
    }
  }

  private feishuSignature(secret: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = createHmac("sha256", `${timestamp}\n${secret}`).update("").digest("base64");
    return { timestamp, sign };
  }

  private cardTemplate(title: string): "blue" | "green" | "orange" | "red" {
    if (/缺陷|失败|删除/.test(title)) return "red";
    if (/完成|通过|解决|关闭/.test(title)) return "green";
    if (/状态|执行|更新/.test(title)) return "orange";
    return "blue";
  }
}
