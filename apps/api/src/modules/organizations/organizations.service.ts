import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { MembershipStatus, ScopeType, SubjectType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateMemberInvitationDto } from "./dto/create-member-invitation.dto";
import { UpdateOrganizationSettingsDto } from "./dto/update-organization-settings.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultSettings = {
    brandName: "Veritab",
    brandDescription: "敏捷研发管理平台",
    visibleMenus: ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"],
    testCasePromptTemplate: "",
    requirementPromptTemplate: "",
    defectPromptTemplate: "",
    reportPromptTemplate: "",
  };

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId, status: "ACTIVE" } } },
      select: { id: true, slug: true, name: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
    });
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const adminRole = await this.prisma.role.findFirst({ where: { code: "org_admin", organizationId: null } });
    if (!adminRole) throw new InternalServerErrorException("System roles have not been seeded");
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.name.trim(), slug: `org-${randomBytes(6).toString("hex")}` },
      });
      await tx.organizationMember.create({ data: { organizationId: organization.id, userId } });
      await tx.roleBinding.create({
        data: {
          roleId: adminRole.id,
          subjectType: SubjectType.USER,
          userId,
          scopeType: ScopeType.ORGANIZATION,
          organizationId: organization.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorId: userId,
          action: "organization.create",
          resourceType: "Organization",
          resourceId: organization.id,
        },
      });
      return organization;
    });
  }

  async getSettings(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) throw new NotFoundException("Organization not found");
    const settings = await this.prisma.organizationSettings.findUnique({ where: { organizationId } });
    return settings || { organizationId, ...this.defaultSettings, version: 0, createdAt: null, updatedAt: null };
  }

  async updateSettings(organizationId: string, actorId: string, dto: UpdateOrganizationSettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!organization) throw new NotFoundException("Organization not found");
      const current = await tx.organizationSettings.findUnique({ where: { organizationId } });
      const currentVersion = current?.version ?? 0;
      if (currentVersion !== dto.version) throw new ConflictException("Organization settings were modified by another user");
      const data = {
        ...(dto.brandName !== undefined ? { brandName: dto.brandName.trim() } : {}),
        ...(dto.brandDescription !== undefined ? { brandDescription: dto.brandDescription.trim() } : {}),
        ...(dto.visibleMenus !== undefined ? { visibleMenus: Array.from(new Set([...dto.visibleMenus, "config"])) } : {}),
        ...(dto.testCasePromptTemplate !== undefined ? { testCasePromptTemplate: dto.testCasePromptTemplate } : {}),
        ...(dto.requirementPromptTemplate !== undefined ? { requirementPromptTemplate: dto.requirementPromptTemplate } : {}),
        ...(dto.defectPromptTemplate !== undefined ? { defectPromptTemplate: dto.defectPromptTemplate } : {}),
        ...(dto.reportPromptTemplate !== undefined ? { reportPromptTemplate: dto.reportPromptTemplate } : {}),
      };
      const updated = current
        ? await tx.organizationSettings.update({ where: { organizationId }, data: { ...data, version: { increment: 1 } } })
        : await tx.organizationSettings.create({ data: { organizationId, ...this.defaultSettings, ...data, version: 1 } });
      await tx.auditLog.create({
        data: {
          organizationId,
          actorId,
          action: "organization.settings.update",
          resourceType: "OrganizationSettings",
          resourceId: organizationId,
          metadata: { previousVersion: currentVersion, version: updated.version, fields: Object.keys(data) },
        },
      });
      return updated;
    });
  }

  listMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      select: {
        status: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            status: true,
            lastLoginAt: true,
            roleBindings: {
              where: { organizationId, scopeType: ScopeType.ORGANIZATION, projectSpaceId: null },
              select: { role: { select: { code: true, name: true } } },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
    });
  }

  async updateMemberStatus(organizationId: string, userId: string, actorId: string, status: MembershipStatus) {
    if (userId === actorId && status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException("You cannot suspend your own organization membership");
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
      });
      if (!existing) throw new NotFoundException("Organization member not found");
      const member = await tx.organizationMember.update({
        where: { organizationId_userId: { organizationId, userId } },
        data: { status },
      });
      await tx.auditLog.create({
        data: { organizationId, actorId, action: "member.status.update", resourceType: "User", resourceId: userId, metadata: { status } },
      });
      return member;
    });
  }

  async assignMemberRole(organizationId: string, userId: string, actorId: string, roleCode: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
      });
      if (!member) throw new NotFoundException("Organization member not found");
      const role = await tx.role.findFirst({
        where: { code: roleCode, OR: [{ organizationId: null }, { organizationId }] },
      });
      if (!role) throw new NotFoundException("Role not found");
      if (userId === actorId && roleCode !== "org_admin") {
        throw new BadRequestException("You cannot remove your own organization administrator role");
      }
      await tx.roleBinding.deleteMany({
        where: { organizationId, userId, scopeType: ScopeType.ORGANIZATION, projectSpaceId: null },
      });
      const binding = await tx.roleBinding.create({
        data: { roleId: role.id, subjectType: SubjectType.USER, userId, scopeType: ScopeType.ORGANIZATION, organizationId },
      });
      await tx.auditLog.create({
        data: { organizationId, actorId, action: "member.role.assign", resourceType: "RoleBinding", resourceId: binding.id, metadata: { userId, roleCode } },
      });
      return { userId, roleCode };
    });
  }

  listInvitations(organizationId: string) {
    return this.prisma.organizationInvitation.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
        role: { select: { code: true, name: true } },
        invitedBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async createInvitation(organizationId: string, actorId: string, dto: CreateMemberInvitationDto) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    return this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: dto.email } });
      if (existingUser) {
        const existingMember = await tx.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId, userId: existingUser.id } },
        });
        throw new ConflictException(existingMember ? "User is already an organization member" : "An account with this email already exists");
      }
      const role = await tx.role.findFirst({
        where: { code: dto.roleCode, OR: [{ organizationId: null }, { organizationId }] },
      });
      if (!role) throw new NotFoundException("Role not found");
      await tx.organizationInvitation.updateMany({
        where: { organizationId, email: dto.email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const invitation = await tx.organizationInvitation.create({
        data: {
          organizationId,
          email: dto.email,
          roleId: role.id,
          tokenHash,
          invitedById: actorId,
          expiresAt: new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000),
        },
        select: { id: true, email: true, expiresAt: true, createdAt: true, role: { select: { code: true, name: true } } },
      });
      await tx.auditLog.create({
        data: { organizationId, actorId, action: "member.invitation.create", resourceType: "OrganizationInvitation", resourceId: invitation.id, metadata: { email: dto.email, roleCode: dto.roleCode } },
      });
      return { ...invitation, activationToken: rawToken };
    });
  }

  async revokeInvitation(organizationId: string, invitationId: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findFirst({ where: { id: invitationId, organizationId } });
      if (!invitation) throw new NotFoundException("Invitation not found");
      if (invitation.acceptedAt) throw new ConflictException("Accepted invitation cannot be revoked");
      if (!invitation.revokedAt) {
        await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({
          data: { organizationId, actorId, action: "member.invitation.revoke", resourceType: "OrganizationInvitation", resourceId: invitation.id },
        });
      }
    });
  }
}
