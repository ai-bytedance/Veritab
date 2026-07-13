import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { MembershipStatus, ScopeType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateMemberInvitationDto } from "./dto/create-member-invitation.dto";
import { UpdateOrganizationSettingsDto } from "./dto/update-organization-settings.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

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

  async listForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isSystemAdmin: true } });
    return this.prisma.organization.findMany({
      where: user?.isSystemAdmin ? {} : { members: { some: { userId, status: "ACTIVE" } } },
      select: { id: true, slug: true, name: true, version: true, createdAt: true, updatedAt: true, _count: { select: { members: true, projectSpaces: true } } },
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

  async update(organizationId: string, actorId: string, dto: UpdateOrganizationDto) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.organization.updateMany({ where: { id: organizationId, version: dto.version }, data: { name: dto.name.trim(), version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException("Organization was modified by another administrator");
      const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, slug: true, name: true, version: true, createdAt: true, updatedAt: true } });
      await tx.auditLog.create({ data: { organizationId, actorId, action: "organization.update", resourceType: "Organization", resourceId: organizationId, metadata: { version: organization.version } } });
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
              where: { organizationId },
              select: { scopeType: true, projectSpaceId: true, role: { select: { code: true, name: true } }, projectSpace: { select: { id: true, name: true, key: true } } },
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

  async addRegisteredMember(organizationId: string, userId: string, roleCode: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [user, role] = await Promise.all([
        tx.user.findFirst({ where: { id: userId, status: "ACTIVE" }, select: { id: true } }),
        tx.role.findFirst({ where: { code: roleCode, OR: [{ organizationId: null }, { organizationId }] }, select: { id: true } }),
      ]);
      if (!user || !role) throw new NotFoundException("Active user or role not found");
      await tx.organizationMember.upsert({ where: { organizationId_userId: { organizationId, userId } }, create: { organizationId, userId }, update: { status: "ACTIVE" } });
      await tx.roleBinding.deleteMany({ where: { organizationId, userId, scopeType: ScopeType.ORGANIZATION, projectSpaceId: null } });
      await tx.roleBinding.create({ data: { roleId: role.id, userId, scopeType: ScopeType.ORGANIZATION, organizationId } });
      await tx.auditLog.create({ data: { organizationId, actorId, action: "member.add", resourceType: "User", resourceId: userId, metadata: { roleCode } } });
      return { organizationId, userId, roleCode };
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
        data: { roleId: role.id, userId, scopeType: ScopeType.ORGANIZATION, organizationId },
      });
      await tx.auditLog.create({
        data: { organizationId, actorId, action: "member.role.assign", resourceType: "RoleBinding", resourceId: binding.id, metadata: { userId, roleCode } },
      });
      return { userId, roleCode };
    });
  }

  async assignProjectMemberRole(organizationId: string, userId: string, actorId: string, projectSpaceId: string, roleCode?: string) {
    return this.prisma.$transaction(async (tx) => {
      const [member, space, role] = await Promise.all([
        tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } }, select: { userId: true } }),
        tx.projectSpace.findFirst({ where: { id: projectSpaceId, organizationId, archivedAt: null }, select: { id: true } }),
        roleCode ? tx.role.findFirst({ where: { code: roleCode, OR: [{ organizationId: null }, { organizationId }] }, select: { id: true } }) : Promise.resolve(null),
      ]);
      if (!member || !space || (roleCode && !role)) throw new NotFoundException("成员、项目空间或角色不存在");
      if (roleCode === "org_admin") throw new BadRequestException("组织管理员只能绑定在组织范围");
      await tx.roleBinding.deleteMany({ where: { organizationId, userId, scopeType: ScopeType.PROJECT_SPACE, projectSpaceId } });
      const binding = role ? await tx.roleBinding.create({ data: { roleId: role.id, userId, scopeType: ScopeType.PROJECT_SPACE, organizationId, projectSpaceId } }) : null;
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: role ? "member.project-role.assign" : "member.project-role.remove", resourceType: "User", resourceId: userId, metadata: { roleCode: roleCode ?? null } } });
      return binding;
    });
  }

  listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      select: { id: true, code: true, name: true, description: true, isSystem: true, version: true, permissions: { select: { permission: { select: { code: true, description: true } } } } },
      orderBy: [{ isSystem: "desc" }, { code: "asc" }],
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ select: { code: true, description: true }, orderBy: { code: "asc" } });
  }

  async createRole(organizationId: string, actorId: string, dto: CreateRoleDto) {
    return this.prisma.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({ where: { code: { in: dto.permissionCodes } }, select: { id: true, code: true } });
      if (permissions.length !== dto.permissionCodes.length) throw new BadRequestException("包含不存在的权限项");
      const role = await tx.role.create({ data: { organizationId, code: `custom_${randomBytes(8).toString("hex")}`, name: dto.name.trim(), description: dto.description?.trim() || null, permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } }, include: { permissions: { include: { permission: true } } } });
      await tx.auditLog.create({ data: { organizationId, actorId, action: "role.create", resourceType: "Role", resourceId: role.id, metadata: { name: role.name, permissionCodes: dto.permissionCodes } } });
      return role;
    });
  }

  async updateRole(organizationId: string, roleId: string, actorId: string, dto: UpdateRoleDto) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, organizationId }, select: { id: true, isSystem: true, version: true } });
      if (!role) throw new NotFoundException("自定义角色不存在");
      if (role.isSystem) throw new BadRequestException("系统管理角色不可修改");
      if (role.version !== dto.version) throw new ConflictException("角色已被其他管理员修改，请刷新后重试");
      const permissions = await tx.permission.findMany({ where: { code: { in: dto.permissionCodes } }, select: { id: true } });
      if (permissions.length !== dto.permissionCodes.length) throw new BadRequestException("包含不存在的权限项");
      await tx.rolePermission.deleteMany({ where: { roleId } });
      const updated = await tx.role.update({ where: { id: roleId }, data: { name: dto.name.trim(), description: dto.description?.trim() || null, version: { increment: 1 }, permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } }, include: { permissions: { include: { permission: true } } } });
      await tx.auditLog.create({ data: { organizationId, actorId, action: "role.update", resourceType: "Role", resourceId: roleId, metadata: { permissionCodes: dto.permissionCodes, version: updated.version } } });
      return updated;
    });
  }

  async deleteRole(organizationId: string, roleId: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, organizationId }, include: { _count: { select: { bindings: true, invitations: true } } } });
      if (!role) throw new NotFoundException("自定义角色不存在");
      if (role.isSystem) throw new BadRequestException("系统管理角色不可删除");
      if (role._count.bindings || role._count.invitations) throw new ConflictException("角色正在被成员、群组或邀请使用，无法删除");
      await tx.role.delete({ where: { id: roleId } });
      await tx.auditLog.create({ data: { organizationId, actorId, action: "role.delete", resourceType: "Role", resourceId: roleId } });
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
