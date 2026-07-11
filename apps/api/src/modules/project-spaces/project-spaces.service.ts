import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateProjectSpaceDto } from "./dto/create-project-space.dto";
import { UpdateProjectSpaceDto } from "./dto/update-project-space.dto";

@Injectable()
export class ProjectSpacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.projectSpace.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, key: true, name: true, description: true, version: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(organizationId: string, projectSpaceId: string) {
    const space = await this.prisma.projectSpace.findFirst({
      where: { id: projectSpaceId, organizationId, archivedAt: null },
      select: { id: true, key: true, name: true, description: true, version: true, createdAt: true, updatedAt: true },
    });
    if (!space) throw new NotFoundException("Project space not found");
    return space;
  }

  async create(organizationId: string, actorId: string, dto: CreateProjectSpaceDto) {
    const existing = await this.prisma.projectSpace.findUnique({
      where: { organizationId_key: { organizationId, key: dto.key } },
    });
    if (existing) throw new ConflictException("Project key is already in use in this organization");
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.create({ data: { organizationId, ...dto } });
      await tx.projectMember.create({ data: { projectSpaceId: space.id, userId: actorId } });
      await tx.auditLog.create({
        data: {
          organizationId,
          projectSpaceId: space.id,
          actorId,
          action: "space.create",
          resourceType: "ProjectSpace",
          resourceId: space.id,
        },
      });
      return space;
    });
  }

  async update(organizationId: string, projectSpaceId: string, actorId: string, dto: UpdateProjectSpaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.projectSpace.findFirst({
        where: { id: projectSpaceId, organizationId, archivedAt: null },
        select: { id: true, version: true },
      });
      if (!current) throw new NotFoundException("Project space not found");
      if (current.version !== dto.version) throw new ConflictException("Project space was modified by another user");

      const updated = await tx.projectSpace.update({
        where: { id: projectSpaceId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          version: { increment: 1 },
        },
        select: { id: true, key: true, name: true, description: true, version: true, createdAt: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          projectSpaceId,
          actorId,
          action: "space.update",
          resourceType: "ProjectSpace",
          resourceId: projectSpaceId,
          metadata: { previousVersion: current.version, version: updated.version },
        },
      });
      return updated;
    });
  }
}
