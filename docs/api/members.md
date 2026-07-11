# Organization members and invitations

Authenticated organization administrators can list members, update membership status, assign a direct organization role, create invitations, list invitation metadata, and revoke unused invitations under `/api/v1/organizations/:organizationId`.

Invitation activation is public at `POST /api/v1/auth/invitations/accept`. The raw activation token is returned only by the invitation creation response; PostgreSQL stores only its SHA-256 hash. Tokens expire after 24 hours by default, can be configured from 1 to 168 hours, are single-use, and cannot be used after revocation.

Invitation tokens are intentionally not sent by the generic project notification worker. The administrator must deliver the one-time activation token through an approved identity or invitation channel. Tokens must never be written to logs, audit metadata, analytics, or URLs accessible to third-party referrers.

Self-suspension and self-demotion are rejected to prevent an organization administrator from locking themselves out. All successful status, role, invitation creation, invitation revocation, and invitation acceptance operations create audit records.
