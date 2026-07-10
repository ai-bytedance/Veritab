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
import { CreateTestCaseDto } from "./dto/create-test-case.dto";
import { DeleteTestCaseQuery } from "./dto/delete-test-case.query";
import { ExecuteTestCaseDto } from "./dto/execute-test-case.dto";
import { ListTestCasesQuery } from "./dto/list-test-cases.query";
import { SyncTestCaseFoldersDto } from "./dto/sync-test-case-folders.dto";
import { UpdateTestCaseDto } from "./dto/update-test-case.dto";
import { TestCasesService } from "./test-cases.service";

@ApiTags("Test cases")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/test-cases")
export class TestCasesController {
  constructor(private readonly testCases: TestCasesService) {}

  @Get()
  @RequirePermissions("testcase.read")
  @ApiOperation({ summary: "List and filter active test cases" })
  list(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string, @Query() query: ListTestCasesQuery) {
    return this.testCases.list(projectSpaceId, query);
  }

  @Get("mindmap")
  @RequirePermissions("testcase.read")
  @ApiOperation({ summary: "Load the persisted test-case mindmap document" })
  mindmap(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) {
    return this.testCases.mindmap(projectSpaceId);
  }

  @Put("mindmap/folders")
  @RequirePermissions("testcase.mindmap")
  @ApiConflictResponse({ description: "The catalog version is stale" })
  @ApiOperation({ summary: "Atomically synchronize the versioned folder hierarchy" })
  syncFolders(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: SyncTestCaseFoldersDto,
  ) {
    return this.testCases.syncFolders(organizationId, projectSpaceId, actorId, dto);
  }

  @Get("export")
  @RequirePermissions("testcase.export")
  @ApiOperation({ summary: "Export a portable JSON mindmap document" })
  exportData(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) {
    return this.testCases.exportData(projectSpaceId);
  }

  @Get(":id/history")
  @RequirePermissions("testcase.read")
  @ApiOperation({ summary: "Return the latest immutable test-case changes" })
  history(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.testCases.history(projectSpaceId, id);
  }

  @Get(":id")
  @RequirePermissions("testcase.read")
  @ApiOperation({ summary: "Get test-case details and recent executions" })
  get(
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.testCases.get(projectSpaceId, id);
  }

  @Post()
  @RequirePermissions("testcase.create")
  @ApiOperation({ summary: "Create a test case with a project-scoped display number" })
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: CreateTestCaseDto,
  ) {
    return this.testCases.create(organizationId, projectSpaceId, actorId, dto);
  }

  @Patch(":id")
  @RequirePermissions("testcase.update")
  @ApiConflictResponse({ description: "The version is stale" })
  @ApiOperation({ summary: "Update test-case definition and traceability with optimistic locking" })
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCases.update(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Post(":id/executions")
  @RequirePermissions("testcase.execute")
  @ApiOperation({ summary: "Append an execution result and update the latest test-case result" })
  execute(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: ExecuteTestCaseDto,
  ) {
    return this.testCases.execute(organizationId, projectSpaceId, id, actorId, dto);
  }

  @Delete(":id")
  @RequirePermissions("testcase.delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a test case with optimistic locking" })
  async remove(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("userId") actorId: string,
    @Query() query: DeleteTestCaseQuery,
  ): Promise<void> {
    await this.testCases.remove(organizationId, projectSpaceId, id, actorId, query.version);
  }
}
