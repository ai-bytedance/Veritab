import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WebhookCryptoService {
  constructor(private readonly config: ConfigService) {}

  private key(): Buffer {
    const encoded = this.config.get<string>("WEBHOOK_ENCRYPTION_KEY");
    const key = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);
    if (key.length !== 32) throw new ServiceUnavailableException("Webhook encryption is not configured");
    return key;
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(":");
  }

  decrypt(value: string): string {
    const [version, iv, tag, ciphertext] = value.split(":");
    if (version !== "v1" || !iv || !tag || !ciphertext) throw new ServiceUnavailableException("Webhook credential is invalid");
    const decipher = createDecipheriv("aes-256-gcm", this.key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
  }
}
