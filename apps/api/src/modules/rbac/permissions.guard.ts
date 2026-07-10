import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RequestWithPrincipal } from "../../common/auth/request-with-principal";
import { REQUIRED_PERMISSIONS_KEY } from "../../common/decorators/permissions.decorator";
import { RbacService } from "./rbac.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permissions?.length) return true;
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const params = request.params as { organizationId?: string; projectSpaceId?: string };
    if (!request.user || !params.organizationId) {
      throw new ForbiddenException("A scoped organization is required for this operation");
    }
    await this.rbac.assertAllPermissions(
      {
        userId: request.user.userId,
        organizationId: params.organizationId,
        ...(params.projectSpaceId ? { projectSpaceId: params.projectSpaceId } : {}),
      },
      permissions,
    );
    return true;
  }
}
