import { WebhookProvider } from "@prisma/client";
import { NotificationWorkerService } from "./notification-worker.service";

describe("NotificationWorkerService", () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    webhookConfig: { findFirst: jest.fn() },
    outboxEvent: { updateMany: jest.fn() },
    requirement: { findUnique: jest.fn() },
    defect: { findUnique: jest.fn() },
    testCase: { findUnique: jest.fn() },
  };
  const crypto = { decrypt: jest.fn((value: string) => value) };
  const worker = new NotificationWorkerService(prisma as never, crypto as never);
  const event = {
    id: "event-1",
    attempts: 1,
    aggregateType: "NotificationRequest",
    aggregateId: "request-1",
    eventType: "NotificationRequested",
    payload: { channelId: "channel-1", provider: "FEISHU", title: "Title", body: "Body", link: null },
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([event]);
    prisma.webhookConfig.findFirst.mockResolvedValue({ id: "channel-1", enabled: true, encryptedEndpoint: "https://hooks.example", encryptedSecret: null });
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  it("marks a successfully delivered event as processed", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    await expect(worker.processOne()).resolves.toBe(true);
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ processedAt: expect.any(Date), lastError: null }),
    }));
  });

  it("schedules a retry without exposing provider response bodies", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("sensitive", { status: 500 }));
    await expect(worker.processOne()).resolves.toBe(true);
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastError: "Notification provider returned HTTP 500", nextAttemptAt: expect.any(Date) }),
    }));
  });

  it("retries provider-level failures returned with HTTP 200", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: 19021, msg: "sensitive provider detail" }), { status: 200 }));
    await expect(worker.processOne()).resolves.toBe(true);
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastError: "Notification provider rejected the request", nextAttemptAt: expect.any(Date) }),
    }));
  });

  it("dead-letters the eighth failed attempt", async () => {
    prisma.$queryRaw.mockResolvedValue([{ ...event, attempts: 8, payload: { ...event.payload, provider: WebhookProvider.WECOM } }]);
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network details"));
    await worker.processOne();
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deadLetteredAt: expect.any(Date), lastError: "Notification provider is unreachable" }),
    }));
  });

  it("fans a domain event out to each subscribed channel atomically", async () => {
    const domainEvent = {
      ...event,
      aggregateType: "Requirement",
      aggregateId: "requirement-1",
      eventType: "RequirementCreated",
      payload: { organizationId: "organization-1", projectSpaceId: "space-1", requirementId: "requirement-1" },
    };
    prisma.$queryRaw.mockResolvedValue([domainEvent]);
    prisma.requirement.findUnique.mockResolvedValue({ displayNo: "VT-REQ-000001", title: "登录能力" });
    const transaction = {
      webhookConfig: { findMany: jest.fn().mockResolvedValue([
        { id: "feishu-channel", provider: WebhookProvider.FEISHU },
        { id: "wecom-channel", provider: WebhookProvider.WECOM },
      ]) },
      outboxEvent: { create: jest.fn(), updateMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await expect(worker.processOne()).resolves.toBe(true);

    expect(transaction.outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: "NotificationRequested",
        payload: expect.objectContaining({ title: "[Veritab] 需求已创建", body: "VT-REQ-000001 登录能力" }),
      }),
    }));
    expect(transaction.outboxEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ processedAt: expect.any(Date) }),
    }));
  });
});
