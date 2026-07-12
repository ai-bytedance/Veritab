import { ConflictException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService update", () => {
  const tx = {
    organization: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
  const service = new OrganizationsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("updates the editable name while preserving the stable slug", async () => {
    tx.organization.updateMany.mockResolvedValue({ count: 1 });
    tx.organization.findUniqueOrThrow.mockResolvedValue({ id: "org", slug: "default", name: "研发组织", version: 2 });
    const result = await service.update("org", "admin", { name: " 研发组织 ", version: 1 });
    expect(result).toEqual(expect.objectContaining({ name: "研发组织", slug: "default", version: 2 }));
    expect(tx.organization.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "org", version: 1 }, data: expect.objectContaining({ name: "研发组织" }) }));
  });

  it("rejects a stale organization version", async () => {
    tx.organization.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update("org", "admin", { name: "研发组织", version: 1 })).rejects.toBeInstanceOf(ConflictException);
  });
});
