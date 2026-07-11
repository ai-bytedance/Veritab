import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async invoke(organizationId: string, projectSpaceId: string, actorId: string, prompt: string) {
    const baseUrl = this.config.get<string>("AI_BASE_URL")?.replace(/\/$/, "");
    const apiKey = this.config.get<string>("AI_API_KEY");
    const model = this.config.get<string>("AI_MODEL");
    const timeoutMs = this.config.get<number>("AI_TIMEOUT_MS") ?? 30_000;
    if (!baseUrl || !apiKey || !model) throw new ServiceUnavailableException("AI gateway is not configured");
    if (this.config.get<string>("NODE_ENV") === "production" && !baseUrl.startsWith("https://")) {
      throw new ServiceUnavailableException("AI gateway requires HTTPS in production");
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BadGatewayException("AI provider is unavailable");
    }
    if (!response.ok) throw new BadGatewayException(`AI provider rejected the request (${response.status})`);

    const result = await response.json() as ChatCompletionResponse;
    const text = result.choices?.[0]?.message?.content?.trim();
    if (!text) throw new BadGatewayException("AI provider returned an empty response");

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        projectSpaceId,
        actorId,
        action: "ai.invoke",
        resourceType: "AiGateway",
        metadata: {
          model,
          promptCharacters: prompt.length,
          responseCharacters: text.length,
          usage: result.usage || null,
        },
      },
    });
    return { text };
  }
}
