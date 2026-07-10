import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DefectStatus, MembershipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateDefectCommentDto } from "./dto/create-defect-comment.dto";
import { CreateDefectDto } from "./dto/create-defect.dto";
import { ListDefectsQuery } from "./dto/list-defects.query";
import { SyncDefectLinksDto } from "./dto/sync-defect-links.dto";
import { TransitionDefectDto } from "./dto/transition-defect.dto";
import { UpdateDefectDto } from "./dto/update-defect.dto";
import { DefectWorkflowService } from "./defect-workflow.service";

const userSelect = { id: true, username: true, displayName: true } as const;
const defectInclude = Prisma.validator<Prisma.DefectInclude>()({
  creator: { select: userSelect },
  assignee: { select: userSelect },
  iteration: { select: { id: true, name: true, status: true } },
  requirementLinks: { include: { requirement: { select: { id: true, displayNo: true, title: true } } } },
  testCaseLinks: { include: { testCase: { select: { id: true, displayNo: true, title: true } } } },
  comments: {
    where: { parentId: null, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      author: { select: userSelect },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: { author: { select: userSelect } },
      },
    },
  },
});

@Injectable()
export class DefectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: DefectWorkflowService,
  ) {}

  async list(projectSpaceId: string, query: ListDefectsQuery) {
    if (query.cursor && query.page) throw new BadRequestException("cursor and page cannot be combined");
    const where: Prisma.DefectWhereInput = {
      projectSpaceId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.creatorId ? { creatorId: query.creatorId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
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
    const [rows, total, statusGroups, severityGroups] = await Promise.all([
      this.prisma.defect.findMany({
        where,
        include: defectInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: query.limit + 1,
        ...(query.cursor
          ? { cursor: { id: query.cursor }, skip: 1 }
          : query.page
            ? { skip: (query.page - 1) * query.limit }
            : {}),
      }),
      this.prisma.defect.count({ where }),
      this.prisma.defect.groupBy({
        by: ["status"],
        where: { projectSpaceId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.defect.groupBy({
        by: ["severity"],
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
      statusCounts: Object.fromEntries(statusGroups.map((row) => [row.status, row._count._all])),
      severityCounts: Object.fromEntries(severityGroups.map((row) => [row.severity, row._count._all])),
    };
  }

  async get(projectSpaceId: string, id: string) {
    const defect = await this.prisma.defect.findFirst({
      where: { id, projectSpaceId, deletedAt: null },
      include: defectInclude,
    });
    if (!defect) throw new NotFoundException("Defect not found");
    return { ...defect, availableTransitions: this.workflow.availableTransitions(defect.status) };
  }

  async create(organizationId: string, projectSpaceId: string, actorId: string, dto: CreateDefectDto) {
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.findFirst({
        where: { id: projectSpaceId, organizationId, archivedAt: null },
        select: { key: true },
      });
      if (!space) throw new NotFoundException("Project space not found");
      await this.validateRelations(tx, projectSpaceId, dto);
      const counter = await tx.projectCounter.upsert({
        where: { projectSpaceId },
        create: { projectSpaceId, defectNext: 2 },
        update: { defectNext: { increment: 1 } },
        select: { defectNext: true },
      });
      const sequence = counter.defectNext - 1;
      const defect = await tx.defect.create({
        data: {
          projectSpaceId,
          creatorId: actorId,
          displayNo: `${space.key}-DEF-${String(sequence).padStart(6, "0")}`,
          title: dto.title.trim(),
          description: dto.description,
          severity: dto.severity,
          source: dto.source,
          environment: dto.environment,
          precondition: dto.precondition,
          reproductionSteps: dto.reproductionSteps,
          expectedResult: dto.expectedResult,
          actualResult: dto.actualResult,
          iterationId: dto.iterationId,
          assigneeId: dto.assigneeId,
          detectedVersion: dto.detectedVersion,
          labels: this.normalizeLabels(dto.labels),
          sortOrder: dto.sortOrder,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          customFields: dto.customFields ? this.json(dto.customFields) : undefined,
          requirementLinks: dto.requirementIds?.length
            ? { createMany: { data: [...new Set(dto.requirementIds)].map((requirementId) => ({ requirementId })) } }
            : undefined,
          testCaseLinks: dto.testCaseIds?.length
            ? { createMany: { data: [...new Set(dto.testCaseIds)].map((testCaseId) => ({ testCaseId })) } }
            : undefined,
        },
        include: defectInclude,
      });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        defectId: defect.id,
        action: "CREATE",
        eventType: "DefectCreated",
        toVersion: defect.version,
        changes: { displayNo: defect.displayNo, status: defect.status, severity: defect.severity },
      });
      return defect;
    });
  }

  async update(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    dto: UpdateDefectDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.defect.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Defect not found");
      await this.validateRelations(tx, projectSpaceId, dto);
      const data: Prisma.DefectUpdateManyMutationInput = {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.severity !== undefined ? { severity: dto.severity } : {}),
        ...(dto.environment !== undefined ? { environment: dto.environment } : {}),
        ...(dto.precondition !== undefined ? { precondition: dto.precondition } : {}),
        ...(dto.reproductionSteps !== undefined ? { reproductionSteps: dto.reproductionSteps } : {}),
        ...(dto.expectedResult !== undefined ? { expectedResult: dto.expectedResult } : {}),
        ...(dto.actualResult !== undefined ? { actualResult: dto.actualResult } : {}),
        ...(dto.resolution !== undefined ? { resolution: dto.resolution } : {}),
        ...(dto.iterationId !== undefined ? { iterationId: dto.iterationId } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.detectedVersion !== undefined ? { detectedVersion: dto.detectedVersion } : {}),
        ...(dto.fixedVersion !== undefined ? { fixedVersion: dto.fixedVersion } : {}),
        ...(dto.labels !== undefined ? { labels: this.normalizeLabels(dto.labels) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(dto.customFields !== undefined
          ? { customFields: dto.customFields ? this.json(dto.customFields) : Prisma.DbNull }
          : {}),
        version: { increment: 1 },
      };
      const result = await tx.defect.updateMany({
        where: { id, projectSpaceId, version: dto.version, deletedAt: null },
        data,
      });
      if (result.count !== 1) throw new ConflictException("Defect was modified by another user");
      const updated = await tx.defect.findUniqueOrThrow({ where: { id }, include: defectInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        defectId: id,
        action: "UPDATE",
        eventType: "DefectUpdated",
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
    dto: TransitionDefectDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.defect.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Defect not found");
      this.workflow.assertTransition(current.status, dto.status);
      if (current.version !== dto.version) throw new ConflictException("Defect was modified by another user");
      if (current.status === dto.status) {
        const unchanged = await tx.defect.findUniqueOrThrow({ where: { id }, include: defectInclude });
        return { ...unchanged, availableTransitions: this.workflow.availableTransitions(unchanged.status) };
      }
      const result = await tx.defect.updateMany({
        where: { id, projectSpaceId, version: dto.version, status: current.status, deletedAt: null },
        data: { status: dto.status, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException("Defect was modified by another user");
      const updated = await tx.defect.findUniqueOrThrow({ where: { id }, include: defectInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        defectId: id,
        action: "TRANSITION",
        eventType: "DefectStatusChanged",
        fromVersion: current.version,
        toVersion: updated.version,
        changes: { from: current.status, to: dto.status },
      });
      return { ...updated, availableTransitions: this.workflow.availableTransitions(updated.status) };
    });
  }

  async syncLinks(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    dto: SyncDefectLinksDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.defect.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Defect not found");
      await this.validateRelations(tx, projectSpaceId, dto);
      const updated = await tx.defect.updateMany({
        where: { id, projectSpaceId, version: dto.version, deletedAt: null },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException("Defect was modified by another user");
      await Promise.all([
        tx.defectRequirementLink.deleteMany({ where: { defectId: id } }),
        tx.defectTestCaseLink.deleteMany({ where: { defectId: id } }),
      ]);
      await Promise.all([
        tx.defectRequirementLink.createMany({
          data: [...new Set(dto.requirementIds)].map((requirementId) => ({ defectId: id, requirementId })),
        }),
        tx.defectTestCaseLink.createMany({
          data: [...new Set(dto.testCaseIds)].map((testCaseId) => ({ defectId: id, testCaseId })),
        }),
      ]);
      const result = await tx.defect.findUniqueOrThrow({ where: { id }, include: defectInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        defectId: id,
        action: "LINKS_UPDATE",
        eventType: "DefectLinksUpdated",
        fromVersion: current.version,
        toVersion: result.version,
        changes: { requirementIds: dto.requirementIds, testCaseIds: dto.testCaseIds },
      });
      return result;
    });
  }

  async addComment(
    organizationId: string,
    projectSpaceId: string,
    defectId: string,
    actorId: string,
    dto: CreateDefectCommentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const defect = await tx.defect.findFirst({ where: { id: defectId, projectSpaceId, deletedAt: null } });
      if (!defect) throw new NotFoundException("Defect not found");
      if (dto.parentId) {
        const parent = await tx.defectComment.findFirst({
          where: { id: dto.parentId, defectId, parentId: null, deletedAt: null },
          select: { id: true },
        });
        if (!parent) throw new BadRequestException("Reply parent must be an active top-level comment on this defect");
      }
      const content = dto.content.trim();
      if (!content) throw new BadRequestException("Comment content must not be blank");
      const comment = await tx.defectComment.create({
        data: { defectId, authorId: actorId, parentId: dto.parentId, content },
        include: { author: { select: userSelect } },
      });
      await Promise.all([
        tx.auditLog.create({
          data: {
            organizationId,
            projectSpaceId,
            actorId,
            action: dto.parentId ? "defect.reply.create" : "defect.comment.create",
            resourceType: "DefectComment",
            resourceId: comment.id,
            metadata: this.json({ defectId }),
          },
        }),
        tx.outboxEvent.create({
          data: {
            aggregateType: "Defect",
            aggregateId: defectId,
            eventType: dto.parentId ? "DefectReplyCreated" : "DefectCommentCreated",
            payload: this.json({ organizationId, projectSpaceId, defectId, commentId: comment.id }),
          },
        }),
      ]);
      return comment;
    });
  }

  async deleteComment(
    organizationId: string,
    projectSpaceId: string,
    defectId: string,
    commentId: string,
    actorId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const comment = await tx.defectComment.findFirst({
        where: { id: commentId, defectId, defect: { projectSpaceId }, deletedAt: null },
      });
      if (!comment) throw new NotFoundException("Comment not found");
      if (comment.authorId !== actorId) throw new ForbiddenException("Only the comment author can delete this comment");
      await tx.defectComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          organizationId,
          projectSpaceId,
          actorId,
          action: "defect.comment.delete",
          resourceType: "DefectComment",
          resourceId: commentId,
          metadata: this.json({ defectId }),
        },
      });
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
      const current = await tx.defect.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Defect not found");
      const result = await tx.defect.updateMany({
        where: { id, projectSpaceId, version, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException("Defect was modified by another user");
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        defectId: id,
        action: "DELETE",
        eventType: "DefectDeleted",
        fromVersion: current.version,
        toVersion: current.version + 1,
        changes: { deleted: true },
      });
    });
  }

  async history(projectSpaceId: string, id: string) {
    const exists = await this.prisma.defect.findFirst({ where: { id, projectSpaceId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Defect not found");
    return this.prisma.defectHistory.findMany({
      where: { defectId: id },
      include: { actor: { select: userSelect } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  }

  private async validateRelations(
    tx: Prisma.TransactionClient,
    projectSpaceId: string,
    input: {
      assigneeId?: string | null;
      iterationId?: string | null;
      requirementIds?: string[];
      testCaseIds?: string[];
    },
  ): Promise<void> {
    if (input.assigneeId) {
      const member = await tx.projectMember.findUnique({
        where: { projectSpaceId_userId: { projectSpaceId, userId: input.assigneeId } },
        select: { status: true },
      });
      if (member?.status !== MembershipStatus.ACTIVE) {
        throw new BadRequestException("Assignee must be an active project-space member");
      }
    }
    if (input.iterationId) {
      const count = await tx.iteration.count({ where: { id: input.iterationId, projectSpaceId } });
      if (count !== 1) throw new BadRequestException("Iteration does not belong to this project space");
    }
    if (input.requirementIds?.length) {
      const unique = [...new Set(input.requirementIds)];
      const count = await tx.requirement.count({ where: { id: { in: unique }, projectSpaceId, deletedAt: null } });
      if (count !== unique.length) throw new BadRequestException("One or more requirements do not belong to this project space");
    }
    if (input.testCaseIds?.length) {
      const unique = [...new Set(input.testCaseIds)];
      const count = await tx.testCase.count({ where: { id: { in: unique }, projectSpaceId, deletedAt: null } });
      if (count !== unique.length) throw new BadRequestException("One or more test cases do not belong to this project space");
    }
  }

  private async recordMutation(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      projectSpaceId: string;
      actorId: string;
      defectId: string;
      action: string;
      eventType: string;
      fromVersion?: number;
      toVersion: number;
      changes: unknown;
    },
  ): Promise<void> {
    await Promise.all([
      tx.defectHistory.create({
        data: {
          defectId: input.defectId,
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
          action: `defect.${input.action.toLowerCase()}`,
          resourceType: "Defect",
          resourceId: input.defectId,
          metadata: this.json({ fromVersion: input.fromVersion, toVersion: input.toVersion }),
        },
      }),
      tx.outboxEvent.create({
        data: {
          aggregateType: "Defect",
          aggregateId: input.defectId,
          eventType: input.eventType,
          payload: this.json({
            organizationId: input.organizationId,
            projectSpaceId: input.projectSpaceId,
            defectId: input.defectId,
            changes: input.changes,
          }),
        },
      }),
    ]);
  }

  private normalizeLabels(labels: string[] | undefined): string[] | undefined {
    return labels ? [...new Set(labels.map((label) => label.trim()).filter(Boolean))] : undefined;
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
