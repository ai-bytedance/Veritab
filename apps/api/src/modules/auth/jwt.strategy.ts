import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AccessTokenPayload, Principal } from "../../common/auth/principal";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      issuer: config.getOrThrow<string>("JWT_ISSUER"),
      audience: config.getOrThrow<string>("JWT_AUDIENCE"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<Principal> {
    if (payload.type !== "access") throw new UnauthorizedException("Invalid access token type");
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, status: true, tokenVersion: true } }),
      this.prisma.refreshSession.findUnique({ where: { id: payload.sid }, select: { revokedAt: true, expiresAt: true } }),
    ]);
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.tokenVersion !== payload.ver ||
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Access session is no longer valid");
    }
    return { userId: user.id, sessionId: payload.sid, tokenVersion: user.tokenVersion };
  }
}
