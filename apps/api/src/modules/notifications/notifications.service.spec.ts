import { BadRequestException } from "@nestjs/common";
import { WebhookProvider } from "@prisma/client";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService endpoint policy", () => {
  const prisma = { $transaction: jest.fn(), webhookConfig: { findMany: jest.fn() } };
  const crypto = { encrypt: jest.fn(), decrypt: jest.fn() };
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

  it("returns a recognizable endpoint preview without exposing the robot token", async () => {
    prisma.webhookConfig.findMany.mockResolvedValue([{ id: "channel", provider: WebhookProvider.FEISHU, name: "default", enabled: true, eventTypes: [], encryptedEndpoint: "ciphertext", encryptedSecret: null, version: 1, updatedAt: new Date() }]);
    crypto.decrypt.mockReturnValue("https://open.feishu.cn/open-apis/bot/v2/hook/very-sensitive-token-123456");
    const channels = await service.list("space");
    expect(channels).toHaveLength(1);
    const channel = channels[0]!;
    expect(channel.endpointPreview).toBe("https://open.feishu.cn/open-apis/bot/v2/hook/••••••••••••123456");
    expect(JSON.stringify(channel)).not.toContain("very-sensitive-token");
  });
});
