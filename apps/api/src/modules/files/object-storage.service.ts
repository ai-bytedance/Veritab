import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class ObjectStorageService {
  private readonly client: S3Client;
  readonly bucket: string;
  readonly uploadTtl: number;
  readonly downloadTtl: number;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>("S3_BUCKET") || "";
    this.uploadTtl = config.get<number>("S3_UPLOAD_URL_TTL") ?? 600;
    this.downloadTtl = config.get<number>("S3_DOWNLOAD_URL_TTL") ?? 300;
    const endpoint = config.get<string>("S3_ENDPOINT");
    if (endpoint && config.get<string>("NODE_ENV") === "production" && !endpoint.startsWith("https://")) {
      throw new ServiceUnavailableException("Object storage endpoint requires HTTPS in production");
    }
    this.client = new S3Client({
      region: config.get<string>("S3_REGION") || "us-east-1",
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: config.get<boolean>("S3_FORCE_PATH_STYLE") ?? false,
      ...(config.get<string>("S3_ACCESS_KEY_ID") && config.get<string>("S3_SECRET_ACCESS_KEY") ? {
        credentials: { accessKeyId: config.get<string>("S3_ACCESS_KEY_ID")!, secretAccessKey: config.get<string>("S3_SECRET_ACCESS_KEY")! },
      } : {}),
    });
  }

  private ensureConfigured() {
    if (!this.bucket) throw new ServiceUnavailableException("Object storage is not configured");
  }

  async createUploadUrl(key: string, contentType: string, fileId: string, checksum?: string) {
    this.ensureConfigured();
    const metadata = { "file-id": fileId, ...(checksum ? { "sha256": checksum } : {}) };
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, Metadata: metadata });
    return { url: await getSignedUrl(this.client, command, { expiresIn: this.uploadTtl }), headers: { "Content-Type": contentType, ...Object.fromEntries(Object.entries(metadata).map(([name, value]) => [`x-amz-meta-${name}`, value])) }, expiresIn: this.uploadTtl };
  }

  async head(key: string) {
    this.ensureConfigured();
    return this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async createDownloadUrl(key: string, fileName: string) {
    this.ensureConfigured();
    const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    return { url: await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: disposition }), { expiresIn: this.downloadTtl }), expiresIn: this.downloadTtl };
  }

  async remove(key: string) {
    this.ensureConfigured();
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
