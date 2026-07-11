import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { WebhookProvider } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { RequestNotificationDto } from "./dto/request-notification.dto";
import { UpdateChannelDto } from "./dto/update-channel.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("organizations/:organizationId/spaces/:projectSpaceId/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("channels")
  @RequirePermissions("space.read")
  list(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) {
    return this.notifications.list(projectSpaceId);
  }

  @Put("channels/:provider")
  @RequirePermissions("space.manage")
  @ApiOperation({ summary: "Create or update an encrypted outbound notification channel" })
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("provider", new ParseEnumPipe(WebhookProvider)) provider: WebhookProvider,
    @CurrentUser("userId") actorId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.notifications.update(organizationId, projectSpaceId, actorId, provider, dto);
  }

  @Post("requests")
  @RequirePermissions("space.read")
  @ApiOperation({ summary: "Enqueue an outbound notification through the transactional outbox" })
  enqueue(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @CurrentUser("userId") actorId: string,
    @Body() dto: RequestNotificationDto,
  ) {
    return this.notifications.enqueue(organizationId, projectSpaceId, actorId, dto);
  }

  @Get("dead-letters")
  @RequirePermissions("space.manage")
  listDeadLetters(@Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string) {
    return this.notifications.listDeadLetters(projectSpaceId);
  }

  @Post("dead-letters/:eventId/replay")
  @RequirePermissions("space.manage")
  replay(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectSpaceId", ParseUUIDPipe) projectSpaceId: string,
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.notifications.replay(organizationId, projectSpaceId, actorId, eventId);
  }
}
