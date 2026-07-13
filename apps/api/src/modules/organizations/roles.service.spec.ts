import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService custom roles", () => {
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

  it("binds a project-scoped role directly to an organization member", async () => {
    const tx = {
      organizationMember: { findUnique: jest.fn().mockResolvedValue({ userId: "user" }) },
      projectSpace: { findFirst: jest.fn().mockResolvedValue({ id: "space" }) },
      role: { findFirst: jest.fn().mockResolvedValue({ id: "role" }) },
      roleBinding: { deleteMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: "binding" }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
    await new OrganizationsService(prisma as never).assignProjectMemberRole("org", "user", "actor", "space", "space_admin");
    expect(tx.roleBinding.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user", projectSpaceId: "space", roleId: "role" }) });
  });
});
