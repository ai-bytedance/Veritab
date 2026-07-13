import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AssignMemberRoleDto } from "./dto/assign-member-role.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateMemberStatusDto } from "./dto/update-member-status.dto";
import { OrganizationsService } from "./organizations.service";
import { UpdateOrganizationSettingsDto } from "./dto/update-organization-settings.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { AddRegisteredMemberDto } from "./dto/add-registered-member.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

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

  @Patch(":organizationId")
  @RequirePermissions("space.manage")
  update(@Param("organizationId", ParseUUIDPipe) organizationId: string, @CurrentUser("userId") actorId: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizations.update(organizationId, actorId, dto);
  }

  @Delete(":organizationId")
  @RequirePermissions("organization.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param("organizationId", ParseUUIDPipe) organizationId: string, @CurrentUser("userId") actorId: string) {
    return this.organizations.delete(organizationId, actorId);
  }

  @Get(":organizationId/settings")
  @RequirePermissions("space.read")
  @ApiOperation({ summary: "Get non-secret organization settings" })
  getSettings(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.organizations.getSettings(organizationId);
  }

  @Patch(":organizationId/settings")
  @RequirePermissions("space.manage")
  @ApiOperation({ summary: "Update non-secret organization settings" })
  updateSettings(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizations.updateSettings(organizationId, actorId, dto);
  }

  @Get(":organizationId/members")
  @RequirePermissions("member.read")
  @ApiOperation({ summary: "List organization members and their direct roles" })
  listMembers(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.organizations.listMembers(organizationId);
  }

  @Post(":organizationId/members")
  @RequirePermissions("member.manage")
  addRegisteredMember(@Param("organizationId", ParseUUIDPipe) organizationId: string, @CurrentUser("userId") actorId: string, @Body() dto: AddRegisteredMemberDto) {
    return this.organizations.addRegisteredMember(organizationId, dto.userId, actorId, dto.roleCode);
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

  @Get(":organizationId/roles")
  @RequirePermissions("member.read")
  listRoles(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.organizations.listRoles(organizationId);
  }

  @Get(":organizationId/permissions")
  @RequirePermissions("member.read")
  listPermissions() { return this.organizations.listPermissions(); }

  @Post(":organizationId/roles")
  @RequirePermissions("member.manage")
  createRole(@Param("organizationId", ParseUUIDPipe) organizationId: string, @CurrentUser("userId") actorId: string, @Body() dto: CreateRoleDto) {
    return this.organizations.createRole(organizationId, actorId, dto);
  }

  @Patch(":organizationId/roles/:roleId")
  @RequirePermissions("member.manage")
  updateRole(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("roleId", ParseUUIDPipe) roleId: string, @CurrentUser("userId") actorId: string, @Body() dto: UpdateRoleDto) {
    return this.organizations.updateRole(organizationId, roleId, actorId, dto);
  }

  @Delete(":organizationId/roles/:roleId")
  @RequirePermissions("member.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRole(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("roleId", ParseUUIDPipe) roleId: string, @CurrentUser("userId") actorId: string) {
    return this.organizations.deleteRole(organizationId, roleId, actorId);
  }

}
