import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService user groups", () => {
  it("only adds active organization members to a group in the same organization", async () => {
    const tx = {
      userGroup: { findFirst: jest.fn().mockResolvedValue({ id: "group" }) },
      organizationMember: { findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }) },
      groupMember: { upsert: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
    const result = await new OrganizationsService(prisma as never).addGroupMember("org", "group", "user", "actor");
    expect(result).toEqual({ groupId: "group", userId: "user" });
    expect(tx.userGroup.findFirst).toHaveBeenCalledWith({ where: { id: "group", organizationId: "org" } });
    expect(tx.groupMember.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { groupId_userId: { groupId: "group", userId: "user" } } }));
  });

  it("binds a group role to one validated project space", async () => {
    const tx = {
      userGroup: { findFirst: jest.fn().mockResolvedValue({ id: "group" }) },
      role: { findFirst: jest.fn().mockResolvedValue({ id: "role" }) },
      projectSpace: { findFirst: jest.fn().mockResolvedValue({ id: "space" }) },
      roleBinding: { deleteMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: "binding" }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
    await new OrganizationsService(prisma as never).assignGroupRole("org", "group", "actor", { scopeType: "PROJECT_SPACE", projectSpaceId: "space", roleCode: "tester" });
    expect(tx.roleBinding.create).toHaveBeenCalledWith({ data: expect.objectContaining({ groupId: "group", projectSpaceId: "space", roleId: "role", scopeType: "PROJECT_SPACE" }) });
  });

  it("creates an organization-owned custom role from validated permissions", async () => {
    const tx = {
      permission: { findMany: jest.fn().mockResolvedValue([{ id: "permission", code: "requirement.read" }]) },
      role: { create: jest.fn().mockResolvedValue({ id: "role", name: "产品成员", permissions: [] }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
    await new OrganizationsService(prisma as never).createRole("org", "actor", { name: "产品成员", permissionCodes: ["requirement.read"] });
    expect(tx.role.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org", name: "产品成员" }) }));
  });
});
