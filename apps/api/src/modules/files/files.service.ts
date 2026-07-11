import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FileObjectStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AttachFileDto } from "./dto/attach-file.dto";
import { CreateUploadDto } from "./dto/create-upload.dto";
import { ObjectStorageService } from "./object-storage.service";

const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv", "application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);

@Injectable()
export class FilesService {
  private readonly maxSize: number;
  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService, config: ConfigService) {
    this.maxSize = config.get<number>("FILE_MAX_SIZE_BYTES") ?? 10 * 1024 * 1024;
  }

  private view(file: { id: string; originalName: string; contentType: string; expectedSize: bigint; actualSize: bigint | null; status: FileObjectStatus; resourceType: string | null; resourceId: string | null; createdAt: Date; finalizedAt: Date | null }) {
    return { ...file, expectedSize: Number(file.expectedSize), actualSize: file.actualSize === null ? null : Number(file.actualSize) };
  }

  async createUpload(organizationId: string, projectSpaceId: string, uploaderId: string, dto: CreateUploadDto) {
    if (!allowedTypes.has(dto.contentType)) throw new BadRequestException("File type is not allowed");
    if (dto.size > this.maxSize) throw new BadRequestException(`File exceeds the ${this.maxSize}-byte limit`);
    const id = randomUUID();
    const now = new Date();
    const objectKey = `${organizationId}/${projectSpaceId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}`;
    const file = await this.prisma.fileObject.create({ data: { id, organizationId, projectSpaceId, uploaderId, objectKey, originalName: dto.fileName, contentType: dto.contentType, expectedSize: BigInt(dto.size), checksumSha256: dto.checksumSha256 } });
    try {
      const upload = await this.storage.createUploadUrl(objectKey, dto.contentType, id, dto.checksumSha256);
      return { file: this.view(file), upload };
    } catch (reason) {
      await this.prisma.fileObject.delete({ where: { id } });
      throw reason;
    }
  }

  async complete(projectSpaceId: string, uploaderId: string, id: string) {
    const file = await this.prisma.fileObject.findFirst({ where: { id, projectSpaceId, uploaderId, status: FileObjectStatus.PENDING } });
    if (!file) throw new NotFoundException("Pending upload not found");
    const object = await this.storage.head(file.objectKey);
    if (object.ContentLength === undefined || BigInt(object.ContentLength) !== file.expectedSize) throw new ConflictException("Uploaded file size does not match the reservation");
    if (object.ContentType !== file.contentType) throw new ConflictException("Uploaded file content type does not match the reservation");
    if (file.checksumSha256 && object.Metadata?.sha256 !== file.checksumSha256) throw new ConflictException("Uploaded file checksum metadata does not match the reservation");
    const updated = await this.prisma.fileObject.update({ where: { id }, data: { status: FileObjectStatus.READY, actualSize: BigInt(object.ContentLength), finalizedAt: new Date() } });
    return this.view(updated);
  }

  async attach(projectSpaceId: string, uploaderId: string, id: string, dto: AttachFileDto) {
    const file = await this.prisma.fileObject.findFirst({ where: { id, projectSpaceId, uploaderId, status: FileObjectStatus.READY, resourceId: null } });
    if (!file) throw new NotFoundException("Ready unattached file not found");
    const exists = dto.resourceType === "REQUIREMENT"
      ? await this.prisma.requirement.findFirst({ where: { id: dto.resourceId, projectSpaceId, deletedAt: null }, select: { id: true } })
      : dto.resourceType === "DEFECT"
        ? await this.prisma.defect.findFirst({ where: { id: dto.resourceId, projectSpaceId, deletedAt: null }, select: { id: true } })
        : await this.prisma.testCase.findFirst({ where: { id: dto.resourceId, projectSpaceId, deletedAt: null }, select: { id: true } });
    if (!exists) throw new NotFoundException("Attachment target not found");
    return this.view(await this.prisma.fileObject.update({ where: { id }, data: { resourceType: dto.resourceType, resourceId: dto.resourceId } }));
  }

  async list(projectSpaceId: string, resourceType: string, resourceId: string) {
    const files = await this.prisma.fileObject.findMany({ where: { projectSpaceId, resourceType, resourceId, status: FileObjectStatus.READY }, orderBy: { createdAt: "desc" } });
    return files.map((file) => this.view(file));
  }

  async download(projectSpaceId: string, id: string) {
    const file = await this.prisma.fileObject.findFirst({ where: { id, projectSpaceId, status: FileObjectStatus.READY } });
    if (!file) throw new NotFoundException("File not found");
    return this.storage.createDownloadUrl(file.objectKey, file.originalName);
  }

  async remove(organizationId: string, projectSpaceId: string, actorId: string, id: string) {
    const file = await this.prisma.fileObject.findFirst({ where: { id, projectSpaceId, status: { not: FileObjectStatus.DELETED } } });
    if (!file) throw new NotFoundException("File not found");
    if (file.uploaderId !== actorId) throw new BadRequestException("Only the uploader can delete this file");
    await this.storage.remove(file.objectKey);
    await this.prisma.$transaction([
      this.prisma.fileObject.update({ where: { id }, data: { status: FileObjectStatus.DELETED, deletedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "file.delete", resourceType: "FileObject", resourceId: id } }),
    ] as Prisma.PrismaPromise<unknown>[]);
  }
}
