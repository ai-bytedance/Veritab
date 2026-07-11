import { apiRequest } from "../../../api/httpClient";
import { ApiOrganizationInvitation, ApiOrganizationMember, CreatedInvitation, MemberApiScope } from "./types";

const root = (scope: MemberApiScope) => `/organizations/${scope.organizationId}`;

export const membersApi = {
  list: (scope: MemberApiScope) => apiRequest<ApiOrganizationMember[]>(`${root(scope)}/members`),
  invitations: (scope: MemberApiScope) => apiRequest<ApiOrganizationInvitation[]>(`${root(scope)}/invitations`),
  invite: (scope: MemberApiScope, input: { email: string; roleCode: string; expiresInHours: number }) =>
    apiRequest<CreatedInvitation>(`${root(scope)}/invitations`, { method: "POST", body: JSON.stringify(input) }),
  revokeInvitation: (scope: MemberApiScope, id: string) =>
    apiRequest<void>(`${root(scope)}/invitations/${id}`, { method: "DELETE" }),
  updateStatus: (scope: MemberApiScope, userId: string, status: "ACTIVE" | "SUSPENDED") =>
    apiRequest(`${root(scope)}/members/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  assignRole: (scope: MemberApiScope, userId: string, roleCode: string) =>
    apiRequest(`${root(scope)}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ roleCode }) }),
};
