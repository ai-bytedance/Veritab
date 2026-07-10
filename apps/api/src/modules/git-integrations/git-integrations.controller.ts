import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateGitRepositoryDto } from "./dto/create-git-repository.dto";
import { ImportGitChangesDto } from "./dto/import-git-changes.dto";
import { ListCodeChangesQuery } from "./dto/list-code-changes.query";
import { SyncCodeChangeLinksDto } from "./dto/sync-code-change-links.dto";
import { UpdateGitRepositoryDto } from "./dto/update-git-repository.dto";
import { GitIntegrationsService } from "./git-integrations.service";

@ApiTags("Git integrations")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/git")
export class GitIntegrationsController {
  constructor(private readonly git: GitIntegrationsService) {}

  @Get("repositories")
  @RequirePermissions("integration.read")
  listRepositories(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) {
    return this.git.listRepositories(projectSpaceId);
  }

  @Post("repositories")
  @RequirePermissions("integration.manage")
  @ApiOperation({ summary: "Connect a repository using a secret-manager credential reference" })
  createRepository(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: CreateGitRepositoryDto,
  ) {
    return this.git.createRepository(organizationId, projectSpaceId, actorId, dto);
  }

  @Patch("repositories/:repositoryId")
  @RequirePermissions("integration.manage")
  updateRepository(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("repositoryId", ParseUUIDPipe) repositoryId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateGitRepositoryDto,
  ) {
    return this.git.updateRepository(organizationId, projectSpaceId, repositoryId, actorId, dto);
  }

  @Delete("repositories/:repositoryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("integration.manage")
  async disconnectRepository(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("repositoryId", ParseUUIDPipe) repositoryId: string,
    @CurrentUser("userId") actorId: string,
    @Query("version", ParseIntPipe) version: number,
  ): Promise<void> {
    await this.git.disconnectRepository(organizationId, projectSpaceId, repositoryId, actorId, version);
  }

  @Post("repositories/:repositoryId/import")
  @RequirePermissions("integration.manage")
  @ApiOperation({ summary: "Idempotently import normalized commits and pull requests from a trusted worker" })
  importChanges(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("repositoryId", ParseUUIDPipe) repositoryId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: ImportGitChangesDto,
  ) {
    return this.git.importChanges(organizationId, projectSpaceId, repositoryId, actorId, dto);
  }

  @Get("changes")
  @RequirePermissions("integration.read")
  listChanges(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Query() query: ListCodeChangesQuery) {
    return this.git.listChanges(projectSpaceId, query);
  }

  @Get("changes/:changeId")
  @RequirePermissions("integration.read")
  getChange(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("changeId", ParseUUIDPipe) changeId: string,
  ) {
    return this.git.getChange(projectSpaceId, changeId);
  }

  @Put("changes/:changeId/links")
  @RequirePermissions("integration.manage")
  syncLinks(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("changeId", ParseUUIDPipe) changeId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: SyncCodeChangeLinksDto,
  ) {
    return this.git.syncLinks(organizationId, projectSpaceId, changeId, actorId, dto);
  }

  @Get("pull-requests")
  @RequirePermissions("integration.read")
  listPullRequests(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Query("repositoryId") repositoryId?: string,
  ) {
    return this.git.listPullRequests(projectSpaceId, repositoryId);
  }
}
