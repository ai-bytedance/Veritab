import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { ScopeType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateProjectSpaceDto } from "./dto/create-project-space.dto";
import { UpdateProjectSpaceDto } from "./dto/update-project-space.dto";
import { CreateRoleDto } from "../organizations/dto/create-role.dto";
import { UpdateRoleDto } from "../organizations/dto/update-role.dto";

@Injectable()
export class ProjectSpacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, userId: string) {
    return this.prisma.projectSpace.findMany({
      where: { organizationId, archivedAt: null, members: { some: { userId, status: "ACTIVE" } } },
      select: { id: true, key: true, name: true, description: true, status: true, version: true, createdAt: true, updatedAt: true, organization: { select: { id: true, name: true } }, auditLogs: { where: { action: "space.create" }, take: 1, orderBy: { createdAt: "asc" }, select: { actor: { select: { id: true, displayName: true, username: true } } } }, _count: { select: { members: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(organizationId: string, projectSpaceId: string) {
    const space = await this.prisma.projectSpace.findFirst({
      where: { id: projectSpaceId, organizationId, archivedAt: null },
      select: { id: true, key: true, name: true, description: true, status: true, version: true, createdAt: true, updatedAt: true },
    });
    if (!space) throw new NotFoundException("Project space not found");
    return space;
  }

  async create(organizationId: string, actorId: string, dto: CreateProjectSpaceDto) {
    const key = `P${randomBytes(5).toString("hex").toUpperCase()}`;
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.create({ data: { organizationId, key, ...dto } });
      await tx.projectMember.create({ data: { projectSpaceId: space.id, userId: actorId } });
      const adminRole = await tx.role.findFirst({ where: { code: "space_admin", organizationId: null }, select: { id: true } });
      if (!adminRole) throw new NotFoundException("项目空间管理员角色不存在");
      await tx.roleBinding.create({ data: { roleId: adminRole.id, userId: actorId, scopeType: ScopeType.PROJECT_SPACE, organizationId, projectSpaceId: space.id } });
      await tx.auditLog.create({
        data: {
          organizationId,
          projectSpaceId: space.id,
          actorId,
          action: "space.create",
          resourceType: "ProjectSpace",
          resourceId: space.id,
        },
      });
      return space;
    });
  }

  async update(organizationId: string, projectSpaceId: string, actorId: string, dto: UpdateProjectSpaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.projectSpace.findFirst({
        where: { id: projectSpaceId, organizationId, archivedAt: null },
        select: { id: true, version: true },
      });
      if (!current) throw new NotFoundException("Project space not found");
      if (current.version !== dto.version) throw new ConflictException("Project space was modified by another user");

      const updated = await tx.projectSpace.update({
        where: { id: projectSpaceId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          version: { increment: 1 },
        },
        select: { id: true, key: true, name: true, description: true, version: true, createdAt: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          projectSpaceId,
          actorId,
          action: "space.update",
          resourceType: "ProjectSpace",
          resourceId: projectSpaceId,
          metadata: { previousVersion: current.version, version: updated.version },
        },
      });
      return updated;
    });
  }

  async delete(organizationId: string, projectSpaceId: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.findFirst({ where: { id: projectSpaceId, organizationId, archivedAt: null }, select: { id: true } });
      if (!space) throw new NotFoundException("项目空间不存在");
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "space.delete", resourceType: "ProjectSpace", resourceId: projectSpaceId } });
      await tx.projectSpace.update({ where: { id: projectSpaceId }, data: { archivedAt: new Date(), status: "DISABLED", version: { increment: 1 } } });
    });
  }

  listMembers(organizationId: string, projectSpaceId: string) {
    return this.prisma.projectMember.findMany({ where: { projectSpaceId, projectSpace: { organizationId, archivedAt: null } }, select: { status: true, joinedAt: true, user: { select: { id: true, username: true, displayName: true, email: true, roleBindings: { where: { organizationId, projectSpaceId, scopeType: ScopeType.PROJECT_SPACE }, select: { role: { select: { id: true, code: true, name: true, scope: true, projectSpaceId: true } } } } } } }, orderBy: { joinedAt: "asc" } });
  }

  async addMember(organizationId: string, projectSpaceId: string, userId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } }, select: { status: true } });
      const space = await tx.projectSpace.findFirst({ where: { id: projectSpaceId, organizationId, archivedAt: null }, select: { id: true } });
      if (!member || member.status !== "ACTIVE" || !space) throw new NotFoundException("有效组织成员或项目空间不存在");
      const projectMember = await tx.projectMember.upsert({ where: { projectSpaceId_userId: { projectSpaceId, userId } }, create: { projectSpaceId, userId }, update: { status: "ACTIVE" } });
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "space.member.add", resourceType: "User", resourceId: userId } });
      return projectMember;
    });
  }

  async setMemberRoles(organizationId: string, projectSpaceId: string, userId: string, actorId: string, roleIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.findUnique({ where: { projectSpaceId_userId: { projectSpaceId, userId } }, select: { status: true } });
      if (!member) throw new NotFoundException("项目成员不存在");
      const roles = await tx.role.findMany({ where: { id: { in: roleIds }, OR: [{ organizationId, scope: "ORGANIZATION", projectSpaceId: null }, { organizationId, scope: "PROJECT_SPACE", projectSpaceId }, { organizationId: null, scope: "PROJECT_SPACE", code: "space_admin" }] }, select: { id: true } });
      if (roles.length !== roleIds.length) throw new BadRequestException("包含不可用于当前项目空间的角色");
      await tx.roleBinding.deleteMany({ where: { organizationId, projectSpaceId, userId, scopeType: ScopeType.PROJECT_SPACE } });
      if (roles.length) await tx.roleBinding.createMany({ data: roles.map((role) => ({ roleId: role.id, userId, scopeType: ScopeType.PROJECT_SPACE, organizationId, projectSpaceId })) });
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "space.member.roles.set", resourceType: "User", resourceId: userId, metadata: { roleIds } } });
      return { userId, roleIds };
    });
  }

  async removeMember(organizationId: string, projectSpaceId: string, userId: string, actorId: string): Promise<void> {
    if (userId === actorId) throw new BadRequestException("不能移除自己当前的项目成员身份");
    await this.prisma.$transaction(async (tx) => {
      await tx.roleBinding.deleteMany({ where: { organizationId, projectSpaceId, userId } });
      const deleted = await tx.projectMember.deleteMany({ where: { projectSpaceId, userId, projectSpace: { organizationId } } });
      if (!deleted.count) throw new NotFoundException("项目成员不存在");
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "space.member.remove", resourceType: "User", resourceId: userId } });
    });
  }

  listRoles(organizationId: string, projectSpaceId: string) {
    return this.prisma.role.findMany({ where: { OR: [{ organizationId: null, code: "space_admin" }, { organizationId, scope: "ORGANIZATION", projectSpaceId: null }, { organizationId, scope: "PROJECT_SPACE", projectSpaceId }] }, select: { id: true, code: true, name: true, description: true, isSystem: true, version: true, scope: true, projectSpaceId: true, permissions: { select: { permission: { select: { code: true, description: true } } } } }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  }

  async createRole(organizationId: string, projectSpaceId: string, actorId: string, dto: CreateRoleDto) {
    return this.prisma.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({ where: { code: { in: dto.permissionCodes }, NOT: { code: { startsWith: "organization." } } }, select: { id: true } });
      if (permissions.length !== dto.permissionCodes.length) throw new BadRequestException("项目私有角色只能使用项目业务权限");
      const role = await tx.role.create({ data: { organizationId, projectSpaceId, scope: "PROJECT_SPACE", code: `project_${randomBytes(8).toString("hex")}`, name: dto.name.trim(), description: dto.description?.trim() || null, permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } }, include: { permissions: { include: { permission: true } } } });
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "space.role.create", resourceType: "Role", resourceId: role.id } }); return role;
    });
  }

  async updateRole(organizationId: string, projectSpaceId: string, roleId: string, actorId: string, dto: UpdateRoleDto) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, organizationId, projectSpaceId, scope: "PROJECT_SPACE", isSystem: false }, select: { version: true } });
      if (!role) throw new NotFoundException("项目私有角色不存在"); if (role.version !== dto.version) throw new ConflictException("角色已被修改");
      const permissions = await tx.permission.findMany({ where: { code: { in: dto.permissionCodes }, NOT: { code: { startsWith: "organization." } } }, select: { id: true } });
      if (permissions.length !== dto.permissionCodes.length) throw new BadRequestException("项目私有角色只能使用项目业务权限");
      await tx.rolePermission.deleteMany({ where: { roleId } });
      const updated = await tx.role.update({ where: { id: roleId }, data: { name: dto.name.trim(), description: dto.description?.trim() || null, version: { increment: 1 }, permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } }, include: { permissions: { include: { permission: true } } } });
      await tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action: "space.role.update", resourceType: "Role", resourceId: roleId } }); return updated;
    });
  }

}
