CREATE TYPE "RoleScope" AS ENUM ('ORGANIZATION', 'PROJECT_SPACE');
ALTER TABLE "roles" ADD COLUMN "project_space_id" UUID, ADD COLUMN "scope" "RoleScope" NOT NULL DEFAULT 'ORGANIZATION';
UPDATE "roles" SET "scope" = 'PROJECT_SPACE' WHERE "code" = 'space_admin';
ALTER TABLE "roles" ADD CONSTRAINT "roles_project_space_id_fkey" FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "roles_organization_id_scope_project_space_id_idx" ON "roles"("organization_id", "scope", "project_space_id");

WITH ranked AS (
  SELECT "organization_id", "user_id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "joined_at", "organization_id") AS rn
  FROM "organization_members"
)
DELETE FROM "organization_members" om USING ranked r
WHERE om."organization_id" = r."organization_id" AND om."user_id" = r."user_id" AND r.rn > 1;
CREATE UNIQUE INDEX "organization_members_user_id_key" ON "organization_members"("user_id");

INSERT INTO "project_members" ("project_space_id", "user_id", "status", "joined_at")
SELECT ps."id", om."user_id", 'ACTIVE', NOW()
FROM "project_spaces" ps
JOIN "organization_members" om ON om."organization_id" = ps."organization_id"
JOIN "users" u ON u."id" = om."user_id" AND u."is_system_admin" = TRUE
ON CONFLICT ("project_space_id", "user_id") DO NOTHING;

INSERT INTO "role_bindings" ("id", "role_id", "user_id", "scope_type", "organization_id", "project_space_id", "created_at")
SELECT gen_random_uuid(), r."id", pm."user_id", 'PROJECT_SPACE', ps."organization_id", ps."id", NOW()
FROM "project_members" pm
JOIN "project_spaces" ps ON ps."id" = pm."project_space_id"
JOIN "users" u ON u."id" = pm."user_id" AND u."is_system_admin" = TRUE
JOIN "roles" r ON r."code" = 'space_admin' AND r."organization_id" IS NULL
WHERE NOT EXISTS (SELECT 1 FROM "role_bindings" rb WHERE rb."user_id" = pm."user_id" AND rb."project_space_id" = pm."project_space_id" AND rb."role_id" = r."id");
