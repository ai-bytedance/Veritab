import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProjectSpacesService } from "./project-spaces.service";

describe("ProjectSpacesService.update", () => {
  const tx = {
    projectSpace: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  };
  const service = new ProjectSpacesService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("updates metadata, increments the version and records an audit event", async () => {
    tx.projectSpace.findFirst.mockResolvedValue({ id: "space-1", version: 3 });
    tx.projectSpace.update.mockResolvedValue({
      id: "space-1",
      key: "VT",
      name: "Platform",
      description: null,
      version: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update("org-1", "space-1", "user-1", {
      version: 3,
      name: " Platform ",
      description: " ",
    });

    expect(result.version).toBe(4);
    expect(tx.projectSpace.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { name: "Platform", description: null, version: { increment: 1 } },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "space.update", actorId: "user-1" }),
    }));
  });

  it("rejects stale versions", async () => {
    tx.projectSpace.findFirst.mockResolvedValue({ id: "space-1", version: 5 });
    await expect(service.update("org-1", "space-1", "user-1", { version: 4, name: "Platform" }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it("does not reveal spaces outside the organization", async () => {
    tx.projectSpace.findFirst.mockResolvedValue(null);
    await expect(service.update("org-1", "space-1", "user-1", { version: 1, name: "Platform" }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
