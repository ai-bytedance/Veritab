import { apiRequest } from "../../../api/httpClient";
import {
  ApiRequirement,
  ApiRequirementStatus,
  RequirementApiScope,
  RequirementFilters,
  RequirementPage,
} from "./types";

function resource(scope: RequirementApiScope): string {
  return `/organizations/${scope.organizationId}/spaces/${scope.projectSpaceId}/requirements`;
}

function queryString(filters: RequirementFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export interface CreateRequirementInput {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: "P0" | "P1" | "P2" | "P3";
  assigneeId?: string;
  storyPoints?: number;
  labels?: string[];
  plannedStartAt?: string;
  plannedEndAt?: string;
}

export interface UpdateRequirementInput extends Partial<CreateRequirementInput> {
  version: number;
}

export const requirementsApi = {
  list(scope: RequirementApiScope, filters: RequirementFilters = {}): Promise<RequirementPage> {
    return apiRequest(`${resource(scope)}${queryString(filters)}`);
  },
  get(scope: RequirementApiScope, id: string): Promise<ApiRequirement> {
    return apiRequest(`${resource(scope)}/${id}`);
  },
  create(scope: RequirementApiScope, input: CreateRequirementInput): Promise<ApiRequirement> {
    return apiRequest(resource(scope), { method: "POST", body: JSON.stringify(input) });
  },
  update(scope: RequirementApiScope, id: string, input: UpdateRequirementInput): Promise<ApiRequirement> {
    return apiRequest(`${resource(scope)}/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  transition(
    scope: RequirementApiScope,
    id: string,
    status: ApiRequirementStatus,
    version: number,
  ): Promise<ApiRequirement> {
    return apiRequest(`${resource(scope)}/${id}/transitions`, {
      method: "POST",
      body: JSON.stringify({ status, version }),
    });
  },
  remove(scope: RequirementApiScope, id: string, version: number): Promise<void> {
    return apiRequest(`${resource(scope)}/${id}?version=${version}`, { method: "DELETE" });
  },
  history(scope: RequirementApiScope, id: string): Promise<unknown[]> {
    return apiRequest(`${resource(scope)}/${id}/history`);
  },
};
