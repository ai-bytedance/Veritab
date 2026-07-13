import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService custom roles", () => {
  it("creates an organization-owned custom role from validated permissions", async () => {
    const tx = {
      permission: { findMany: jest.fn().mockResolvedValue([{ id: "permission", code: "member.read" }]) },
      role: { create: jest.fn().mockResolvedValue({ id: "role", name: "成员管理员", permissions: [] }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
    await new OrganizationsService(prisma as never).createRole("org", "actor", { name: "成员管理员", permissionCodes: ["member.read"] });
    expect(tx.role.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org", name: "成员管理员" }) }));
  });

});
