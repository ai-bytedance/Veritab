import { WebhookProvider } from "@prisma/client";
import { NotificationWorkerService } from "./notification-worker.service";

describe("NotificationWorkerService", () => {
  const prisma = {
    $queryRaw: jest.fn(),
    webhookConfig: { findFirst: jest.fn() },
    outboxEvent: { updateMany: jest.fn() },
  };
  const crypto = { decrypt: jest.fn((value: string) => value) };
  const worker = new NotificationWorkerService(prisma as never, crypto as never);
  const event = {
    id: "event-1",
    attempts: 1,
    payload: { channelId: "channel-1", provider: "FEISHU", title: "Title", body: "Body", link: null },
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([event]);
    prisma.webhookConfig.findFirst.mockResolvedValue({ id: "channel-1", enabled: true, encryptedEndpoint: "https://hooks.example", encryptedSecret: null });
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
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

  it("dead-letters the eighth failed attempt", async () => {
    prisma.$queryRaw.mockResolvedValue([{ ...event, attempts: 8, payload: { ...event.payload, provider: WebhookProvider.WECOM } }]);
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network details"));
    await worker.processOne();
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deadLetteredAt: expect.any(Date), lastError: "Notification provider is unreachable" }),
    }));
  });
});
