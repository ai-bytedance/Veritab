import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Issue, IssueType, RequirementPriority, RequirementStatus } from "../../../types";
import { CreateRequirementInput, requirementsApi, UpdateRequirementInput } from "./requirementsApi";
import {
  ApiRequirement,
  ApiRequirementPriority,
  ApiRequirementStatus,
  RequirementApiScope,
  RequirementFilters,
  RequirementPage,
} from "./types";

const statusToUi: Record<ApiRequirementStatus, RequirementStatus> = {
  DRAFT: RequirementStatus.DRAFT,
  UNDER_REVIEW: RequirementStatus.UNDER_REVIEW,
  IN_PROGRESS: RequirementStatus.DEVELOPING,
  TESTING: RequirementStatus.TESTING,
  ACCEPTING: RequirementStatus.ACCEPTING,
  DONE: RequirementStatus.COMPLETED,
  CANCELLED: RequirementStatus.CANCELLED,
};

export const statusToApi: Record<RequirementStatus, ApiRequirementStatus> = {
  [RequirementStatus.DRAFT]: "DRAFT",
  [RequirementStatus.UNDER_REVIEW]: "UNDER_REVIEW",
  [RequirementStatus.DEVELOPING]: "IN_PROGRESS",
  [RequirementStatus.TESTING]: "TESTING",
  [RequirementStatus.ACCEPTING]: "ACCEPTING",
  [RequirementStatus.COMPLETED]: "DONE",
  [RequirementStatus.CANCELLED]: "CANCELLED",
};

const priorityToUi: Record<ApiRequirementPriority, RequirementPriority> = {
  P0: RequirementPriority.EP,
  P1: RequirementPriority.HP1,
  P2: RequirementPriority.MP2,
  P3: RequirementPriority.LP3,
};

export const priorityToApi: Record<RequirementPriority, ApiRequirementPriority> = {
  [RequirementPriority.EP]: "P0",
  [RequirementPriority.HP1]: "P1",
  [RequirementPriority.MP2]: "P2",
  [RequirementPriority.LP3]: "P3",
};

function key(scope: RequirementApiScope | undefined, filters: RequirementFilters) {
  return ["requirements", scope?.organizationId, scope?.projectSpaceId, filters] as const;
}

function useRequirementsPage(scope: RequirementApiScope | undefined, filters: RequirementFilters) {
  return useQuery({
    queryKey: key(scope, filters),
    queryFn: () => requirementsApi.list(scope!, filters),
    enabled: Boolean(scope),
    placeholderData: (previous) => previous,
  });
}

function toIssue(requirement: ApiRequirement, projectId: string): Issue {
  return {
    id: requirement.id,
    displayNo: requirement.displayNo,
    version: requirement.version,
    projectId,
    type: IssueType.REQUIREMENT,
    title: requirement.title,
    content: requirement.description || "",
    acceptanceCriteria: requirement.acceptanceCriteria || undefined,
    priority: priorityToUi[requirement.priority],
    requirementStatus: statusToUi[requirement.status],
    assigneeId: requirement.assigneeId || undefined,
    creatorId: requirement.creatorId,
    storyPoints: requirement.storyPoints || undefined,
    labels: requirement.labels,
    estimatedStartTime: requirement.plannedStartAt || undefined,
    estimatedEndTime: requirement.plannedEndAt || undefined,
    createdAt: requirement.createdAt,
    updatedAt: requirement.updatedAt,
  };
}

function createInput(issue: Issue): CreateRequirementInput {
  return {
    title: issue.title,
    description: issue.content,
    acceptanceCriteria: issue.acceptanceCriteria,
    priority: priorityToApi[issue.priority || RequirementPriority.MP2],
    assigneeId: issue.assigneeId,
    storyPoints: issue.storyPoints,
    labels: issue.labels,
    plannedStartAt: issue.estimatedStartTime,
    plannedEndAt: issue.estimatedEndTime,
  };
}

function updateInput(issue: Issue, version: number): UpdateRequirementInput {
  return { ...createInput(issue), version };
}

function hasAttributeChanges(current: ApiRequirement, target: Issue): boolean {
  return (
    current.title !== target.title ||
    (current.description || "") !== target.content ||
    (current.acceptanceCriteria || undefined) !== target.acceptanceCriteria ||
    current.priority !== priorityToApi[target.priority || RequirementPriority.MP2] ||
    (current.assigneeId || undefined) !== target.assigneeId ||
    (current.plannedStartAt || undefined) !== target.estimatedStartTime ||
    (current.plannedEndAt || undefined) !== target.estimatedEndTime ||
    (current.storyPoints || undefined) !== target.storyPoints ||
    JSON.stringify(current.labels) !== JSON.stringify(target.labels || [])
  );
}

export function useRequirementBridge(
  scope: RequirementApiScope | undefined,
  projectId: string,
  requestedFilters: RequirementFilters = {},
) {
  const filters: RequirementFilters = {
    limit: 100,
    sortBy: "updatedAt",
    sortDirection: "desc",
    ...requestedFilters,
  };
  const query = useRequirementsPage(scope, filters);
  const queryClient = useQueryClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queryKey = key(scope, filters);

  const createMutation = useMutation({
    mutationFn: (issue: Issue) => requirementsApi.create(scope!, createInput(issue)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requirements", scope?.organizationId, scope?.projectSpaceId] }),
  });
  const updateMutation = useMutation({
    scope: { id: "requirements-write-queue" },
    mutationFn: async (issue: Issue) => {
      const page = queryClient.getQueryData<RequirementPage>(queryKey);
      const current = page?.items.find((item) => item.id === issue.id);
      if (!current) throw new Error("Requirement is no longer present in the current server page");
      let updated = current;
      if (hasAttributeChanges(current, issue)) {
        updated = await requirementsApi.update(scope!, issue.id, updateInput(issue, current.version));
      }
      const targetStatus = statusToApi[issue.requirementStatus || RequirementStatus.DRAFT];
      if (updated.status !== targetStatus) {
        updated = await requirementsApi.transition(scope!, issue.id, targetStatus, updated.version);
      }
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<RequirementPage>(queryKey, (page) =>
        page ? { ...page, items: page.items.map((item) => (item.id === updated.id ? updated : item)) } : page,
      );
      void queryClient.invalidateQueries({ queryKey: ["resource-history", "requirements", scope?.organizationId, scope?.projectSpaceId, updated.id] });
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const page = queryClient.getQueryData<RequirementPage>(queryKey);
      const current = page?.items.find((item) => item.id === id);
      if (!current) throw new Error("Requirement is no longer present in the current server page");
      await requirementsApi.remove(scope!, id, current.version);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<RequirementPage>(queryKey, (page) =>
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
    const existing = timers.current.get(issue.id);
    if (existing) clearTimeout(existing);
    timers.current.set(
      issue.id,
      setTimeout(() => {
        timers.current.delete(issue.id);
        updateMutation.mutate(issue);
      }, 500),
    );
  };

  const error = query.error || createMutation.error || updateMutation.error || deleteMutation.error;
  return {
    issues: (query.data?.items || []).map((item) => toIssue(item, projectId)),
    total: query.data?.pageInfo.total || 0,
    statusCounts: query.data?.statusCounts || {},
    isLoading: query.isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error,
    createIssue: (issue: Issue) => createMutation.mutate(issue),
    updateIssue: queueUpdate,
    deleteIssue: (id: string) => deleteMutation.mutate(id),
  };
}
