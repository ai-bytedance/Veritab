import { createHash, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { AccessTokenPayload, RefreshTokenPayload } from "../../common/auth/principal";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

interface ClientMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: { id: string; username: string; email: string; displayName: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, metadata: ClientMetadata): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.identifier }, { email: dto.identifier.toLowerCase() }] },
    });
    const passwordMatches = user?.passwordHash ? await argon2.verify(user.passwordHash, dto.password) : false;
    if (!user || !passwordMatches || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid credentials");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.createSession(user, randomUUID(), metadata);
  }

  async refresh(rawToken: string | undefined, metadata: ClientMetadata): Promise<AuthResult> {
    if (!rawToken) {
      throw new UnauthorizedException("Refresh token is required");
    }
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(rawToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        issuer: this.config.getOrThrow<string>("JWT_ISSUER"),
        audience: this.config.getOrThrow<string>("JWT_AUDIENCE"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token type");
    }
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    const tokenHash = this.hash(rawToken);
    if (!session || session.tokenHash !== tokenHash || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh session is invalid");
    }
    if (session.revokedAt) {
      await this.prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected");
    }
    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("User account is inactive");
    }
    const replacement = await this.createSession(session.user, session.familyId, metadata);
    const replacementPayload = await this.jwt.verifyAsync<RefreshTokenPayload>(replacement.refreshToken, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      issuer: this.config.getOrThrow<string>("JWT_ISSUER"),
      audience: this.config.getOrThrow<string>("JWT_AUDIENCE"),
    });
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), replacedById: replacementPayload.sid },
    });
    return replacement;
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(rawToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        issuer: this.config.getOrThrow<string>("JWT_ISSUER"),
        audience: this.config.getOrThrow<string>("JWT_AUDIENCE"),
        ignoreExpiration: true,
      });
      await this.prisma.refreshSession.updateMany({
        where: { id: payload.sid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logout is intentionally idempotent and does not reveal token validity.
    }
  }

  private async createSession(
    user: { id: string; username: string; email: string; displayName: string; tokenVersion: number },
    familyId: string,
    metadata: ClientMetadata,
  ): Promise<AuthResult> {
    const sessionId = randomUUID();
    const accessTtlSeconds = this.parseDuration(this.config.get<string>("JWT_ACCESS_TTL", "15m"));
    const refreshTtlSeconds = this.parseDuration(this.config.get<string>("JWT_REFRESH_TTL", "7d"));
    const common = {
      issuer: this.config.getOrThrow<string>("JWT_ISSUER"),
      audience: this.config.getOrThrow<string>("JWT_AUDIENCE"),
    };
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      sid: sessionId,
      ver: user.tokenVersion,
      type: "access",
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      family: familyId,
      type: "refresh",
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        ...common,
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: accessTtlSeconds,
      }),
      this.jwt.signAsync(refreshPayload, {
        ...common,
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: refreshTtlSeconds,
      }),
    ]);
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        familyId,
        tokenHash: this.hash(refreshToken),
        expiresAt: refreshTokenExpiresAt,
        ipAddressHash: metadata.ipAddress ? this.hash(metadata.ipAddress) : null,
        userAgent: metadata.userAgent?.slice(0, 500),
      },
    });
    return {
      accessToken,
      accessTokenExpiresIn: accessTtlSeconds,
      refreshToken,
      refreshTokenExpiresAt,
      user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
    };
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value);
    if (!match) throw new Error(`Invalid duration: ${value}`);
    const amount = Number(match[1]);
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as "s" | "m" | "h" | "d"];
    return amount * multiplier;
  }
}
