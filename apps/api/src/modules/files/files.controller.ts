import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AttachFileDto } from "./dto/attach-file.dto";
import { CreateUploadDto } from "./dto/create-upload.dto";
import { ListFilesDto } from "./dto/list-files.dto";
import { FilesService } from "./files.service";

@ApiTags("Files")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("uploads")
  @RequirePermissions("space.read")
  @ApiOperation({ summary: "Reserve an object and create a presigned upload URL" })
  createUpload(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @CurrentUser("userId") userId: string, @Body() dto: CreateUploadDto) {
    return this.files.createUpload(organizationId, projectSpaceId, userId, dto);
  }

  @Post(":fileId/complete")
  @RequirePermissions("space.read")
  complete(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("fileId", ParseUUIDPipe) fileId: string, @CurrentUser("userId") userId: string) {
    return this.files.complete(projectSpaceId, userId, fileId);
  }

  @Patch(":fileId/attachment")
  @RequirePermissions("space.read")
  attach(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("fileId", ParseUUIDPipe) fileId: string, @CurrentUser("userId") userId: string, @Body() dto: AttachFileDto) {
    return this.files.attach(projectSpaceId, userId, fileId, dto);
  }

  @Get()
  @RequirePermissions("space.read")
  list(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Query() query: ListFilesDto) {
    return this.files.list(projectSpaceId, query.resourceType, query.resourceId);
  }

  @Get(":fileId/download")
  @RequirePermissions("space.read")
  download(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("fileId", ParseUUIDPipe) fileId: string) {
    return this.files.download(projectSpaceId, fileId);
  }

  @Delete(":fileId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("space.read")
  remove(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Param("fileId", ParseUUIDPipe) fileId: string, @CurrentUser("userId") userId: string) {
    return this.files.remove(organizationId, projectSpaceId, userId, fileId);
  }
}
