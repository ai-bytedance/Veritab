import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService create", () => {
  it("generates the internal slug and binds the creator as organization administrator", async () => {
    const tx = {
      organization: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "org-id", ...data })) },
      organizationMember: { create: jest.fn() },
      roleBinding: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      role: { findFirst: jest.fn().mockResolvedValue({ id: "role-id" }) },
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const result = await new OrganizationsService(prisma as never).create("user-id", { name: " 研发中心 " });

    expect(result.name).toBe("研发中心");
    expect(result.slug).toMatch(/^org-[0-9a-f]{12}$/);
    expect(tx.organizationMember.create).toHaveBeenCalledWith({ data: { organizationId: "org-id", userId: "user-id" } });
    expect(tx.roleBinding.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-id", organizationId: "org-id" }) }));
  });
});
