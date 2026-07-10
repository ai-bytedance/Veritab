import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateProjectSpaceDto } from "./dto/create-project-space.dto";
import { ProjectSpacesService } from "./project-spaces.service";

@ApiTags("Project spaces")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces")
export class ProjectSpacesController {
  constructor(private readonly spaces: ProjectSpacesService) {}

  @Get()
  @RequirePermissions("space.read")
  @ApiOperation({ summary: "List active project spaces in an organization" })
  list(@Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.spaces.list(organizationId);
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
}
