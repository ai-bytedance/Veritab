import { BadRequestException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService registered members", () => {
  const tx = {
    user: { findFirst: jest.fn() },
    role: { findFirst: jest.fn() },
    organizationMember: { findFirst: jest.fn(), upsert: jest.fn() },
    roleBinding: { deleteMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
  const service = new OrganizationsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.user.findFirst.mockResolvedValue({ id: "member", isSystemAdmin: false });
    tx.organizationMember.findFirst.mockResolvedValue(null);
  });

  it("adds a registered account as an ordinary member without creating an administrator binding", async () => {
    await service.addRegisteredMember("org", "member", "admin");

    expect(tx.organizationMember.upsert).toHaveBeenCalled();
    expect(tx.role.findFirst).not.toHaveBeenCalled();
    expect(tx.roleBinding.deleteMany).not.toHaveBeenCalled();
    expect(tx.roleBinding.create).not.toHaveBeenCalled();
  });

  it("rejects assigning the system administrator role to an ordinary account", async () => {
    tx.role.findFirst.mockResolvedValue({ id: "admin-role" });

    await expect(service.addRegisteredMember("org", "member", "admin", "org_admin"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.organizationMember.upsert).not.toHaveBeenCalled();
  });
});
