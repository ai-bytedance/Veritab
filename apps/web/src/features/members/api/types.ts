export interface MemberApiScope { organizationId: string }

export interface ApiOrganizationMember {
  status: "ACTIVE" | "SUSPENDED";
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    status: "ACTIVE" | "DISABLED" | "LOCKED";
    lastLoginAt: string | null;
    roleBindings: Array<{ scopeType: "ORGANIZATION" | "PROJECT_SPACE"; projectSpaceId: string | null; role: { code: string; name: string }; projectSpace: { id: string; name: string; key: string } | null }>;
  };
}

export interface ApiOrganizationInvitation {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  role: { code: string; name: string };
  invitedBy: { id: string; displayName: string };
}

export interface CreatedInvitation extends Omit<ApiOrganizationInvitation, "acceptedAt" | "revokedAt" | "invitedBy"> {
  activationToken: string;
}

export interface ApiPermission { code: string; description: string | null }
export interface ApiRole { id: string; code: string; name: string; description: string | null; isSystem: boolean; version: number; permissions: Array<{ permission: ApiPermission }> }
