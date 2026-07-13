ALTER TABLE "roles" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

DELETE FROM "organization_invitations" WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "organization_id" IS NULL AND "code" IN ('developer', 'tester', 'viewer'));
DELETE FROM "role_bindings" WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "organization_id" IS NULL AND "code" IN ('developer', 'tester', 'viewer'));
DELETE FROM "roles" WHERE "organization_id" IS NULL AND "code" IN ('developer', 'tester', 'viewer');
