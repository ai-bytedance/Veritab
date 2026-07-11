import { Body, Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AiService } from "./ai.service";
import { InvokeAiDto } from "./dto/invoke-ai.dto";
import { Throttle } from "@nestjs/throttler";

@ApiTags("AI gateway")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("invoke")
  @RequirePermissions("space.read")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Invoke the server-managed AI provider" })
  invoke(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") userId: string,
    @Body() dto: InvokeAiDto,
  ) {
    return this.ai.invoke(organizationId, projectSpaceId, userId, dto.prompt);
  }
}
