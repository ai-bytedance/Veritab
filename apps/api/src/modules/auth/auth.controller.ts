import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FastifyReply, FastifyRequest } from "fastify";
import { Public } from "../../common/decorators/public.decorator";
import { AuthResult, AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate with a local account" })
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Omit<AuthResult, "refreshToken">> {
    const result = await this.authService.login(dto, this.clientMetadata(request));
    return this.writeRefreshCookie(reply, result);
  }

  @Public()
  @Post("invitations/accept")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Accept a one-time organization invitation and create a local account" })
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate the refresh token and issue a new access token" })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Omit<AuthResult, "refreshToken">> {
    const result = await this.authService.refresh(request.cookies.refresh_token, this.clientMetadata(request));
    return this.writeRefreshCookie(reply, result);
  }

  @Post("logout")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke the current refresh session" })
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.authService.logout(request.cookies.refresh_token);
    reply.clearCookie("refresh_token", { path: "/api/v1/auth" });
  }

  private writeRefreshCookie(reply: FastifyReply, result: AuthResult): Omit<AuthResult, "refreshToken"> {
    const { refreshToken, ...response } = result;
    const domain = this.config.get<string>("COOKIE_DOMAIN") || undefined;
    reply.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: this.config.get<boolean>("COOKIE_SECURE", false),
      sameSite: "lax",
      path: "/api/v1/auth",
      expires: result.refreshTokenExpiresAt,
      ...(domain ? { domain } : {}),
    });
    return response;
  }

  private clientMetadata(request: FastifyRequest): { ipAddress: string; userAgent?: string } {
    const userAgent = request.headers["user-agent"];
    return { ipAddress: request.ip, ...(userAgent ? { userAgent } : {}) };
  }
}
