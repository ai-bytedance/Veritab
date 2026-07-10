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
    const organizationMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organizationId,
          userId: context.userId,
        },
      },
      select: { status: true },
    });
    if (organizationMember?.status !== MembershipStatus.ACTIVE) return false;
    if (context.projectSpaceId) {
      const space = await this.prisma.projectSpace.findFirst({
        where: { id: context.projectSpaceId, organizationId: context.organizationId, archivedAt: null },
        select: { id: true },
      });
      if (!space) return false;
    }

    const groupRows = await this.prisma.groupMember.findMany({
      where: { userId: context.userId, group: { organizationId: context.organizationId } },
      select: { groupId: true },
    });
    const groupIds = groupRows.map((row) => row.groupId);
    const bindings = await this.prisma.roleBinding.findMany({
      where: {
        organizationId: context.organizationId,
        OR: [
          { userId: context.userId },
          ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ],
        AND: [
          {
            OR: [
              { scopeType: ScopeType.ORGANIZATION, projectSpaceId: null },
              ...(context.projectSpaceId
                ? [{ scopeType: ScopeType.PROJECT_SPACE, projectSpaceId: context.projectSpaceId }]
                : []),
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
