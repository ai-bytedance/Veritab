import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateGitRepositoryDto } from "./dto/create-git-repository.dto";
import { ImportGitChangesDto } from "./dto/import-git-changes.dto";
import { ListCodeChangesQuery } from "./dto/list-code-changes.query";
import { SyncCodeChangeLinksDto } from "./dto/sync-code-change-links.dto";
import { UpdateGitRepositoryDto } from "./dto/update-git-repository.dto";

const changeInclude = Prisma.validator<Prisma.CodeChangeInclude>()({
  repository: { select: { id: true, name: true, provider: true, webUrl: true } },
  files: { orderBy: { path: "asc" } },
  requirementLinks: { include: { requirement: { select: { id: true, displayNo: true, title: true } } } },
  defectLinks: { include: { defect: { select: { id: true, displayNo: true, title: true, status: true } } } },
  testCaseLinks: { include: { testCase: { select: { id: true, displayNo: true, title: true } } } },
  pullRequests: { select: { id: true, number: true, title: true, status: true, webUrl: true } },
});

@Injectable()
export class GitIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  listRepositories(projectSpaceId: string) {
    return this.prisma.gitRepository.findMany({
      where: { projectSpaceId },
      select: {
        id: true,
        provider: true,
        repositoryKey: true,
        name: true,
        webUrl: true,
        defaultBranch: true,
        status: true,
        lastSyncedAt: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        credentialRef: true,
      },
      orderBy: { updatedAt: "desc" },
    }).then((items) => items.map(({ credentialRef, ...item }) => ({ ...item, credentialConfigured: Boolean(credentialRef) })));
  }

  async createRepository(organizationId: string, projectSpaceId: string, actorId: string, dto: CreateGitRepositoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.projectSpace.count({ where: { id: projectSpaceId, organizationId, archivedAt: null } });
      if (space !== 1) throw new NotFoundException("Project space not found");
      const repository = await tx.gitRepository.create({
        data: {
          projectSpaceId,
          provider: dto.provider,
          repositoryKey: dto.repositoryKey,
          name: dto.name.trim(),
          webUrl: dto.webUrl,
          defaultBranch: dto.defaultBranch,
          credentialRef: dto.credentialRef,
        },
      }).catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Repository is already connected to this project space");
        }
        throw error;
      });
      await this.record(tx, organizationId, projectSpaceId, actorId, "git.repository.create", "GitRepository", repository.id, "GitRepositoryConnected", { repositoryId: repository.id });
      return this.repositoryView(repository);
    });
  }

  async updateRepository(organizationId: string, projectSpaceId: string, id: string, actorId: string, dto: UpdateGitRepositoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.gitRepository.updateMany({
        where: { id, projectSpaceId, version: dto.version },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.webUrl !== undefined ? { webUrl: dto.webUrl } : {}),
          ...(dto.defaultBranch !== undefined ? { defaultBranch: dto.defaultBranch } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.credentialRef !== undefined ? { credentialRef: dto.credentialRef } : {}),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        const exists = await tx.gitRepository.count({ where: { id, projectSpaceId } });
        if (!exists) throw new NotFoundException("Repository not found");
        throw new ConflictException("Repository configuration was modified by another user");
      }
      const repository = await tx.gitRepository.findUniqueOrThrow({ where: { id } });
      await this.record(tx, organizationId, projectSpaceId, actorId, "git.repository.update", "GitRepository", id, "GitRepositoryUpdated", { repositoryId: id, version: repository.version });
      return this.repositoryView(repository);
    });
  }

  async disconnectRepository(organizationId: string, projectSpaceId: string, id: string, actorId: string, version: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const repository = await tx.gitRepository.findFirst({ where: { id, projectSpaceId } });
      if (!repository) throw new NotFoundException("Repository not found");
      if (repository.version !== version) throw new ConflictException("Repository configuration was modified by another user");
      await this.record(tx, organizationId, projectSpaceId, actorId, "git.repository.disconnect", "GitRepository", id, "GitRepositoryDisconnected", { repositoryId: id, repositoryKey: repository.repositoryKey });
      await tx.codeChange.deleteMany({ where: { repositoryId: id } });
      await tx.gitRepository.delete({ where: { id } });
    });
  }

  async listChanges(projectSpaceId: string, query: ListCodeChangesQuery) {
    const where: Prisma.CodeChangeWhereInput = {
      projectSpaceId,
      // Production views only expose changes owned by an active repository.
      // Ignore orphaned changes so an unconfigured workspace never appears connected.
      repositoryId: query.repositoryId ?? { not: null },
      ...(query.branch ? { branch: query.branch } : {}),
      ...(query.q ? { OR: [
        { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
        { commitSha: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
        { authorName: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
      ] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.codeChange.findMany({ where, include: changeInclude, orderBy: [{ committedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.codeChange.count({ where }),
    ]);
    return { items, pageInfo: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async getChange(projectSpaceId: string, id: string) {
    const change = await this.prisma.codeChange.findFirst({ where: { id, projectSpaceId }, include: changeInclude });
    if (!change) throw new NotFoundException("Code change not found");
    return change;
  }

  listPullRequests(projectSpaceId: string, repositoryId?: string) {
    return this.prisma.pullRequest.findMany({
      where: { projectSpaceId, ...(repositoryId ? { repositoryId } : {}) },
      include: { repository: { select: { id: true, name: true, provider: true } }, mergeCommit: { select: { id: true, commitSha: true, title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  async importChanges(organizationId: string, projectSpaceId: string, repositoryId: string, actorId: string, dto: ImportGitChangesDto) {
    return this.prisma.$transaction(async (tx) => {
      const repository = await tx.gitRepository.findFirst({ where: { id: repositoryId, projectSpaceId } });
      if (!repository) throw new NotFoundException("Repository not found");
      const duplicate = await tx.gitWebhookEvent.findUnique({ where: { repositoryId_deliveryId: { repositoryId, deliveryId: dto.deliveryId } } });
      if (duplicate) return { duplicate: true, importedCommits: 0, importedPullRequests: 0 };
      const payloadHash = createHash("sha256").update(JSON.stringify(dto)).digest("hex");
      await tx.gitWebhookEvent.create({ data: { repositoryId, deliveryId: dto.deliveryId, eventType: dto.eventType, payloadHash } });

      const commits = new Map<string, string>();
      for (const commit of dto.commits) {
        const additions = commit.files.reduce((sum, file) => sum + file.additions, 0);
        const deletions = commit.files.reduce((sum, file) => sum + file.deletions, 0);
        const change = await tx.codeChange.upsert({
          where: { provider_repositoryKey_commitSha: { provider: repository.provider, repositoryKey: repository.repositoryKey, commitSha: commit.sha } },
          create: {
            projectSpaceId,
            repositoryId,
            provider: repository.provider,
            repositoryKey: repository.repositoryKey,
            commitSha: commit.sha,
            title: commit.title,
            branch: commit.branch,
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            additions,
            deletions,
            filesChanged: commit.files.length,
            webUrl: commit.webUrl,
            committedAt: new Date(commit.committedAt),
            metadata: commit.metadata ? this.json(commit.metadata) : undefined,
          },
          update: { repositoryId, title: commit.title, branch: commit.branch, authorName: commit.authorName, authorEmail: commit.authorEmail, additions, deletions, filesChanged: commit.files.length, webUrl: commit.webUrl, committedAt: new Date(commit.committedAt), metadata: commit.metadata ? this.json(commit.metadata) : undefined },
        });
        commits.set(commit.sha, change.id);
        await tx.codeChangeFile.deleteMany({ where: { codeChangeId: change.id } });
        if (commit.files.length) await tx.codeChangeFile.createMany({ data: commit.files.map((file) => ({ codeChangeId: change.id, path: file.path, status: file.status, additions: file.additions, deletions: file.deletions, patch: file.patch })) });
      }

      for (const pullRequest of dto.pullRequests || []) {
        const mergeCommitId = pullRequest.mergeCommitSha ? commits.get(pullRequest.mergeCommitSha) ?? (await tx.codeChange.findFirst({ where: { repositoryId, commitSha: pullRequest.mergeCommitSha }, select: { id: true } }))?.id : undefined;
        await tx.pullRequest.upsert({
          where: { repositoryId_externalId: { repositoryId, externalId: pullRequest.externalId } },
          create: { projectSpaceId, repositoryId, mergeCommitId, externalId: pullRequest.externalId, number: pullRequest.number, title: pullRequest.title, status: pullRequest.status, sourceBranch: pullRequest.sourceBranch, targetBranch: pullRequest.targetBranch, authorName: pullRequest.authorName, webUrl: pullRequest.webUrl, openedAt: pullRequest.openedAt ? new Date(pullRequest.openedAt) : undefined, mergedAt: pullRequest.mergedAt ? new Date(pullRequest.mergedAt) : undefined, closedAt: pullRequest.closedAt ? new Date(pullRequest.closedAt) : undefined, metadata: pullRequest.metadata ? this.json(pullRequest.metadata) : undefined },
          update: { mergeCommitId, title: pullRequest.title, status: pullRequest.status, sourceBranch: pullRequest.sourceBranch, targetBranch: pullRequest.targetBranch, authorName: pullRequest.authorName, webUrl: pullRequest.webUrl, openedAt: pullRequest.openedAt ? new Date(pullRequest.openedAt) : undefined, mergedAt: pullRequest.mergedAt ? new Date(pullRequest.mergedAt) : undefined, closedAt: pullRequest.closedAt ? new Date(pullRequest.closedAt) : undefined, metadata: pullRequest.metadata ? this.json(pullRequest.metadata) : undefined },
        });
      }
      await tx.gitWebhookEvent.update({ where: { repositoryId_deliveryId: { repositoryId, deliveryId: dto.deliveryId } }, data: { processedAt: new Date() } });
      await tx.gitRepository.update({ where: { id: repositoryId }, data: { lastSyncedAt: new Date() } });
      await this.record(tx, organizationId, projectSpaceId, actorId, "git.changes.import", "GitRepository", repositoryId, "GitChangesImported", { repositoryId, deliveryId: dto.deliveryId, commitCount: dto.commits.length, pullRequestCount: dto.pullRequests?.length || 0 });
      return { duplicate: false, importedCommits: dto.commits.length, importedPullRequests: dto.pullRequests?.length || 0 };
    });
  }

  async syncLinks(organizationId: string, projectSpaceId: string, changeId: string, actorId: string, dto: SyncCodeChangeLinksDto) {
    return this.prisma.$transaction(async (tx) => {
      const change = await tx.codeChange.findFirst({ where: { id: changeId, projectSpaceId }, select: { id: true } });
      if (!change) throw new NotFoundException("Code change not found");
      await Promise.all([
        this.assertEntityIds(tx.requirement, projectSpaceId, dto.requirementIds, "requirements"),
        this.assertEntityIds(tx.defect, projectSpaceId, dto.defectIds, "defects"),
        this.assertEntityIds(tx.testCase, projectSpaceId, dto.testCaseIds, "test cases"),
      ]);
      await Promise.all([
        tx.codeChangeRequirementLink.deleteMany({ where: { codeChangeId: changeId } }),
        tx.codeChangeDefectLink.deleteMany({ where: { codeChangeId: changeId } }),
        tx.codeChangeTestCaseLink.deleteMany({ where: { codeChangeId: changeId } }),
      ]);
      await Promise.all([
        tx.codeChangeRequirementLink.createMany({ data: [...new Set(dto.requirementIds)].map((requirementId) => ({ codeChangeId: changeId, requirementId })) }),
        tx.codeChangeDefectLink.createMany({ data: [...new Set(dto.defectIds)].map((defectId) => ({ codeChangeId: changeId, defectId })) }),
        tx.codeChangeTestCaseLink.createMany({ data: [...new Set(dto.testCaseIds)].map((testCaseId) => ({ codeChangeId: changeId, testCaseId })) }),
      ]);
      await this.record(tx, organizationId, projectSpaceId, actorId, "git.change.links.update", "CodeChange", changeId, "CodeChangeLinksUpdated", { codeChangeId: changeId, ...dto });
      return tx.codeChange.findUniqueOrThrow({ where: { id: changeId }, include: changeInclude });
    });
  }

  private async assertEntityIds(model: { count(args: unknown): Prisma.PrismaPromise<number> }, projectSpaceId: string, ids: string[], label: string): Promise<void> {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const count = await model.count({ where: { id: { in: unique }, projectSpaceId, deletedAt: null } });
    if (count !== unique.length) throw new BadRequestException(`One or more ${label} do not belong to this project space`);
  }

  private repositoryView(repository: { id: string; provider: string; repositoryKey: string; name: string; webUrl: string; defaultBranch: string; credentialRef: string | null; status: string; lastSyncedAt: Date | null; version: number; createdAt: Date; updatedAt: Date }) {
    const { credentialRef, ...view } = repository;
    return { ...view, credentialConfigured: Boolean(credentialRef) };
  }

  private json(value: unknown): Prisma.InputJsonValue { return value as Prisma.InputJsonValue; }

  private async record(tx: Prisma.TransactionClient, organizationId: string, projectSpaceId: string, actorId: string, action: string, resourceType: string, resourceId: string, eventType: string, payload: unknown): Promise<void> {
    await Promise.all([
      tx.auditLog.create({ data: { organizationId, projectSpaceId, actorId, action, resourceType, resourceId, metadata: this.json(payload) } }),
      tx.outboxEvent.create({ data: { aggregateType: resourceType, aggregateId: resourceId, eventType, payload: this.json({ organizationId, projectSpaceId, ...payload as object }) } }),
    ]);
  }
}
