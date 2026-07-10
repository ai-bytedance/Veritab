import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  MembershipStatus,
  Prisma,
  RequirementStatus,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateRequirementDto } from "./dto/create-requirement.dto";
import { ListRequirementsQuery, RequirementSortField } from "./dto/list-requirements.query";
import { TransitionRequirementDto } from "./dto/transition-requirement.dto";
import { UpdateRequirementDto } from "./dto/update-requirement.dto";
import { RequirementWorkflowService } from "./requirement-workflow.service";

const requirementInclude = Prisma.validator<Prisma.RequirementInclude>()({
  creator: { select: { id: true, username: true, displayName: true } },
  assignee: { select: { id: true, username: true, displayName: true } },
  iteration: { select: { id: true, name: true, status: true, startsAt: true, endsAt: true } },
  parent: { select: { id: true, displayNo: true, title: true } },
});

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: RequirementWorkflowService,
  ) {}

  async list(projectSpaceId: string, query: ListRequirementsQuery) {
    if (query.cursor && query.page) throw new BadRequestException("cursor and page cannot be combined");
    const where: Prisma.RequirementWhereInput = {
      projectSpaceId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.creatorId ? { creatorId: query.creatorId } : {}),
      ...(query.iterationId ? { iterationId: query.iterationId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { displayNo: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };
    const sortField = this.sortField(query.sortBy);
    const orderBy: Prisma.RequirementOrderByWithRelationInput[] = [
      { [sortField]: query.sortDirection },
      { id: query.sortDirection },
    ];
    const [rows, total, grouped] = await Promise.all([
      this.prisma.requirement.findMany({
        where,
        include: requirementInclude,
        orderBy,
        take: query.limit + 1,
        ...(query.cursor
          ? { cursor: { id: query.cursor }, skip: 1 }
          : query.page
            ? { skip: (query.page - 1) * query.limit }
            : {}),
      }),
      this.prisma.requirement.count({ where }),
      this.prisma.requirement.groupBy({
        by: ["status"],
        where: { projectSpaceId, deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const hasNext = rows.length > query.limit;
    const items = hasNext ? rows.slice(0, query.limit) : rows;
    return {
      items,
      pageInfo: {
        hasNext,
        nextCursor: hasNext ? items.at(-1)?.id ?? null : null,
        limit: query.limit,
        total,
        page: query.page ?? null,
        totalPages: query.page ? Math.ceil(total / query.limit) : null,
      },
      statusCounts: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
    };
  }

  async get(projectSpaceId: string, id: string) {
    const requirement = await this.prisma.requirement.findFirst({
      where: { id, projectSpaceId, deletedAt: null },
      include: requirementInclude,
    });
    if (!requirement) throw new NotFoundException("Requirement not found");
    return {
      ...requirement,
      availableTransitions: this.workflow.availableTransitions(requirement.status),
    };
  }

  async create(organizationId: string, projectSpaceId: string, actorId: string, dto: CreateRequirementDto) {
    if (dto.status && dto.status !== RequirementStatus.DRAFT) {
      throw new BadRequestException("New requirements must start in DRAFT status");
    }
    this.assertDateRange(dto.plannedStartAt, dto.plannedEndAt);
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.findFirst({
        where: { id: projectSpaceId, organizationId, archivedAt: null },
        select: { id: true, key: true },
      });
      if (!space) throw new NotFoundException("Project space not found");
      await this.validateRelations(tx, projectSpaceId, dto);
      const counter = await tx.projectCounter.upsert({
        where: { projectSpaceId },
        create: { projectSpaceId, requirementNext: 2 },
        update: { requirementNext: { increment: 1 } },
        select: { requirementNext: true },
      });
      const sequence = counter.requirementNext - 1;
      const requirement = await tx.requirement.create({
        data: {
          projectSpaceId,
          creatorId: actorId,
          displayNo: `${space.key}-REQ-${String(sequence).padStart(6, "0")}`,
          title: dto.title.trim(),
          description: dto.description,
          acceptanceCriteria: dto.acceptanceCriteria,
          type: dto.type,
          status: RequirementStatus.DRAFT,
          priority: dto.priority,
          iterationId: dto.iterationId,
          parentId: dto.parentId,
          assigneeId: dto.assigneeId,
          storyPoints: dto.storyPoints,
          labels: this.normalizeLabels(dto.labels),
          sortOrder: dto.sortOrder,
          plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : undefined,
          plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : undefined,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          customFields: dto.customFields ? this.json(dto.customFields) : undefined,
        },
        include: requirementInclude,
      });
      await Promise.all([
        tx.requirementHistory.create({
          data: {
            requirementId: requirement.id,
            actorId,
            action: "CREATE",
            toVersion: requirement.version,
            changes: this.json({ created: this.historySnapshot(requirement) }),
          },
        }),
        tx.auditLog.create({
          data: {
            organizationId,
            projectSpaceId,
            actorId,
            action: "requirement.create",
            resourceType: "Requirement",
            resourceId: requirement.id,
            metadata: this.json({ displayNo: requirement.displayNo, version: requirement.version }),
          },
        }),
        tx.outboxEvent.create({
          data: {
            aggregateType: "Requirement",
            aggregateId: requirement.id,
            eventType: "RequirementCreated",
            payload: this.json({ organizationId, projectSpaceId, requirementId: requirement.id }),
          },
        }),
      ]);
      return requirement;
    });
  }

  async update(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    dto: UpdateRequirementDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.requirement.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Requirement not found");
      if (dto.parentId === id) throw new BadRequestException("A requirement cannot be its own parent");
      this.assertDateRange(
        dto.plannedStartAt === undefined ? current.plannedStartAt?.toISOString() : dto.plannedStartAt,
        dto.plannedEndAt === undefined ? current.plannedEndAt?.toISOString() : dto.plannedEndAt,
      );
      await this.validateRelations(tx, projectSpaceId, dto);
      await this.assertNoParentCycle(tx, projectSpaceId, id, dto.parentId);
      const data: Prisma.RequirementUpdateManyMutationInput = {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.acceptanceCriteria !== undefined ? { acceptanceCriteria: dto.acceptanceCriteria } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.iterationId !== undefined ? { iterationId: dto.iterationId } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.storyPoints !== undefined ? { storyPoints: dto.storyPoints } : {}),
        ...(dto.labels !== undefined ? { labels: this.normalizeLabels(dto.labels) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.plannedStartAt !== undefined
          ? { plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null }
          : {}),
        ...(dto.plannedEndAt !== undefined
          ? { plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : null }
          : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(dto.customFields !== undefined
          ? { customFields: dto.customFields ? this.json(dto.customFields) : Prisma.DbNull }
          : {}),
        version: { increment: 1 },
      };
      const result = await tx.requirement.updateMany({
        where: { id, projectSpaceId, version: dto.version, deletedAt: null },
        data,
      });
      if (result.count !== 1) throw new ConflictException("Requirement was modified by another user");
      const updated = await tx.requirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        requirementId: id,
        action: "UPDATE",
        eventType: "RequirementUpdated",
        fromVersion: current.version,
        toVersion: updated.version,
        changes: { patch: dto },
      });
      return updated;
    });
  }

  async transition(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    dto: TransitionRequirementDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.requirement.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Requirement not found");
      this.workflow.assertTransition(current.status, dto.status);
      if (current.version !== dto.version) {
        throw new ConflictException("Requirement was modified by another user");
      }
      if (current.status === dto.status) {
        const unchanged = await tx.requirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
        return { ...unchanged, availableTransitions: this.workflow.availableTransitions(unchanged.status) };
      }
      const result = await tx.requirement.updateMany({
        where: { id, projectSpaceId, version: dto.version, status: current.status, deletedAt: null },
        data: { status: dto.status, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException("Requirement was modified by another user");
      const updated = await tx.requirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        requirementId: id,
        action: "TRANSITION",
        eventType: "RequirementStatusChanged",
        fromVersion: current.version,
        toVersion: updated.version,
        changes: { from: current.status, to: dto.status },
      });
      return { ...updated, availableTransitions: this.workflow.availableTransitions(updated.status) };
    });
  }

  async remove(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    version: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.requirement.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Requirement not found");
      const result = await tx.requirement.updateMany({
        where: { id, projectSpaceId, version, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException("Requirement was modified by another user");
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        requirementId: id,
        action: "DELETE",
        eventType: "RequirementDeleted",
        fromVersion: current.version,
        toVersion: current.version + 1,
        changes: { deleted: true },
      });
    });
  }

  async history(projectSpaceId: string, id: string) {
    const exists = await this.prisma.requirement.findFirst({
      where: { id, projectSpaceId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Requirement not found");
    return this.prisma.requirementHistory.findMany({
      where: { requirementId: id },
      include: { actor: { select: { id: true, username: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  }

  private async validateRelations(
    tx: Prisma.TransactionClient,
    projectSpaceId: string,
    dto: {
      assigneeId?: string | null;
      iterationId?: string | null;
      parentId?: string | null;
    },
  ): Promise<void> {
    if (dto.assigneeId) {
      const member = await tx.projectMember.findUnique({
        where: { projectSpaceId_userId: { projectSpaceId, userId: dto.assigneeId } },
        select: { status: true },
      });
      if (member?.status !== MembershipStatus.ACTIVE) {
        throw new BadRequestException("Assignee must be an active project-space member");
      }
    }
    if (dto.iterationId) {
      const iteration = await tx.iteration.findFirst({
        where: { id: dto.iterationId, projectSpaceId },
        select: { id: true },
      });
      if (!iteration) throw new BadRequestException("Iteration does not belong to this project space");
    }
    if (dto.parentId) {
      const parent = await tx.requirement.findFirst({
        where: { id: dto.parentId, projectSpaceId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException("Parent requirement does not belong to this project space");
    }
  }

  private async recordMutation(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      projectSpaceId: string;
      actorId: string;
      requirementId: string;
      action: string;
      eventType: string;
      fromVersion: number;
      toVersion: number;
      changes: unknown;
    },
  ): Promise<void> {
    await Promise.all([
      tx.requirementHistory.create({
        data: {
          requirementId: input.requirementId,
          actorId: input.actorId,
          action: input.action,
          fromVersion: input.fromVersion,
          toVersion: input.toVersion,
          changes: this.json(input.changes),
        },
      }),
      tx.auditLog.create({
        data: {
          organizationId: input.organizationId,
          projectSpaceId: input.projectSpaceId,
          actorId: input.actorId,
          action: `requirement.${input.action.toLowerCase()}`,
          resourceType: "Requirement",
          resourceId: input.requirementId,
          metadata: this.json({ fromVersion: input.fromVersion, toVersion: input.toVersion }),
        },
      }),
      tx.outboxEvent.create({
        data: {
          aggregateType: "Requirement",
          aggregateId: input.requirementId,
          eventType: input.eventType,
          payload: this.json({
            organizationId: input.organizationId,
            projectSpaceId: input.projectSpaceId,
            requirementId: input.requirementId,
            changes: input.changes,
          }),
        },
      }),
    ]);
  }

  private async assertNoParentCycle(
    tx: Prisma.TransactionClient,
    projectSpaceId: string,
    requirementId: string,
    parentId: string | null | undefined,
  ): Promise<void> {
    if (!parentId) return;
    let candidate: string | null = parentId;
    for (let depth = 0; candidate && depth < 50; depth += 1) {
      if (candidate === requirementId) throw new BadRequestException("Parent relationship would create a cycle");
      const parent: { parentId: string | null } | null = await tx.requirement.findFirst({
        where: { id: candidate, projectSpaceId, deletedAt: null },
        select: { parentId: true },
      });
      candidate = parent?.parentId ?? null;
    }
    if (candidate) throw new BadRequestException("Requirement hierarchy exceeds the maximum depth of 50");
  }

  private sortField(field: RequirementSortField): "updatedAt" | "createdAt" | "priority" | "sortOrder" {
    return field;
  }

  private normalizeLabels(labels: string[] | undefined): string[] | undefined {
    return labels ? [...new Set(labels.map((label) => label.trim()).filter(Boolean))] : undefined;
  }

  private assertDateRange(start: string | null | undefined, end: string | null | undefined): void {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException("plannedEndAt must not be before plannedStartAt");
    }
  }

  private historySnapshot(requirement: { displayNo: string; title: string; status: RequirementStatus; priority: string }) {
    return {
      displayNo: requirement.displayNo,
      title: requirement.title,
      status: requirement.status,
      priority: requirement.priority,
    };
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
