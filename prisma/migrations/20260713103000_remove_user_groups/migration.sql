DELETE FROM "role_bindings" WHERE "group_id" IS NOT NULL;
ALTER TABLE "role_bindings" DROP CONSTRAINT "role_bindings_group_id_fkey";
DROP TABLE "group_members";
DROP TABLE "user_groups";
DROP INDEX IF EXISTS "role_bindings_group_id_organization_id_project_space_id_idx";
ALTER TABLE "role_bindings" DROP COLUMN "group_id", DROP COLUMN "subject_type";
ALTER TABLE "role_bindings" ALTER COLUMN "user_id" SET NOT NULL;
DROP TYPE "SubjectType";
