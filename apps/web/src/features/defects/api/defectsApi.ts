import { apiRequest } from "../../../api/httpClient";
import { ApiDefect, ApiDefectComment, ApiDefectStatus, DefectApiScope, DefectFilters, DefectPage } from "./types";

function resource(scope: DefectApiScope): string {
  return `/organizations/${scope.organizationId}/spaces/${scope.projectSpaceId}/defects`;
}

function queryString(filters: DefectFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export interface CreateDefectInput {
  title: string;
  description?: string;
  severity?: "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR" | "TRIVIAL";
  environment?: string;
  precondition?: string;
  reproductionSteps?: string;
  expectedResult?: string;
  actualResult?: string;
  assigneeId?: string;
  detectedVersion?: string;
  labels?: string[];
  requirementIds?: string[];
  testCaseIds?: string[];
}

export interface UpdateDefectInput extends Omit<CreateDefectInput, "requirementIds" | "testCaseIds"> {
  version: number;
  resolution?: string;
  fixedVersion?: string;
}

export const defectsApi = {
  list(scope: DefectApiScope, filters: DefectFilters = {}): Promise<DefectPage> {
    return apiRequest(`${resource(scope)}${queryString(filters)}`);
  },
  get(scope: DefectApiScope, id: string): Promise<ApiDefect> {
    return apiRequest(`${resource(scope)}/${id}`);
  },
  create(scope: DefectApiScope, input: CreateDefectInput): Promise<ApiDefect> {
    return apiRequest(resource(scope), { method: "POST", body: JSON.stringify(input) });
  },
  update(scope: DefectApiScope, id: string, input: UpdateDefectInput): Promise<ApiDefect> {
    return apiRequest(`${resource(scope)}/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  transition(scope: DefectApiScope, id: string, status: ApiDefectStatus, version: number): Promise<ApiDefect> {
    return apiRequest(`${resource(scope)}/${id}/transitions`, {
      method: "POST",
      body: JSON.stringify({ status, version }),
    });
  },
  syncLinks(
    scope: DefectApiScope,
    id: string,
    version: number,
    requirementIds: string[],
    testCaseIds: string[],
  ): Promise<ApiDefect> {
    return apiRequest(`${resource(scope)}/${id}/links`, {
      method: "PUT",
      body: JSON.stringify({ version, requirementIds, testCaseIds }),
    });
  },
  addComment(scope: DefectApiScope, id: string, content: string, parentId?: string): Promise<ApiDefectComment> {
    return apiRequest(`${resource(scope)}/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentId }),
    });
  },
  deleteComment(scope: DefectApiScope, id: string, commentId: string): Promise<void> {
    return apiRequest(`${resource(scope)}/${id}/comments/${commentId}`, { method: "DELETE" });
  },
  remove(scope: DefectApiScope, id: string, version: number): Promise<void> {
    return apiRequest(`${resource(scope)}/${id}?version=${version}`, { method: "DELETE" });
  },
};
