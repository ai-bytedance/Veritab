import { ServiceUnavailableException } from "@nestjs/common";
import { WebhookCryptoService } from "./webhook-crypto.service";

describe("WebhookCryptoService", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("round-trips credentials without storing plaintext", () => {
    const service = new WebhookCryptoService({ get: () => key } as never);
    const encrypted = service.encrypt("https://hooks.example/secret");
    expect(encrypted).not.toContain("hooks.example");
    expect(service.decrypt(encrypted)).toBe("https://hooks.example/secret");
  });

  it("fails closed when encryption is not configured", () => {
    const service = new WebhookCryptoService({ get: () => undefined } as never);
    expect(() => service.encrypt("secret")).toThrow(ServiceUnavailableException);
  });

  it("rejects tampered ciphertext", () => {
    const service = new WebhookCryptoService({ get: () => key } as never);
    const encrypted = service.encrypt("secret");
    const parts = encrypted.split(":");
    const ciphertext = parts[3]!;
    parts[3] = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    expect(() => service.decrypt(parts.join(":"))).toThrow();
  });
});
