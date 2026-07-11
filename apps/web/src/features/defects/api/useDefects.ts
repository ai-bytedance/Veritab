import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { DefectComment, DefectSeverity, DefectStatus, Issue, IssueType } from "../../../types";
import { CreateDefectInput, defectsApi, UpdateDefectInput } from "./defectsApi";
import {
  ApiDefect,
  ApiDefectComment,
  ApiDefectSeverity,
  ApiDefectStatus,
  DefectApiScope,
  DefectFilters,
  DefectPage,
} from "./types";

const statusToUi: Record<ApiDefectStatus, DefectStatus> = {
  OPEN: DefectStatus.NEW,
  CONFIRMED: DefectStatus.CONFIRMED,
  IN_PROGRESS: DefectStatus.PROCESSING,
  RESOLVED: DefectStatus.RESOLVED,
  VERIFIED: DefectStatus.VERIFIED,
  CLOSED: DefectStatus.CLOSED,
  REJECTED: DefectStatus.REJECTED,
  REOPENED: DefectStatus.REOPEN,
};

export const statusToApi: Record<DefectStatus, ApiDefectStatus> = {
  [DefectStatus.NEW]: "OPEN",
  [DefectStatus.CONFIRMED]: "CONFIRMED",
  [DefectStatus.PROCESSING]: "IN_PROGRESS",
  [DefectStatus.RESOLVED]: "RESOLVED",
  [DefectStatus.VERIFIED]: "VERIFIED",
  [DefectStatus.CLOSED]: "CLOSED",
  [DefectStatus.REJECTED]: "REJECTED",
  [DefectStatus.REOPEN]: "REOPENED",
};

const severityToUi: Record<ApiDefectSeverity, DefectSeverity> = {
  BLOCKER: DefectSeverity.FATAL,
  CRITICAL: DefectSeverity.SERIOUS,
  MAJOR: DefectSeverity.NORMAL,
  MINOR: DefectSeverity.PROMPT,
  TRIVIAL: DefectSeverity.PROMPT,
};

export const severityToApi: Record<DefectSeverity, ApiDefectSeverity> = {
  [DefectSeverity.FATAL]: "BLOCKER",
  [DefectSeverity.SERIOUS]: "CRITICAL",
  [DefectSeverity.NORMAL]: "MAJOR",
  [DefectSeverity.PROMPT]: "MINOR",
};

function key(scope: DefectApiScope | undefined, filters: DefectFilters) {
  return ["defects", scope?.organizationId, scope?.projectSpaceId, filters] as const;
}

function useDefectsPage(scope: DefectApiScope | undefined, filters: DefectFilters) {
  return useQuery({
    queryKey: key(scope, filters),
    queryFn: () => defectsApi.list(scope!, filters),
    enabled: Boolean(scope),
    placeholderData: (previous) => previous,
  });
}

function toComment(comment: ApiDefectComment): DefectComment {
  return {
    id: comment.id,
    userId: comment.authorId,
    userName: comment.author.displayName,
    content: comment.content,
    createdAt: comment.createdAt,
    replies: (comment.replies || []).map((reply) => ({
      id: reply.id,
      userId: reply.authorId,
      userName: reply.author.displayName,
      content: reply.content,
      createdAt: reply.createdAt,
      replyToUserName: comment.author.displayName,
    })),
  };
}

function toIssue(defect: ApiDefect, projectId: string): Issue {
  return {
    id: defect.id,
    displayNo: defect.displayNo,
    version: defect.version,
    projectId,
    type: IssueType.DEFECT,
    title: defect.title,
    content: defect.description || "",
    severity: severityToUi[defect.severity],
    defectStatus: statusToUi[defect.status],
    creatorId: defect.creatorId,
    assigneeId: defect.assigneeId || undefined,
    environment: defect.environment || undefined,
    precondition: defect.precondition || undefined,
    steps: defect.reproductionSteps || undefined,
    expectedResult: defect.expectedResult || undefined,
    actualResult: defect.actualResult || undefined,
    resolution: defect.resolution || undefined,
    detectedVersion: defect.detectedVersion || undefined,
    fixedVersion: defect.fixedVersion || undefined,
    labels: defect.labels,
    linkToRequirements: defect.requirementLinks.map((link) => link.requirementId),
    linkToTestCases: defect.testCaseLinks.map((link) => link.testCaseId),
    comments: defect.comments.map(toComment),
    createdAt: defect.createdAt,
    updatedAt: defect.updatedAt,
  };
}

function createInput(issue: Issue): CreateDefectInput {
  return {
    title: issue.title,
    description: issue.content,
    severity: severityToApi[issue.severity || DefectSeverity.NORMAL],
    environment: issue.environment,
    precondition: issue.precondition,
    reproductionSteps: issue.steps,
    expectedResult: issue.expectedResult,
    actualResult: issue.actualResult,
    assigneeId: issue.assigneeId,
    detectedVersion: issue.detectedVersion,
    labels: issue.labels,
    requirementIds: issue.linkToRequirements || [],
    testCaseIds: issue.linkToTestCases || [],
  };
}

function updateInput(issue: Issue, version: number): UpdateDefectInput {
  const { requirementIds: _requirements, testCaseIds: _cases, ...attributes } = createInput(issue);
  return { ...attributes, version, resolution: issue.resolution, fixedVersion: issue.fixedVersion };
}

