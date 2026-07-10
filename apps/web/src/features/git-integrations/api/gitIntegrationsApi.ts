import { apiRequest } from "../../../api/httpClient";
import { ApiGitRepository, CodeChangePage, GitApiScope } from "./types";

const resource = (scope: GitApiScope) => `/organizations/${scope.organizationId}/spaces/${scope.projectSpaceId}/git`;

export const gitIntegrationsApi = {
  repositories(scope: GitApiScope): Promise<ApiGitRepository[]> {
    return apiRequest(`${resource(scope)}/repositories`);
  },
  changes(scope: GitApiScope): Promise<CodeChangePage> {
    return apiRequest(`${resource(scope)}/changes?page=1&limit=100`);
  },
  createRepository(scope: GitApiScope, input: {
    provider: string; repositoryKey: string; name: string; webUrl: string; defaultBranch: string; credentialRef?: string;
  }): Promise<ApiGitRepository> {
    return apiRequest(`${resource(scope)}/repositories`, { method: "POST", body: JSON.stringify(input) });
  },
  updateRepository(scope: GitApiScope, id: string, input: {
    version: number; name: string; webUrl: string; defaultBranch: string; credentialRef?: string;
  }): Promise<ApiGitRepository> {
    return apiRequest(`${resource(scope)}/repositories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
};
