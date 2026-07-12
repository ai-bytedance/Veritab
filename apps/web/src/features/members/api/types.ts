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
    roleBindings: Array<{ role: { code: string; name: string } }>;
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

export interface ApiUserGroup {
  id: string;
  name: string;
  description: string | null;
  members: Array<{ userId: string; user: { id: string; username: string; displayName: string } }>;
}
