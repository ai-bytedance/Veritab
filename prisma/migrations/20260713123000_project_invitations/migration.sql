CREATE TABLE "project_invitations" (
  "id" UUID NOT NULL,
  "project_space_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "invited_by_id" UUID NOT NULL,
  "role_ids" JSONB NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_invitations_project_space_id_fkey" FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "project_invitations_project_space_id_created_at_idx" ON "project_invitations"("project_space_id", "created_at" DESC);
CREATE INDEX "project_invitations_user_id_accepted_at_revoked_at_idx" ON "project_invitations"("user_id", "accepted_at", "revoked_at");
