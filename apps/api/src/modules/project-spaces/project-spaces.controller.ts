import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateProjectSpaceDto } from "./dto/create-project-space.dto";
import { ProjectSpacesService } from "./project-spaces.service";
import { UpdateProjectSpaceDto } from "./dto/update-project-space.dto";
import { AddProjectMemberDto } from "./dto/add-project-member.dto";
import { SetProjectMemberRolesDto } from "./dto/set-project-member-roles.dto";
import { CreateRoleDto } from "../organizations/dto/create-role.dto";
import { UpdateRoleDto } from "../organizations/dto/update-role.dto";

@ApiTags("Project spaces")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces")
export class ProjectSpacesController {
  constructor(private readonly spaces: ProjectSpacesService) {}

  @Get()
  @RequirePermissions("space.read")
  @ApiOperation({ summary: "List active project spaces in an organization" })
  list(@Param("organizationId", ParseUUIDPipe) organizationId: string, @CurrentUser("userId") userId: string) {
    return this.spaces.list(organizationId, userId);
  }

  @Get(":projectSpaceId")
  @RequirePermissions("space.read")
  @ApiOperation({ summary: "Get a project space" })
  get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
  ) {
    return this.spaces.get(organizationId, projectSpaceId);
  }

  @Post()
  @RequirePermissions("space.manage")
  @ApiOperation({ summary: "Create a project space" })
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser("userId") userId: string,
    @Body() dto: CreateProjectSpaceDto,
  ) {
    return this.spaces.create(organizationId, userId, dto);
  }

  @Patch(":projectSpaceId")
  @RequirePermissions("space.manage")
  @ApiOperation({ summary: "Update project-space metadata" })
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") userId: string,
    @Body() dto: UpdateProjectSpaceDto,
  ) {
    return this.spaces.update(organizationId, projectSpaceId, userId, dto);
  }

  @Delete(":projectSpaceId")
  @RequirePermissions("space.manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @CurrentUser("userId") actorId: string) {
    return this.spaces.delete(organizationId, projectSpaceId, actorId);
  }

  @Get(":projectSpaceId/members") @RequirePermissions("member.read")
  listMembers(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) { return this.spaces.listMembers(organizationId, projectSpaceId); }

  @Post(":projectSpaceId/members") @RequirePermissions("member.manage")
  addMember(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @CurrentUser("userId") actorId: string, @Body() dto: AddProjectMemberDto) { return this.spaces.addMember(organizationId, projectSpaceId, dto.userId, actorId); }

  @Put(":projectSpaceId/members/:userId/roles") @RequirePermissions("member.manage")
  setMemberRoles(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("userId", ParseUUIDPipe) userId: string, @CurrentUser("userId") actorId: string, @Body() dto: SetProjectMemberRolesDto) { return this.spaces.setMemberRoles(organizationId, projectSpaceId, userId, actorId, dto.roleIds); }

  @Delete(":projectSpaceId/members/:userId") @RequirePermissions("member.manage") @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("userId", ParseUUIDPipe) userId: string, @CurrentUser("userId") actorId: string) { return this.spaces.removeMember(organizationId, projectSpaceId, userId, actorId); }

  @Get(":projectSpaceId/roles") @RequirePermissions("member.read")
  listRoles(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) { return this.spaces.listRoles(organizationId, projectSpaceId); }

  @Post(":projectSpaceId/roles") @RequirePermissions("member.manage")
  createRole(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @CurrentUser("userId") actorId: string, @Body() dto: CreateRoleDto) { return this.spaces.createRole(organizationId, projectSpaceId, actorId, dto); }

  @Patch(":projectSpaceId/roles/:roleId") @RequirePermissions("member.manage")
  updateRole(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("roleId", ParseUUIDPipe) roleId: string, @CurrentUser("userId") actorId: string, @Body() dto: UpdateRoleDto) { return this.spaces.updateRole(organizationId, projectSpaceId, roleId, actorId, dto); }

}
