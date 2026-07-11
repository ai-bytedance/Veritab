export type ApiDefectStatus =
  | "OPEN"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "VERIFIED"
  | "CLOSED"
  | "REJECTED"
  | "REOPENED";

export type ApiDefectSeverity = "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR" | "TRIVIAL";
type ApiDefectSource = "MANUAL" | "TEST_EXECUTION" | "CODE_CHANGE" | "IMPORT" | "MONITORING";

export interface DefectApiScope {
  organizationId: string;
  projectSpaceId: string;
}

export interface ApiDefectComment {
  id: string;
  defectId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string; displayName: string };
  replies?: ApiDefectComment[];
}

export interface ApiDefect {
  id: string;
  projectSpaceId: string;
  displayNo: string;
  title: string;
  description: string | null;
  environment: string | null;
  precondition: string | null;
  reproductionSteps: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  resolution: string | null;
  status: ApiDefectStatus;
  severity: ApiDefectSeverity;
  source: ApiDefectSource;
  creatorId: string;
  assigneeId: string | null;
  iterationId: string | null;
  detectedVersion: string | null;
  fixedVersion: string | null;
  labels: string[];
  sortOrder: string;
  dueAt: string | null;
  customFields: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  requirementLinks: Array<{ requirementId: string }>;
  testCaseLinks: Array<{ testCaseId: string }>;
  comments: ApiDefectComment[];
  availableTransitions?: ApiDefectStatus[];
}

export interface DefectPage {
  items: ApiDefect[];
  pageInfo: {
    hasNext: boolean;
    nextCursor: string | null;
    limit: number;
    total: number;
    page: number | null;
    totalPages: number | null;
  };
  statusCounts: Partial<Record<ApiDefectStatus, number>>;
  severityCounts: Partial<Record<ApiDefectSeverity, number>>;
}

export interface DefectFilters {
  limit?: number;
  cursor?: string;
  page?: number;
  q?: string;
  status?: ApiDefectStatus;
  severity?: ApiDefectSeverity;
  source?: ApiDefectSource;
  creatorId?: string;
  assigneeId?: string;
  iterationId?: string;
}
