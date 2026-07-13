CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'DISABLED');
ALTER TABLE "organizations" ADD COLUMN "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "project_spaces" ADD COLUMN "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
