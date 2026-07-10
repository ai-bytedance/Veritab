import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MembershipStatus, Prisma, TestResultStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateTestCaseDto } from "./dto/create-test-case.dto";
import { ExecuteTestCaseDto } from "./dto/execute-test-case.dto";
import { ListTestCasesQuery } from "./dto/list-test-cases.query";
import { SyncTestCaseFoldersDto, TestCaseFolderInputDto } from "./dto/sync-test-case-folders.dto";
import { UpdateTestCaseDto } from "./dto/update-test-case.dto";

const userSelect = { id: true, username: true, displayName: true } as const;
const testCaseInclude = Prisma.validator<Prisma.TestCaseInclude>()({
  creator: { select: userSelect },
  assignee: { select: userSelect },
  requirement: { select: { id: true, displayNo: true, title: true } },
  folder: { select: { id: true, clientKey: true, name: true } },
  defectLinks: { include: { defect: { select: { id: true, displayNo: true, title: true, status: true } } } },
});

@Injectable()
export class TestCasesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectSpaceId: string, query: ListTestCasesQuery) {
    const where: Prisma.TestCaseWhereInput = {
      projectSpaceId,
      deletedAt: null,
      ...(query.grade ? { grade: query.grade } : {}),
      ...(query.lifecycleStatus ? { status: query.lifecycleStatus } : {}),
      ...(query.executionStatus ? { executionStatus: query.executionStatus } : {}),
      ...(query.requirementId ? { requirementId: query.requirementId } : {}),
      ...(query.folderKey ? { folder: { clientKey: query.folderKey } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { displayNo: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { steps: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };
    const [items, total, resultGroups, gradeGroups, catalog] = await Promise.all([
      this.prisma.testCase.findMany({
        where,
        include: testCaseInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.testCase.count({ where }),
      this.prisma.testCase.groupBy({
        by: ["executionStatus"],
        where: { projectSpaceId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.testCase.groupBy({
        by: ["grade"],
        where: { projectSpaceId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.testCaseCatalog.findUnique({ where: { projectSpaceId }, select: { version: true } }),
    ]);
    return {
      items,
      pageInfo: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      executionStatusCounts: Object.fromEntries(resultGroups.map((row) => [row.executionStatus, row._count._all])),
      gradeCounts: Object.fromEntries(gradeGroups.map((row) => [row.grade, row._count._all])),
      catalogVersion: catalog?.version ?? 1,
    };
  }

  async get(projectSpaceId: string, id: string) {
    const testCase = await this.prisma.testCase.findFirst({
      where: { id, projectSpaceId, deletedAt: null },
      include: {
        ...testCaseInclude,
        executions: {
          orderBy: { completedAt: "desc" },
          take: 50,
          include: { executedBy: { select: userSelect } },
        },
      },
    });
    if (!testCase) throw new NotFoundException("Test case not found");
    return testCase;
  }

  async mindmap(projectSpaceId: string) {
    const [catalog, folders, testCases, requirements] = await Promise.all([
      this.prisma.testCaseCatalog.findUnique({ where: { projectSpaceId }, select: { version: true, updatedAt: true } }),
      this.prisma.testCaseFolder.findMany({
        where: { projectSpaceId },
        include: { parent: { select: { clientKey: true } } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      this.prisma.testCase.findMany({
        where: { projectSpaceId, deletedAt: null },
        include: testCaseInclude,
        orderBy: [{ folderId: "asc" }, { displayNo: "asc" }],
      }),
      this.prisma.requirement.findMany({
        where: { projectSpaceId, deletedAt: null },
        select: { id: true, displayNo: true, title: true, description: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return {
      version: catalog?.version ?? 1,
      updatedAt: catalog?.updatedAt ?? null,
      folders: folders.map((folder) => ({
        id: folder.clientKey,
        name: folder.name,
        parentId: folder.parent?.clientKey ?? null,
        position: folder.position,
        createdAt: folder.createdAt,
      })),
      testCases,
      requirements,
    };
  }

  async create(organizationId: string, projectSpaceId: string, actorId: string, dto: CreateTestCaseDto) {
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.findFirst({
        where: { id: projectSpaceId, organizationId, archivedAt: null },
        select: { key: true },
      });
      if (!space) throw new NotFoundException("Project space not found");
      const relations = await this.resolveRelations(tx, projectSpaceId, dto);
      const counter = await tx.projectCounter.upsert({
        where: { projectSpaceId },
        create: { projectSpaceId, testCaseNext: 2 },
        update: { testCaseNext: { increment: 1 } },
        select: { testCaseNext: true },
      });
      const sequence = counter.testCaseNext - 1;
      const testCase = await tx.testCase.create({
        data: {
          projectSpaceId,
          creatorId: actorId,
          displayNo: `${space.key}-TC-${String(sequence).padStart(6, "0")}`,
          title: dto.title.trim(),
          grade: dto.grade,
          status: dto.lifecycleStatus,
          precondition: dto.precondition,
          steps: dto.steps,
          expectedResult: dto.expectedResult,
          requirementId: dto.requirementId,
          folderId: relations.folderId,
          assigneeId: dto.assigneeId,
          releaseVersion: dto.releaseVersion,
          tags: this.normalizeTags(dto.tags),
          module: dto.module,
          isMindmapMode: dto.isMindmapMode,
          customFields: dto.customFields ? this.json(dto.customFields) : undefined,
          defectLinks: relations.linkedDefectId
            ? { create: { defectId: relations.linkedDefectId } }
            : undefined,
        },
        include: testCaseInclude,
      });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        testCaseId: testCase.id,
        action: "CREATE",
        eventType: "TestCaseCreated",
        toVersion: testCase.version,
        changes: { displayNo: testCase.displayNo, grade: testCase.grade },
      });
      return testCase;
    });
  }

  async update(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    dto: UpdateTestCaseDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testCase.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Test case not found");
      const relations = await this.resolveRelations(tx, projectSpaceId, dto);
      const result = await tx.testCase.updateMany({
        where: { id, projectSpaceId, version: dto.version, deletedAt: null },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.grade !== undefined ? { grade: dto.grade } : {}),
          ...(dto.lifecycleStatus !== undefined ? { status: dto.lifecycleStatus } : {}),
          ...(dto.precondition !== undefined ? { precondition: dto.precondition } : {}),
          ...(dto.steps !== undefined ? { steps: dto.steps } : {}),
          ...(dto.expectedResult !== undefined ? { expectedResult: dto.expectedResult } : {}),
          ...(dto.requirementId !== undefined ? { requirementId: dto.requirementId } : {}),
          ...(dto.folderKey !== undefined ? { folderId: relations.folderId } : {}),
          ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
          ...(dto.releaseVersion !== undefined ? { releaseVersion: dto.releaseVersion } : {}),
          ...(dto.tags !== undefined ? { tags: this.normalizeTags(dto.tags) } : {}),
          ...(dto.module !== undefined ? { module: dto.module } : {}),
          ...(dto.isMindmapMode !== undefined ? { isMindmapMode: dto.isMindmapMode } : {}),
          ...(dto.customFields !== undefined
            ? { customFields: dto.customFields ? this.json(dto.customFields) : Prisma.DbNull }
            : {}),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) throw new ConflictException("Test case was modified by another user");
      if (dto.linkedDefectId !== undefined) {
        await tx.defectTestCaseLink.deleteMany({ where: { testCaseId: id } });
        if (relations.linkedDefectId) {
          await tx.defectTestCaseLink.create({ data: { testCaseId: id, defectId: relations.linkedDefectId } });
        }
      }
      const updated = await tx.testCase.findUniqueOrThrow({ where: { id }, include: testCaseInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        testCaseId: id,
        action: "UPDATE",
        eventType: "TestCaseUpdated",
        fromVersion: current.version,
        toVersion: updated.version,
        changes: { patch: dto },
      });
      return updated;
    });
  }

  async execute(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    dto: ExecuteTestCaseDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.testCase.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Test case not found");
      const result = await tx.testCase.updateMany({
        where: { id, projectSpaceId, version: dto.version, deletedAt: null },
        data: {
          executionStatus: dto.status,
          actualResult: dto.actualResult,
          stepResults: dto.stepResults ? this.json(dto.stepResults) : Prisma.DbNull,
          stepNotes: dto.stepNotes ? this.json(dto.stepNotes) : Prisma.DbNull,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) throw new ConflictException("Test case was modified by another user");
      const execution = await tx.testCaseExecution.create({
        data: {
          testCaseId: id,
          executedById: actorId,
          status: dto.status,
          actualResult: dto.actualResult,
          environment: dto.environment,
          stepResults: dto.stepResults ? this.json(dto.stepResults) : undefined,
          stepNotes: dto.stepNotes ? this.json(dto.stepNotes) : undefined,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        },
      });
      const updated = await tx.testCase.findUniqueOrThrow({ where: { id }, include: testCaseInclude });
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        testCaseId: id,
        action: "EXECUTE",
        eventType: "TestCaseExecuted",
        fromVersion: current.version,
        toVersion: updated.version,
        changes: { executionId: execution.id, status: dto.status },
      });
      return { testCase: updated, execution };
    });
  }

  async syncFolders(
    organizationId: string,
    projectSpaceId: string,
    actorId: string,
    dto: SyncTestCaseFoldersDto,
  ) {
    const ordered = this.validateAndOrderFolders(dto.folders);
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.findFirst({
        where: { id: projectSpaceId, organizationId, archivedAt: null },
        select: { id: true },
      });
      if (!space) throw new NotFoundException("Project space not found");
      const catalog = await tx.testCaseCatalog.findUnique({ where: { projectSpaceId } });
      let nextVersion: number;
      if (!catalog) {
        if (dto.version !== 1) throw new ConflictException("Test-case catalog version is stale");
        const created = await tx.testCaseCatalog.create({
          data: { projectSpaceId, version: 2, updatedById: actorId },
        });
        nextVersion = created.version;
      } else {
        const updated = await tx.testCaseCatalog.updateMany({
          where: { projectSpaceId, version: dto.version },
          data: { version: { increment: 1 }, updatedById: actorId },
        });
        if (updated.count !== 1) throw new ConflictException("Test-case catalog version is stale");
        nextVersion = dto.version + 1;
      }

      const existing = await tx.testCaseFolder.findMany({ where: { projectSpaceId } });
      const ids = new Map(existing.map((folder) => [folder.clientKey, folder.id]));
      for (const folder of ordered) {
        const parentId = folder.parentKey ? ids.get(folder.parentKey) : null;
        const saved = await tx.testCaseFolder.upsert({
          where: { projectSpaceId_clientKey: { projectSpaceId, clientKey: folder.clientKey } },
          create: {
            projectSpaceId,
            clientKey: folder.clientKey,
            name: folder.name.trim(),
            parentId,
            position: folder.position,
          },
          update: { name: folder.name.trim(), parentId, position: folder.position },
        });
        ids.set(folder.clientKey, saved.id);
      }

      const retainedKeys = new Set(dto.folders.map((folder) => folder.clientKey));
      const deletedIds = existing.filter((folder) => !retainedKeys.has(folder.clientKey)).map((folder) => folder.id);
      if (deletedIds.length) {
        await tx.testCase.updateMany({ where: { folderId: { in: deletedIds } }, data: { folderId: null } });
        await tx.testCaseFolder.deleteMany({ where: { id: { in: deletedIds } } });
      }

      await Promise.all([
        tx.auditLog.create({
          data: {
            organizationId,
            projectSpaceId,
            actorId,
            action: "testcase.mindmap.sync",
            resourceType: "TestCaseCatalog",
            resourceId: projectSpaceId,
            metadata: this.json({ fromVersion: dto.version, toVersion: nextVersion, folderCount: dto.folders.length }),
          },
        }),
        tx.outboxEvent.create({
          data: {
            aggregateType: "TestCaseCatalog",
            aggregateId: projectSpaceId,
            eventType: "TestCaseMindmapUpdated",
            payload: this.json({ organizationId, projectSpaceId, version: nextVersion }),
          },
        }),
      ]);
      const folders = await tx.testCaseFolder.findMany({
        where: { projectSpaceId },
        include: { parent: { select: { clientKey: true } } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      return {
        version: nextVersion,
        folders: folders.map((folder) => ({
          id: folder.clientKey,
          name: folder.name,
          parentId: folder.parent?.clientKey ?? null,
          position: folder.position,
          createdAt: folder.createdAt,
        })),
      };
    });
  }

  async history(projectSpaceId: string, id: string) {
    const exists = await this.prisma.testCase.findFirst({ where: { id, projectSpaceId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Test case not found");
    return this.prisma.testCaseHistory.findMany({
      where: { testCaseId: id },
      include: { actor: { select: userSelect } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  }

  async exportData(projectSpaceId: string) {
    const data = await this.mindmap(projectSpaceId);
    return { schemaVersion: 1, exportedAt: new Date(), ...data };
  }

  async remove(
    organizationId: string,
    projectSpaceId: string,
    id: string,
    actorId: string,
    version: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.testCase.findFirst({ where: { id, projectSpaceId, deletedAt: null } });
      if (!current) throw new NotFoundException("Test case not found");
      const result = await tx.testCase.updateMany({
        where: { id, projectSpaceId, version, deletedAt: null },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException("Test case was modified by another user");
      await this.recordMutation(tx, {
        organizationId,
        projectSpaceId,
        actorId,
        testCaseId: id,
        action: "DELETE",
        eventType: "TestCaseDeleted",
        fromVersion: current.version,
        toVersion: current.version + 1,
        changes: { deleted: true },
      });
    });
  }

  private async resolveRelations(
    tx: Prisma.TransactionClient,
    projectSpaceId: string,
    input: {
      requirementId?: string | null;
      folderKey?: string | null;
      assigneeId?: string | null;
      linkedDefectId?: string | null;
    },
  ): Promise<{ folderId?: string | null; linkedDefectId?: string | null }> {
    if (input.requirementId) {
      const count = await tx.requirement.count({
        where: { id: input.requirementId, projectSpaceId, deletedAt: null },
      });
      if (count !== 1) throw new BadRequestException("Requirement does not belong to this project space");
    }
    if (input.assigneeId) {
      const member = await tx.projectMember.findUnique({
        where: { projectSpaceId_userId: { projectSpaceId, userId: input.assigneeId } },
        select: { status: true },
      });
      if (member?.status !== MembershipStatus.ACTIVE) {
        throw new BadRequestException("Assignee must be an active project-space member");
      }
    }
    let folderId: string | null | undefined;
    if (input.folderKey === null) folderId = null;
    else if (input.folderKey) {
      const folder = await tx.testCaseFolder.findUnique({
        where: { projectSpaceId_clientKey: { projectSpaceId, clientKey: input.folderKey } },
        select: { id: true },
      });
      if (!folder) throw new BadRequestException("Folder does not belong to this project space");
      folderId = folder.id;
    }
    let linkedDefectId: string | null | undefined;
    if (input.linkedDefectId === null) linkedDefectId = null;
    else if (input.linkedDefectId) {
      const count = await tx.defect.count({
        where: { id: input.linkedDefectId, projectSpaceId, deletedAt: null },
      });
      if (count !== 1) throw new BadRequestException("Defect does not belong to this project space");
      linkedDefectId = input.linkedDefectId;
    }
    return { folderId, linkedDefectId };
  }

  private validateAndOrderFolders(folders: TestCaseFolderInputDto[]): TestCaseFolderInputDto[] {
    const byKey = new Map<string, TestCaseFolderInputDto>();
    for (const folder of folders) {
      if (byKey.has(folder.clientKey)) throw new BadRequestException(`Duplicate folder key: ${folder.clientKey}`);
      byKey.set(folder.clientKey, folder);
    }
    for (const folder of folders) {
      if (folder.parentKey && !byKey.has(folder.parentKey)) {
        throw new BadRequestException(`Folder parent not found: ${folder.parentKey}`);
      }
      if (folder.parentKey === folder.clientKey) throw new BadRequestException("Folder cannot be its own parent");
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const ordered: TestCaseFolderInputDto[] = [];
    const visit = (folder: TestCaseFolderInputDto): void => {
      if (visited.has(folder.clientKey)) return;
      if (visiting.has(folder.clientKey)) throw new BadRequestException("Folder hierarchy contains a cycle");
      visiting.add(folder.clientKey);
      if (folder.parentKey) visit(byKey.get(folder.parentKey)!);
      visiting.delete(folder.clientKey);
      visited.add(folder.clientKey);
      ordered.push(folder);
    };
    folders.forEach(visit);
    return ordered;
  }

  private normalizeTags(tags?: string[]): string[] | undefined {
    if (tags === undefined) return undefined;
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private async recordMutation(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      projectSpaceId: string;
      actorId: string;
      testCaseId: string;
      action: string;
      eventType: string;
      fromVersion?: number;
      toVersion: number;
      changes: unknown;
    },
  ): Promise<void> {
    await Promise.all([
      tx.testCaseHistory.create({
        data: {
          testCaseId: input.testCaseId,
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
          action: `testcase.${input.action.toLowerCase()}`,
          resourceType: "TestCase",
          resourceId: input.testCaseId,
          metadata: this.json({ fromVersion: input.fromVersion, toVersion: input.toVersion }),
        },
      }),
      tx.outboxEvent.create({
        data: {
          aggregateType: "TestCase",
          aggregateId: input.testCaseId,
          eventType: input.eventType,
          payload: this.json({
            organizationId: input.organizationId,
            projectSpaceId: input.projectSpaceId,
            testCaseId: input.testCaseId,
            version: input.toVersion,
          }),
        },
      }),
    ]);
  }
}
