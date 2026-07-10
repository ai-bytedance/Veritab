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
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateDefectCommentDto } from "./dto/create-defect-comment.dto";
import { CreateDefectDto } from "./dto/create-defect.dto";
import { DeleteDefectQuery } from "./dto/delete-defect.query";
import { ListDefectsQuery } from "./dto/list-defects.query";
import { SyncDefectLinksDto } from "./dto/sync-defect-links.dto";
import { TransitionDefectDto } from "./dto/transition-defect.dto";
import { UpdateDefectDto } from "./dto/update-defect.dto";
import { DefectsService } from "./defects.service";

@ApiTags("Defects")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/defects")
export class DefectsController {
  constructor(private readonly defects: DefectsService) {}

  @Get()
  @RequirePermissions("defect.read")
  @ApiOperation({ summary: "List defects with server-side paging, filters and board facets" })
  list(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Query() query: ListDefectsQuery) {
    return this.defects.list(projectSpaceId, query);
  }

  @Get(":id/history")
  @RequirePermissions("defect.read")
  @ApiOperation({ summary: "Return the latest 100 immutable defect changes" })
  history(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.defects.history(projectSpaceId, id);
  }

  @Get(":id")
  @RequirePermissions("defect.read")
  @ApiOperation({ summary: "Get a defect, traceability links, comments and available transitions" })
  get(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.defects.get(projectSpaceId, id);
  }

  @Post()
  @RequirePermissions("defect.create")
  @ApiOperation({ summary: "Create an OPEN defect with a project-scoped display number" })
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: CreateDefectDto,
  ) {
    return this.defects.create(organizationId, projectSpaceId, actorId, dto);
  }

  @Patch(":id")
  @RequirePermissions("defect.update")
  @ApiConflictResponse({ description: "The version is stale" })
  @ApiOperation({ summary: "Update defect attributes with optimistic locking" })
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateDefectDto,
  ) {
    return this.defects.update(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Post(":id/transitions")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("defect.transition")
  @ApiOperation({ summary: "Apply a validated defect workflow transition" })
  transition(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: TransitionDefectDto,
  ) {
    return this.defects.transition(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Put(":id/links")
  @RequirePermissions("defect.update")
  @ApiOperation({ summary: "Atomically replace requirement and test-case traceability links" })
  syncLinks(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: SyncDefectLinksDto,
  ) {
    return this.defects.syncLinks(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Post(":id/comments")
  @RequirePermissions("defect.comment")
  @ApiOperation({ summary: "Create a top-level comment or one-level reply" })
  addComment(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: CreateDefectCommentDto,
  ) {
    return this.defects.addComment(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Delete(":id/comments/:commentId")
  @RequirePermissions("defect.comment")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a comment owned by the authenticated user" })
  async deleteComment(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("commentId", ParseUUIDPipe) commentId: string,
    @CurrentUser("userId") actorId: string,
  ): Promise<void> {
    await this.defects.deleteComment(organizationId, projectSpaceId, id, commentId, actorId);
  }

  @Delete(":id")
  @RequirePermissions("defect.delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a defect with optimistic locking" })
  async remove(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Query() query: DeleteDefectQuery,
  ): Promise<void> {
    await this.defects.remove(organizationId, projectSpaceId, id, actorId, query.version);
  }
}
