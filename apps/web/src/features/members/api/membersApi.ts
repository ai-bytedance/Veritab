import { apiRequest } from "../../../api/httpClient";
import { ApiOrganizationMember, ApiPermission, ApiRole, MemberApiScope } from "./types";

const root = (scope: MemberApiScope) => `/organizations/${scope.organizationId}`;

export const membersApi = {
  list: (scope: MemberApiScope) => apiRequest<ApiOrganizationMember[]>(`${root(scope)}/members`),
  updateStatus: (scope: MemberApiScope, userId: string, status: "ACTIVE" | "SUSPENDED") =>
    apiRequest(`${root(scope)}/members/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  assignRole: (scope: MemberApiScope, userId: string, roleCode: string) =>
    apiRequest(`${root(scope)}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ roleCode }) }),
  roles: (scope: MemberApiScope) => apiRequest<ApiRole[]>(`${root(scope)}/roles`),
  permissions: (scope: MemberApiScope) => apiRequest<ApiPermission[]>(`${root(scope)}/permissions`),
  createRole: (scope: MemberApiScope, input: { name: string; description?: string; permissionCodes: string[] }) => apiRequest<ApiRole>(`${root(scope)}/roles`, { method: "POST", body: JSON.stringify(input) }),
  updateRole: (scope: MemberApiScope, roleId: string, input: { version: number; name: string; description?: string; permissionCodes: string[] }) => apiRequest<ApiRole>(`${root(scope)}/roles/${roleId}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteRole: (scope: MemberApiScope, roleId: string) => apiRequest<void>(`${root(scope)}/roles/${roleId}`, { method: "DELETE" }),
};
