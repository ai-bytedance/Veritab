import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersQuery } from "./dto/list-users.query";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Return the authenticated user profile and active organizations" })
  getMe(@CurrentUser("userId") userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get()
  @ApiOperation({ summary: "List system registered users (system administrator only)" })
  list(@CurrentUser("userId") actorId: string, @Query() query: ListUsersQuery) {
    return this.usersService.list(actorId, query);
  }

  @Post()
  @ApiOperation({ summary: "Create a registered user account (system administrator only)" })
  create(@CurrentUser("userId") actorId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(actorId, dto);
  }

  @Patch(":userId")
  @ApiOperation({ summary: "Update or disable a registered user (system administrator only)" })
  update(@CurrentUser("userId") actorId: string, @Param("userId", ParseUUIDPipe) userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(actorId, userId, dto);
  }
}
