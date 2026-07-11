import { FileObjectStatus } from "@prisma/client";
import { FileCleanupService } from "./file-cleanup.service";

describe("FileCleanupService", () => {
  const prisma = { fileObject: { findMany: jest.fn(), updateMany: jest.fn() } };
  const storage = { remove: jest.fn() };
  const cleanup = new FileCleanupService(prisma as never, storage as never, { get: () => 24 } as never);

  beforeEach(() => jest.clearAllMocks());

  it("deletes stale pending objects and marks reservations deleted", async () => {
    prisma.fileObject.findMany.mockResolvedValue([{ id: "file-1", objectKey: "key-1" }]);
    storage.remove.mockResolvedValue(undefined);
    prisma.fileObject.updateMany.mockResolvedValue({ count: 1 });
    await expect(cleanup.cleanupBatch()).resolves.toBe(1);
    expect(prisma.fileObject.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "file-1", status: FileObjectStatus.PENDING } }));
  });

  it("keeps the reservation pending when object deletion fails", async () => {
    prisma.fileObject.findMany.mockResolvedValue([{ id: "file-1", objectKey: "key-1" }]);
    storage.remove.mockRejectedValue(new Error("storage unavailable"));
    await expect(cleanup.cleanupBatch()).resolves.toBe(0);
    expect(prisma.fileObject.updateMany).not.toHaveBeenCalled();
  });
});