function hasAttributeChanges(current: ApiDefect, target: Issue): boolean {
  return (
    current.title !== target.title ||
    (current.description || "") !== target.content ||
    current.severity !== severityToApi[target.severity || DefectSeverity.NORMAL] ||
    (current.assigneeId || undefined) !== target.assigneeId ||
    (current.environment || undefined) !== target.environment ||
    (current.precondition || undefined) !== target.precondition ||
    (current.reproductionSteps || undefined) !== target.steps ||
    (current.expectedResult || undefined) !== target.expectedResult ||
    (current.actualResult || undefined) !== target.actualResult ||
    (current.resolution || undefined) !== target.resolution ||
    (current.detectedVersion || undefined) !== target.detectedVersion ||
    (current.fixedVersion || undefined) !== target.fixedVersion ||
    JSON.stringify(current.labels) !== JSON.stringify(target.labels || [])
  );
}

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((item, index) => item === sortedRight[index]);
}

async function syncComments(scope: DefectApiScope, current: ApiDefect, target: Issue): Promise<boolean> {
  const targetComments = target.comments || [];
  const currentTop = current.comments;
  const currentIds = new Set(currentTop.flatMap((comment) => [comment.id, ...(comment.replies || []).map((r) => r.id)]));
  let changed = false;

  for (const comment of currentTop) {
    const targetComment = targetComments.find((candidate) => candidate.id === comment.id);
    if (!targetComment) {
      await defectsApi.deleteComment(scope, current.id, comment.id);
      changed = true;
      continue;
    }
    const targetReplyIds = new Set((targetComment.replies || []).map((reply) => reply.id));
    for (const reply of comment.replies || []) {
      if (!targetReplyIds.has(reply.id)) {
        await defectsApi.deleteComment(scope, current.id, reply.id);
        changed = true;
      }
    }
  }

  for (const comment of targetComments) {
    let parentId = comment.id;
    if (!currentIds.has(comment.id)) {
      const created = await defectsApi.addComment(scope, current.id, comment.content);
      parentId = created.id;
      changed = true;
    }
    for (const reply of comment.replies || []) {
      if (!currentIds.has(reply.id)) {
        await defectsApi.addComment(scope, current.id, reply.content, parentId);
        changed = true;
      }
    }
  }
  return changed;
}

export function useDefectBridge(
  scope: DefectApiScope | undefined,
  projectId: string,
  requestedFilters: DefectFilters = {},
) {
  const filters: DefectFilters = { limit: 100, ...requestedFilters };
  const query = useDefectsPage(scope, filters);
  const queryClient = useQueryClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queryKey = key(scope, filters);

  const createMutation = useMutation({
    mutationFn: (issue: Issue) => defectsApi.create(scope!, createInput(issue)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["defects", scope?.organizationId, scope?.projectSpaceId] }),
  });
  const updateMutation = useMutation({
    scope: { id: "defects-write-queue" },
    mutationFn: async (issue: Issue) => {
      const page = queryClient.getQueryData<DefectPage>(queryKey);
      const current = page?.items.find((item) => item.id === issue.id);
      if (!current) throw new Error("Defect is no longer present in the current server page");
      let updated = current;
      if (hasAttributeChanges(current, issue)) {
        updated = await defectsApi.update(scope!, issue.id, updateInput(issue, updated.version));
      }
      const targetStatus = statusToApi[issue.defectStatus || DefectStatus.NEW];
      if (updated.status !== targetStatus) {
        updated = await defectsApi.transition(scope!, issue.id, targetStatus, updated.version);
      }
      const requirementIds = issue.linkToRequirements || [];
      const testCaseIds = issue.linkToTestCases || [];
      const currentRequirements = updated.requirementLinks.map((link) => link.requirementId);
      const currentCases = updated.testCaseLinks.map((link) => link.testCaseId);
      if (!sameSet(requirementIds, currentRequirements) || !sameSet(testCaseIds, currentCases)) {
        updated = await defectsApi.syncLinks(scope!, issue.id, updated.version, requirementIds, testCaseIds);
      }
      if (await syncComments(scope!, updated, issue)) {
        updated = await defectsApi.get(scope!, issue.id);
      }
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<DefectPage>(queryKey, (page) =>
        page ? { ...page, items: page.items.map((item) => (item.id === updated.id ? updated : item)) } : page,
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const page = queryClient.getQueryData<DefectPage>(queryKey);
      const current = page?.items.find((item) => item.id === id);
      if (!current) throw new Error("Defect is no longer present in the current server page");
      await defectsApi.remove(scope!, id, current.version);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<DefectPage>(queryKey, (page) =>
        page ? { ...page, items: page.items.filter((item) => item.id !== id) } : page,
      );
    },
  });

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const queueUpdate = (issue: Issue) => {
    const timer = timers.current.get(issue.id);
    if (timer) clearTimeout(timer);
    timers.current.set(
      issue.id,
      setTimeout(() => {
        timers.current.delete(issue.id);
        updateMutation.mutate(issue);
      }, 500),
    );
  };

  return {
    issues: (query.data?.items || []).map((item) => toIssue(item, projectId)),
    total: query.data?.pageInfo.total || 0,
    statusCounts: query.data?.statusCounts || {},
    severityCounts: query.data?.severityCounts || {},
    isLoading: query.isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: query.error || createMutation.error || updateMutation.error || deleteMutation.error,
    createIssue: (issue: Issue) => createMutation.mutate(issue),
    updateIssue: queueUpdate,
    deleteIssue: (id: string) => deleteMutation.mutate(id),
  };
}
