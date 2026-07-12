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
});
