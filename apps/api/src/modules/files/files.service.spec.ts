import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { FileObjectStatus } from "@prisma/client";
import { FilesService } from "./files.service";

describe("FilesService", () => {
  const prisma = {
    fileObject: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    requirement: { findFirst: jest.fn() },
    defect: { findFirst: jest.fn() },
    testCase: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const storage = { createUploadUrl: jest.fn(), head: jest.fn(), createDownloadUrl: jest.fn(), remove: jest.fn() };
  const service = new FilesService(prisma as never, storage as never, { get: () => 1024 } as never);
  const pending = { id: "file-1", organizationId: "org", projectSpaceId: "space", uploaderId: "user", objectKey: "key", originalName: "a.pdf", contentType: "application/pdf", expectedSize: 100n, actualSize: null, checksumSha256: null, status: FileObjectStatus.PENDING, resourceType: null, resourceId: null, createdAt: new Date(), finalizedAt: null };

  beforeEach(() => jest.clearAllMocks());

  it("rejects disallowed types and oversized files before database writes", async () => {
    await expect(service.createUpload("org", "space", "user", { fileName: "x.exe", contentType: "application/octet-stream", size: 10 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createUpload("org", "space", "user", { fileName: "x.pdf", contentType: "application/pdf", size: 1025 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.fileObject.create).not.toHaveBeenCalled();
  });

  it("requires object metadata to match the reservation", async () => {
    prisma.fileObject.findFirst.mockResolvedValue(pending);
    storage.head.mockResolvedValue({ ContentLength: 99, ContentType: "application/pdf" });
    await expect(service.complete("space", "user", "file-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("finalizes a matching upload", async () => {
    prisma.fileObject.findFirst.mockResolvedValue(pending);
    storage.head.mockResolvedValue({ ContentLength: 100, ContentType: "application/pdf" });
    prisma.fileObject.update.mockResolvedValue({ ...pending, status: FileObjectStatus.READY, actualSize: 100n, finalizedAt: new Date() });
    await expect(service.complete("space", "user", "file-1")).resolves.toEqual(expect.objectContaining({ status: FileObjectStatus.READY, actualSize: 100 }));
  });

  it("will not attach an upload to a resource outside the project", async () => {
    prisma.fileObject.findFirst.mockResolvedValue({ ...pending, status: FileObjectStatus.READY });
    prisma.requirement.findFirst.mockResolvedValue(null);
    await expect(service.attach("space", "user", "file-1", { resourceType: "REQUIREMENT", resourceId: "00000000-0000-0000-0000-000000000000" })).rejects.toBeInstanceOf(NotFoundException);
  });
});
