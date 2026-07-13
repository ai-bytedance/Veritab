import { ForbiddenException, Injectable } from "@nestjs/common";
import { MembershipStatus, ScopeType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

interface AuthorizationContext {
  userId: string;
  organizationId: string;
  projectSpaceId?: string;
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async hasAllPermissions(context: AuthorizationContext, required: string[]): Promise<boolean> {
    if (required.length === 0) return true;
    const systemAdministrator = await this.prisma.user.findFirst({ where: { id: context.userId, isSystemAdmin: true, status: "ACTIVE" }, select: { id: true } });
    if (systemAdministrator) return true;
    const organizationMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organizationId,
          userId: context.userId,
        },
      },
      select: { status: true, organization: { select: { status: true } } },
    });
    if (organizationMember?.status !== MembershipStatus.ACTIVE) return false;
    if (organizationMember.organization?.status === "DISABLED" && !required.includes("organization.manage")) return false;
    if (context.projectSpaceId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: { projectSpaceId: context.projectSpaceId, userId: context.userId, status: MembershipStatus.ACTIVE, projectSpace: { organizationId: context.organizationId, archivedAt: null } },
        select: { userId: true, projectSpace: { select: { status: true } } },
      });
      if (!membership) return false;
      if (membership.projectSpace?.status === "DISABLED" && !required.includes("space.manage")) return false;
    }

    const bindings = await this.prisma.roleBinding.findMany({
      where: {
        organizationId: context.organizationId,
        userId: context.userId,
        AND: [
          {
            OR: [
              ...(context.projectSpaceId ? [{ scopeType: ScopeType.PROJECT_SPACE, projectSpaceId: context.projectSpaceId }] : [{ scopeType: ScopeType.ORGANIZATION, projectSpaceId: null }]),
            ],
          },
        ],
      },
      select: {
        role: { select: { permissions: { select: { permission: { select: { code: true } } } } } },
      },
    });
    const granted = new Set(
      bindings.flatMap((binding) => binding.role.permissions.map((item) => item.permission.code)),
    );
    return required.every((permission) => granted.has(permission));
  }

  async assertAllPermissions(context: AuthorizationContext, required: string[]): Promise<void> {
    if (!(await this.hasAllPermissions(context, required))) {
      throw new ForbiddenException("Insufficient permissions for this project scope");
    }
  }
}
