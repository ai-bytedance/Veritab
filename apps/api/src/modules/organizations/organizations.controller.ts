import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AssignMemberRoleDto } from "./dto/assign-member-role.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateMemberInvitationDto } from "./dto/create-member-invitation.dto";
import { UpdateMemberStatusDto } from "./dto/update-member-status.dto";
import { OrganizationsService } from "./organizations.service";
import { UpdateOrganizationSettingsDto } from "./dto/update-organization-settings.dto";
import { CreateUserGroupDto } from "./dto/create-user-group.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

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

  @Get(":organizationId/groups")
  @RequirePermissions("member.read")
  listGroups(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.organizations.listGroups(organizationId);
  }

  @Post(":organizationId/groups")
  @RequirePermissions("member.manage")
  createGroup(@Param("organizationId", ParseUUIDPipe) organizationId: string, @CurrentUser("userId") actorId: string, @Body() dto: CreateUserGroupDto) {
    return this.organizations.createGroup(organizationId, actorId, dto);
  }

  @Put(":organizationId/groups/:groupId/members/:userId")
  @RequirePermissions("member.manage")
  addGroupMember(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("groupId", ParseUUIDPipe) groupId: string, @Param("userId", ParseUUIDPipe) userId: string, @CurrentUser("userId") actorId: string) {
    return this.organizations.addGroupMember(organizationId, groupId, userId, actorId);
  }

  @Delete(":organizationId/groups/:groupId/members/:userId")
  @RequirePermissions("member.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeGroupMember(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("groupId", ParseUUIDPipe) groupId: string, @Param("userId", ParseUUIDPipe) userId: string, @CurrentUser("userId") actorId: string) {
    return this.organizations.removeGroupMember(organizationId, groupId, userId, actorId);
  }

  @Delete(":organizationId/groups/:groupId")
  @RequirePermissions("member.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGroup(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("groupId", ParseUUIDPipe) groupId: string, @CurrentUser("userId") actorId: string) {
    return this.organizations.deleteGroup(organizationId, groupId, actorId);
  }

  @Get(":organizationId/invitations")
  @RequirePermissions("member.read")
  @ApiOperation({ summary: "List organization member invitations without token material" })
  listInvitations(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.organizations.listInvitations(organizationId);
  }

  @Post(":organizationId/invitations")
  @RequirePermissions("member.manage")
  @ApiOperation({ summary: "Create a one-time member invitation" })
  createInvitation(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: CreateMemberInvitationDto,
  ) {
    return this.organizations.createInvitation(organizationId, actorId, dto);
  }

  @Delete(":organizationId/invitations/:invitationId")
  @RequirePermissions("member.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke an unused member invitation" })
  revokeInvitation(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.organizations.revokeInvitation(organizationId, invitationId, actorId);
  }
}
