import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "./membersApi";
import { MemberApiScope } from "./types";

const key = (scope: MemberApiScope) => ["organization-members", scope.organizationId] as const;

export function useMembers(scope: MemberApiScope) {
  const client = useQueryClient();
  const queryKey = key(scope);
  const members = useQuery({ queryKey: [...queryKey, "members"], queryFn: () => membersApi.list(scope) });
  const invitations = useQuery({ queryKey: [...queryKey, "invitations"], queryFn: () => membersApi.invitations(scope) });
  const roles = useQuery({ queryKey: [...queryKey, "roles"], queryFn: () => membersApi.roles(scope) });
  const permissions = useQuery({ queryKey: [...queryKey, "permissions"], queryFn: () => membersApi.permissions(scope) });
  const refresh = () => client.invalidateQueries({ queryKey });
  const invite = useMutation({ mutationFn: (input: { email: string; roleCode: string; expiresInHours: number }) => membersApi.invite(scope, input), onSuccess: refresh });
  const revoke = useMutation({ mutationFn: (id: string) => membersApi.revokeInvitation(scope, id), onSuccess: refresh });
  const status = useMutation({ mutationFn: (input: { userId: string; status: "ACTIVE" | "SUSPENDED" }) => membersApi.updateStatus(scope, input.userId, input.status), onSuccess: refresh });
  const role = useMutation({ mutationFn: (input: { userId: string; roleCode: string }) => membersApi.assignRole(scope, input.userId, input.roleCode), onSuccess: refresh });
  const createRole = useMutation({ mutationFn: (input: { name: string; description?: string; permissionCodes: string[] }) => membersApi.createRole(scope, input), onSuccess: refresh });
  const updateRole = useMutation({ mutationFn: (input: { roleId: string; version: number; name: string; description?: string; permissionCodes: string[] }) => membersApi.updateRole(scope, input.roleId, input), onSuccess: refresh });
  const deleteRole = useMutation({ mutationFn: (id: string) => membersApi.deleteRole(scope, id), onSuccess: refresh });
  return {
    members: members.data || [],
    invitations: invitations.data || [],
    roles: roles.data || [],
    permissions: permissions.data || [],
    invite: invite.mutateAsync,
    revokeInvitation: revoke.mutateAsync,
    updateStatus: status.mutateAsync,
    assignRole: role.mutateAsync,
    createRole: createRole.mutateAsync, updateRole: updateRole.mutateAsync, deleteRole: deleteRole.mutateAsync,
    isLoading: members.isLoading || invitations.isLoading || roles.isLoading || permissions.isLoading,
    isSaving: invite.isPending || revoke.isPending || status.isPending || role.isPending || createRole.isPending || updateRole.isPending || deleteRole.isPending,
    error: members.error || invitations.error || roles.error || invite.error || revoke.error || status.error || role.error,
  };
}
