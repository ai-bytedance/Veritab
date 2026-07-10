export type ApiRequirementStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "IN_PROGRESS"
  | "TESTING"
  | "ACCEPTING"
  | "DONE"
  | "CANCELLED";

export type ApiRequirementPriority = "P0" | "P1" | "P2" | "P3";
export type ApiRequirementType = "EPIC" | "FEATURE" | "STORY" | "TASK";

export interface RequirementApiScope {
  organizationId: string;
  projectSpaceId: string;
}

export interface ApiRequirement {
  id: string;
  projectSpaceId: string;
  displayNo: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  type: ApiRequirementType;
  status: ApiRequirementStatus;
  priority: ApiRequirementPriority;
  creatorId: string;
  assigneeId: string | null;
  iterationId: string | null;
  parentId: string | null;
  storyPoints: number | null;
  labels: string[];
  sortOrder: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  dueAt: string | null;
  customFields: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  availableTransitions?: ApiRequirementStatus[];
}

export interface RequirementPage {
  items: ApiRequirement[];
  pageInfo: {
    hasNext: boolean;
    nextCursor: string | null;
    limit: number;
    total: number;
    page: number | null;
    totalPages: number | null;
  };
  statusCounts: Partial<Record<ApiRequirementStatus, number>>;
}

export interface RequirementFilters {
  limit?: number;
  cursor?: string;
  page?: number;
  q?: string;
  status?: ApiRequirementStatus;
  priority?: ApiRequirementPriority;
  type?: ApiRequirementType;
  assigneeId?: string;
  creatorId?: string;
  iterationId?: string;
  sortBy?: "updatedAt" | "createdAt" | "priority" | "sortOrder";
  sortDirection?: "asc" | "desc";
}
