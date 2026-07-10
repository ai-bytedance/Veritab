import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
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
}
