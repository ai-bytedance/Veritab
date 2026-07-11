import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "./membersApi";
import { MemberApiScope } from "./types";

const key = (scope: MemberApiScope) => ["organization-members", scope.organizationId] as const;

export function useMembers(scope: MemberApiScope) {
  const client = useQueryClient();
  const queryKey = key(scope);
  const members = useQuery({ queryKey: [...queryKey, "members"], queryFn: () => membersApi.list(scope) });
  const invitations = useQuery({ queryKey: [...queryKey, "invitations"], queryFn: () => membersApi.invitations(scope) });
  const refresh = () => client.invalidateQueries({ queryKey });
  const invite = useMutation({ mutationFn: (input: { email: string; roleCode: string; expiresInHours: number }) => membersApi.invite(scope, input), onSuccess: refresh });
  const revoke = useMutation({ mutationFn: (id: string) => membersApi.revokeInvitation(scope, id), onSuccess: refresh });
  const status = useMutation({ mutationFn: (input: { userId: string; status: "ACTIVE" | "SUSPENDED" }) => membersApi.updateStatus(scope, input.userId, input.status), onSuccess: refresh });
  const role = useMutation({ mutationFn: (input: { userId: string; roleCode: string }) => membersApi.assignRole(scope, input.userId, input.roleCode), onSuccess: refresh });
  return {
    members: members.data || [],
    invitations: invitations.data || [],
    invite: invite.mutateAsync,
    revokeInvitation: revoke.mutateAsync,
    updateStatus: status.mutateAsync,
    assignRole: role.mutateAsync,
    isLoading: members.isLoading || invitations.isLoading,
    isSaving: invite.isPending || revoke.isPending || status.isPending || role.isPending,
    error: members.error || invitations.error || invite.error || revoke.error || status.error || role.error,
  };
}
