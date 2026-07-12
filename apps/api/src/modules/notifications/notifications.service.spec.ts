import { BadRequestException } from "@nestjs/common";
import { WebhookProvider } from "@prisma/client";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService endpoint policy", () => {
  const prisma = { $transaction: jest.fn() };
  const crypto = { encrypt: jest.fn() };
  const service = new NotificationsService(prisma as never, crypto as never);
  const dto = { version: 0, name: "default", enabled: true, eventTypes: ["RequirementCreated"] };

  it("rejects non-provider HTTPS endpoints before storing credentials", async () => {
    await expect(service.update("org", "space", "actor", WebhookProvider.FEISHU, {
      ...dto,
      endpoint: "https://127.0.0.1/open-apis/bot/v2/hook/internal",
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts the official Feishu robot endpoint shape", async () => {
    prisma.$transaction.mockImplementationOnce(async () => ({ provider: WebhookProvider.FEISHU }));
    await expect(service.update("org", "space", "actor", WebhookProvider.FEISHU, {
      ...dto,
      endpoint: "https://open.feishu.cn/open-apis/bot/v2/hook/example-token",
    })).resolves.toEqual({ provider: WebhookProvider.FEISHU });
  });
});
