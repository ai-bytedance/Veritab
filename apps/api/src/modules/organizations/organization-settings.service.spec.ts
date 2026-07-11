import { ConflictException, NotFoundException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService settings", () => {
  const tx = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn() },
    $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  };
  const service = new OrganizationsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("returns clean defaults without creating rows during reads", async () => {
    prisma.organization.findUnique.mockResolvedValue({ id: "org-1" });
    prisma.organizationSettings.findUnique.mockResolvedValue(null);
    const result = await service.getSettings("org-1");
    expect(result).toEqual(expect.objectContaining({ organizationId: "org-1", version: 0, brandName: "Veritab" }));
  });

  it("creates the first version and always retains the config menu", async () => {
    tx.organization.findUnique.mockResolvedValue({ id: "org-1" });
    tx.organizationSettings.findUnique.mockResolvedValue(null);
    tx.organizationSettings.create.mockImplementation(({ data }) => Promise.resolve(data));
    const result = await service.updateSettings("org-1", "user-1", { version: 0, visibleMenus: ["overview"] });
    expect(result).toEqual(expect.objectContaining({ version: 1, visibleMenus: ["overview", "config"] }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "organization.settings.update" }),
    }));
  });

  it("rejects stale versions", async () => {
    tx.organization.findUnique.mockResolvedValue({ id: "org-1" });
    tx.organizationSettings.findUnique.mockResolvedValue({ organizationId: "org-1", version: 2 });
    await expect(service.updateSettings("org-1", "user-1", { version: 1 }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects unknown organizations", async () => {
    tx.organization.findUnique.mockResolvedValue(null);
    await expect(service.updateSettings("org-1", "user-1", { version: 0 }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
