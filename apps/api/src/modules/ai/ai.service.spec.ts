import { BadGatewayException, ServiceUnavailableException } from "@nestjs/common";
import { AiService } from "./ai.service";

describe("AiService", () => {
  const auditLog = { create: jest.fn() };
  const config = { get: jest.fn() };
  const service = new AiService(config as never, { auditLog } as never);

  beforeEach(() => {
    jest.restoreAllMocks();
    auditLog.create.mockReset();
  });

  it("fails closed when the gateway is not configured", async () => {
    config.get.mockReturnValue(undefined);
    await expect(service.invoke("org", "space", "user", "hello"))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("returns provider text and audits metadata without prompt content", async () => {
    const values: Record<string, unknown> = {
      AI_BASE_URL: "https://ai.example/v1",
      AI_API_KEY: "secret-value",
      AI_MODEL: "model-1",
      AI_TIMEOUT_MS: 5000,
    };
    config.get.mockImplementation((key: string) => values[key]);
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: " result " } }],
      usage: { total_tokens: 3 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(service.invoke("org", "space", "user", "hello")).resolves.toEqual({ text: "result" });
    expect(auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "ai.invoke",
        metadata: expect.objectContaining({ promptCharacters: 5, responseCharacters: 6 }),
      }),
    }));
    expect(JSON.stringify(auditLog.create.mock.calls)).not.toContain("hello");
  });

  it("does not expose provider error bodies", async () => {
    config.get.mockImplementation((key: string) => ({
      AI_BASE_URL: "https://ai.example/v1",
      AI_API_KEY: "secret-value",
      AI_MODEL: "model-1",
    } as Record<string, unknown>)[key]);
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("sensitive provider details", { status: 500 }));
    await expect(service.invoke("org", "space", "user", "hello"))
      .rejects.toBeInstanceOf(BadGatewayException);
  });
});
