import { Injectable, Logger } from "@nestjs/common";
import { FileObjectStatus } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ObjectStorageService } from "./object-storage.service";

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);
  private readonly retentionHours: number;

  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService, config: ConfigService) {
    this.retentionHours = config.get<number>("FILE_PENDING_RETENTION_HOURS") ?? 24;
  }

  async cleanupBatch(): Promise<number> {
    const cutoff = new Date(Date.now() - this.retentionHours * 60 * 60 * 1000);
    const files = await this.prisma.fileObject.findMany({ where: { status: FileObjectStatus.PENDING, createdAt: { lt: cutoff } }, select: { id: true, objectKey: true }, orderBy: { createdAt: "asc" }, take: 100 });
    let cleaned = 0;
    for (const file of files) {
      try {
        await this.storage.remove(file.objectKey);
        const result = await this.prisma.fileObject.updateMany({ where: { id: file.id, status: FileObjectStatus.PENDING }, data: { status: FileObjectStatus.DELETED, deletedAt: new Date() } });
        cleaned += result.count;
      } catch (reason) {
        this.logger.warn(`Pending file cleanup failed for ${file.id}: ${reason instanceof Error ? reason.message : "unknown error"}`);
      }
    }
    return cleaned;
  }
}
