import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateRequirementDto } from "./dto/create-requirement.dto";
import { DeleteRequirementQuery } from "./dto/delete-requirement.query";
import { ListRequirementsQuery } from "./dto/list-requirements.query";
import { TransitionRequirementDto } from "./dto/transition-requirement.dto";
import { UpdateRequirementDto } from "./dto/update-requirement.dto";
import { RequirementsService } from "./requirements.service";

@ApiTags("Requirements")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/requirements")
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get()
  @RequirePermissions("requirement.read")
  @ApiOperation({ summary: "List requirements with cursor pagination, search, filtering and status facets" })
  list(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Query() query: ListRequirementsQuery,
  ) {
    return this.requirements.list(projectSpaceId, query);
  }

  @Get(":id/history")
  @RequirePermissions("requirement.read")
  @ApiOperation({ summary: "Return the latest 100 immutable requirement history records" })
  history(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requirements.history(projectSpaceId, id);
  }

  @Get(":id")
  @RequirePermissions("requirement.read")
  @ApiOperation({ summary: "Get a requirement and its currently available workflow transitions" })
  get(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requirements.get(projectSpaceId, id);
  }

  @Post()
  @RequirePermissions("requirement.create")
  @ApiOperation({ summary: "Create a draft requirement with a project-scoped display number" })
  @ApiCreatedResponse({ description: "Requirement created" })
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: CreateRequirementDto,
  ) {
    return this.requirements.create(organizationId, projectSpaceId, actorId, dto);
  }

  @Patch(":id")
  @RequirePermissions("requirement.update")
  @ApiOperation({ summary: "Update requirement attributes using optimistic concurrency" })
  @ApiConflictResponse({ description: "The version is stale" })
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.requirements.update(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Post(":id/transitions")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("requirement.transition")
  @ApiOperation({ summary: "Apply a validated workflow transition using optimistic concurrency" })
  @ApiConflictResponse({ description: "The version is stale" })
  transition(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: TransitionRequirementDto,
  ) {
    return this.requirements.transition(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Delete(":id")
  @RequirePermissions("requirement.delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a requirement using optimistic concurrency" })
  @ApiNoContentResponse({ description: "Requirement deleted" })
  async remove(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Query() query: DeleteRequirementQuery,
  ): Promise<void> {
    await this.requirements.remove(organizationId, projectSpaceId, id, actorId, query.version);
  }
}
