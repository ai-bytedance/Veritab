import { MembershipStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RbacService } from "./rbac.service";

describe("RbacService", () => {
  const prisma = {
    organizationMember: { findUnique: jest.fn() },
    projectSpace: { findFirst: jest.fn() },
    roleBinding: { findMany: jest.fn() },
  };
  const service = new RbacService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organizationMember.findUnique.mockResolvedValue({ status: MembershipStatus.ACTIVE });
    prisma.projectSpace.findFirst.mockResolvedValue({ id: "space-1" });
  });

  it("allows only when every requested permission is granted", async () => {
    prisma.roleBinding.findMany.mockResolvedValue([
      {
        role: {
          permissions: [
            { permission: { code: "space.read" } },
            { permission: { code: "defect.update" } },
          ],
        },
      },
    ]);

    await expect(
      service.hasAllPermissions(
        { userId: "user-1", organizationId: "org-1", projectSpaceId: "space-1" },
        ["space.read", "defect.update"],
      ),
    ).resolves.toBe(true);
    await expect(
      service.hasAllPermissions(
        { userId: "user-1", organizationId: "org-1", projectSpaceId: "space-1" },
        ["space.read", "integration.manage"],
      ),
    ).resolves.toBe(false);
  });

  it("denies an inactive organization member before loading role bindings", async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({ status: MembershipStatus.SUSPENDED });

    await expect(
      service.hasAllPermissions({ userId: "user-1", organizationId: "org-1" }, ["space.read"]),
    ).resolves.toBe(false);
    expect(prisma.roleBinding.findMany).not.toHaveBeenCalled();
  });

  it("denies access when the project does not belong to the scoped organization", async () => {
    prisma.projectSpace.findFirst.mockResolvedValue(null);

    await expect(
      service.hasAllPermissions(
        { userId: "user-1", organizationId: "org-1", projectSpaceId: "foreign-space" },
        ["space.read"],
      ),
    ).resolves.toBe(false);
    expect(prisma.roleBinding.findMany).not.toHaveBeenCalled();
  });
});
