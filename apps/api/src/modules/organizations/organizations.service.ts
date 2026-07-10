import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { MembershipStatus, ScopeType, SubjectType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId, status: "ACTIVE" } } },
      select: { id: true, slug: true, name: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
    });
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException("Organization slug is already in use");
    const adminRole = await this.prisma.role.findFirst({ where: { code: "org_admin", organizationId: null } });
    if (!adminRole) throw new InternalServerErrorException("System roles have not been seeded");
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: dto });
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
}
