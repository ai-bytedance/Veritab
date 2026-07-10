import { apiRequest } from "../../../api/httpClient";
import { ApiTestCase, ApiTestCaseMindmap, ApiTestResultStatus, TestCaseApiScope } from "./types";

function resource(scope: TestCaseApiScope): string {
  return `/organizations/${scope.organizationId}/spaces/${scope.projectSpaceId}/test-cases`;
}

export interface CreateTestCaseInput {
  title: string;
  grade: "P0" | "P1" | "P2" | "P3";
  precondition?: string;
  steps?: string;
  expectedResult?: string;
  requirementId?: string;
  folderKey?: string;
  assigneeId?: string;
  linkedDefectId?: string;
  releaseVersion?: string;
  tags?: string[];
  module?: string;
  isMindmapMode?: boolean;
}

export interface UpdateTestCaseInput extends Omit<CreateTestCaseInput, "grade"> {
  version: number;
  grade?: "P0" | "P1" | "P2" | "P3";
  requirementId?: string | null;
  folderKey?: string | null;
  assigneeId?: string | null;
  linkedDefectId?: string | null;
  releaseVersion?: string | null;
  module?: string | null;
}

export const testCasesApi = {
  mindmap(scope: TestCaseApiScope): Promise<ApiTestCaseMindmap> {
    return apiRequest(`${resource(scope)}/mindmap`);
  },
  get(scope: TestCaseApiScope, id: string): Promise<ApiTestCase> {
    return apiRequest(`${resource(scope)}/${id}`);
  },
  create(scope: TestCaseApiScope, input: CreateTestCaseInput): Promise<ApiTestCase> {
    return apiRequest(resource(scope), { method: "POST", body: JSON.stringify(input) });
  },
  update(scope: TestCaseApiScope, id: string, input: UpdateTestCaseInput): Promise<ApiTestCase> {
    return apiRequest(`${resource(scope)}/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  execute(
    scope: TestCaseApiScope,
    id: string,
    input: {
      version: number;
      status: ApiTestResultStatus;
      actualResult?: string;
      stepResults?: Record<string, unknown>;
      stepNotes?: Record<string, unknown>;
    },
  ): Promise<{ testCase: ApiTestCase }> {
    return apiRequest(`${resource(scope)}/${id}/executions`, { method: "POST", body: JSON.stringify(input) });
  },
  syncFolders(
    scope: TestCaseApiScope,
    version: number,
    folders: Array<{ clientKey: string; name: string; parentKey?: string; position: number }>,
  ): Promise<{ version: number; folders: ApiTestCaseMindmap["folders"] }> {
    return apiRequest(`${resource(scope)}/mindmap/folders`, {
      method: "PUT",
      body: JSON.stringify({ version, folders }),
    });
  },
  remove(scope: TestCaseApiScope, id: string, version: number): Promise<void> {
    return apiRequest(`${resource(scope)}/${id}?version=${version}`, { method: "DELETE" });
  },
};
