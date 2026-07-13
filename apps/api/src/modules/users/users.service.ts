import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersQuery } from "./dto/list-users.query";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        organizationMembers: {
          where: { status: "ACTIVE" },
          select: { organization: { select: { id: true, slug: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async list(actorId: string, query: ListUsersQuery) {
    await this.assertSystemAdmin(actorId);
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [
        { username: { contains: query.q, mode: "insensitive" } },
        { displayName: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, username: true, email: true, displayName: true, feishuUserId: true, status: true,
          isSystemAdmin: true, version: true, lastLoginAt: true, createdAt: true,
          organizationMembers: { where: { status: "ACTIVE" }, select: { organization: { select: { id: true, name: true } } } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, pageInfo: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async create(actorId: string, dto: CreateUserDto) {
    await this.assertSystemAdmin(actorId);
    const organizationId = await this.auditOrganization(actorId);
    try {
      const user = await this.prisma.user.create({
        data: {
          username: dto.username,
          displayName: dto.displayName.trim(),
          email: dto.email,
          feishuUserId: dto.feishuUserId?.trim() || null,
          passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
          status: UserStatus.ACTIVE,
        },
        select: { id: true, username: true, email: true, displayName: true, feishuUserId: true, status: true, isSystemAdmin: true, version: true, lastLoginAt: true, createdAt: true },
      });
      await this.prisma.auditLog.create({ data: { organizationId, actorId, action: "system.user.create", resourceType: "User", resourceId: user.id, metadata: { username: user.username } } });
      return { ...user, organizationMembers: [] };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Username, email or Feishu user ID is already registered");
      throw error;
    }
  }

  async update(actorId: string, userId: string, dto: UpdateUserDto) {
    await this.assertSystemAdmin(actorId);
    const organizationId = await this.auditOrganization(actorId);
    if (actorId === userId && dto.status === "DEACTIVATED") throw new BadRequestException("You cannot disable your own account");
    try {
      const changed = await this.prisma.user.updateMany({
        where: { id: userId, version: dto.version },
        data: {
          ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.feishuUserId !== undefined ? { feishuUserId: dto.feishuUserId.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.status === "DEACTIVATED" ? { tokenVersion: { increment: 1 } } : {}),
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw new ConflictException("User was modified by another administrator");
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, username: true, email: true, displayName: true, feishuUserId: true, status: true, isSystemAdmin: true, version: true, lastLoginAt: true, createdAt: true } });
      await this.prisma.auditLog.create({ data: { organizationId, actorId, action: "system.user.update", resourceType: "User", resourceId: userId, metadata: { fields: Object.keys(dto).filter((key) => key !== "version"), status: dto.status } } });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Email or Feishu user ID is already registered");
      throw error;
    }
  }

  async resetPassword(actorId: string, userId: string, password: string) {
    await this.assertSystemAdmin(actorId);
    const organizationId = await this.auditOrganization(actorId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException("用户不存在");
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }), tokenVersion: { increment: 1 }, version: { increment: 1 } } });
    await this.prisma.auditLog.create({ data: { organizationId, actorId, action: "system.user.password.reset", resourceType: "User", resourceId: userId } });
    return { userId };
  }

  async delete(actorId: string, userId: string): Promise<void> {
    await this.assertSystemAdmin(actorId);
    if (actorId === userId) throw new BadRequestException("不能删除当前登录账号");
    const organizationId = await this.auditOrganization(actorId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isSystemAdmin: true } });
    if (!user) throw new NotFoundException("用户不存在");
    if (user.isSystemAdmin) throw new BadRequestException("默认系统管理员账号不可删除");
    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({ data: { organizationId, actorId, action: "system.user.delete", resourceType: "User", resourceId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  private async assertSystemAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isSystemAdmin: true, status: true } });
    if (!user?.isSystemAdmin || user.status !== UserStatus.ACTIVE) throw new ForbiddenException("System administrator access is required");
  }

  private async auditOrganization(userId: string): Promise<string> {
    const membership = await this.prisma.organizationMember.findFirst({ where: { userId, status: "ACTIVE" }, select: { organizationId: true }, orderBy: { joinedAt: "asc" } });
    if (!membership) throw new ForbiddenException("System administrator must belong to an organization for audited user management");
    return membership.organizationId;
  }
}
