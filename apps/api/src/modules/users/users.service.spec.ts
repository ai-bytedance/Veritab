import { ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";

describe("UsersService registry", () => {
  it("rejects registry access from a non-system administrator", async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ isSystemAdmin: false, status: "ACTIVE" }) } };
    await expect(new UsersService(prisma as never).list("member", { page: 1, limit: 20 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns registered users with organization and group relationships", async () => {
    const prisma = { user: {
      findUnique: jest.fn().mockResolvedValue({ isSystemAdmin: true, status: "ACTIVE" }),
      findMany: jest.fn().mockResolvedValue([{ id: "user" }]), count: jest.fn().mockResolvedValue(1),
    } };
    const result = await new UsersService(prisma as never).list("admin", { page: 1, limit: 20 });
    expect(result).toEqual({ items: [{ id: "user" }], pageInfo: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });
});
