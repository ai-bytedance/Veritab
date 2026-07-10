import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CommitData } from "../../../components/CodeChangesData.types";
import { gitIntegrationsApi } from "./gitIntegrationsApi";
import { GitApiScope } from "./types";

const key = (scope?: GitApiScope) => ["git-integrations", scope?.organizationId, scope?.projectSpaceId] as const;

export function useGitIntegrations(scope?: GitApiScope) {
  const client = useQueryClient();
  const queryKey = key(scope);
  const repositories = useQuery({ queryKey: [...queryKey, "repositories"], queryFn: () => gitIntegrationsApi.repositories(scope!), enabled: Boolean(scope) });
  const changes = useQuery({ queryKey: [...queryKey, "changes"], queryFn: () => gitIntegrationsApi.changes(scope!), enabled: Boolean(scope) });
  const save = useMutation({
    mutationFn: async (input: { provider: "github" | "gitlab"; webUrl: string; defaultBranch: string; credentialRef?: string }) => {
      const current = repositories.data?.[0];
      const repositoryKey = new URL(input.webUrl).pathname.replace(/^\//, "").replace(/\.git$/, "");
      const name = repositoryKey.split("/").at(-1) || repositoryKey;
      if (current) return gitIntegrationsApi.updateRepository(scope!, current.id, { version: current.version, name, webUrl: input.webUrl, defaultBranch: input.defaultBranch, credentialRef: input.credentialRef });
      return gitIntegrationsApi.createRepository(scope!, { provider: input.provider.toUpperCase(), repositoryKey, name, webUrl: input.webUrl, defaultBranch: input.defaultBranch, credentialRef: input.credentialRef });
    },
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });

  const commits: CommitData[] = (changes.data?.items || []).map((change) => ({
    id: change.id,
    hash: change.commitSha,
    message: change.title,
    author: change.authorName || "unknown",
    timestamp: change.committedAt,
    branch: change.branch || "unknown",
    files: change.files.map((file) => ({ filename: file.path, status: file.status === "renamed" ? "modified" : file.status as "added" | "modified" | "deleted", additions: file.additions, deletions: file.deletions, diff: file.patch || "" })),
  }));

  return {
    repository: repositories.data?.[0],
    commits,
    isLoading: repositories.isLoading || changes.isLoading,
    isSaving: save.isPending,
    error: repositories.error || changes.error || save.error,
    saveRepository: save.mutateAsync,
    refresh: () => Promise.all([repositories.refetch(), changes.refetch()]),
  };
}
