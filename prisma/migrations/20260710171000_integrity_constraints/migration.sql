-- Prisma cannot currently express these partial indexes and cross-field checks.

-- PostgreSQL treats NULL values as distinct in compound unique indexes. This
-- partial index guarantees one global/system role per code.
CREATE UNIQUE INDEX "roles_system_code_key"
ON "roles"("code")
WHERE "organization_id" IS NULL;

ALTER TABLE "role_bindings"
ADD CONSTRAINT "role_bindings_subject_check"
CHECK (
  ("subject_type" = 'USER' AND "user_id" IS NOT NULL AND "group_id" IS NULL)
  OR
  ("subject_type" = 'GROUP' AND "group_id" IS NOT NULL AND "user_id" IS NULL)
);

ALTER TABLE "role_bindings"
ADD CONSTRAINT "role_bindings_scope_check"
CHECK (
  ("scope_type" = 'ORGANIZATION' AND "project_space_id" IS NULL)
  OR
  ("scope_type" = 'PROJECT_SPACE' AND "project_space_id" IS NOT NULL)
);

ALTER TABLE "iterations"
ADD CONSTRAINT "iterations_date_range_check"
CHECK ("ends_at" > "starts_at");
