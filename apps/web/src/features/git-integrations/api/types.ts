export interface GitApiScope { organizationId: string; projectSpaceId: string }
export interface ApiGitRepository {
  id: string;
  provider: "GITHUB" | "GITLAB" | "GITEE";
  repositoryKey: string;
  name: string;
  webUrl: string;
  defaultBranch: string;
  status: "ACTIVE" | "DISABLED" | "ERROR";
  credentialConfigured: boolean;
  lastSyncedAt: string | null;
  version: number;
}
export interface ApiCodeChange {
  id: string;
  commitSha: string;
  title: string;
  branch: string | null;
  authorName: string | null;
  committedAt: string;
  files: Array<{ path: string; status: string; additions: number; deletions: number; patch: string | null }>;
}
export interface CodeChangePage { items: ApiCodeChange[]; pageInfo: { total: number } }
