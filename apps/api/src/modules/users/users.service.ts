import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        organizationMembers: {
          where: { status: "ACTIVE" },
          select: { organization: { select: { id: true, slug: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
