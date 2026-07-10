import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AssignMemberRoleDto } from "./dto/assign-member-role.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateMemberStatusDto } from "./dto/update-member-status.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@ApiBearerAuth()
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: "List organizations visible to the authenticated user" })
  list(@CurrentUser("userId") userId: string) {
    return this.organizations.listForUser(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create an organization and bind the caller as org_admin" })
  @ApiCreatedResponse({ description: "Organization created" })
  create(@CurrentUser("userId") userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(userId, dto);
  }

  @Get(":organizationId/members")
  @RequirePermissions("member.read")
  @ApiOperation({ summary: "List organization members and their direct roles" })
  listMembers(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.organizations.listMembers(organizationId);
  }

  @Patch(":organizationId/members/:userId/status")
  @RequirePermissions("member.manage")
  @ApiOperation({ summary: "Activate or suspend an organization member" })
  updateMemberStatus(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.organizations.updateMemberStatus(organizationId, userId, actorId, dto.status);
  }

  @Put(":organizationId/members/:userId/role")
  @RequirePermissions("member.manage")
  @ApiOperation({ summary: "Replace an organization member's direct organization role" })
  assignMemberRole(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: AssignMemberRoleDto,
  ) {
    return this.organizations.assignMemberRole(organizationId, userId, actorId, dto.roleCode);
  }
}
