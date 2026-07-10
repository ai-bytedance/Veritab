-- CreateEnum
CREATE TYPE "TestCaseGrade" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('UNTESTED', 'PASS', 'FAIL', 'BLOCKED');

-- ExtendTable
ALTER TABLE "test_cases"
  ADD COLUMN "folder_id" UUID,
  ADD COLUMN "grade" "TestCaseGrade" NOT NULL DEFAULT 'P1',
  ADD COLUMN "steps" TEXT,
  ADD COLUMN "expected_result" TEXT,
  ADD COLUMN "actual_result" TEXT,
  ADD COLUMN "execution_status" "TestResultStatus" NOT NULL DEFAULT 'UNTESTED',
  ADD COLUMN "release_version" VARCHAR(100),
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "module" VARCHAR(200),
  ADD COLUMN "is_mindmap_mode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "step_results" JSONB,
  ADD COLUMN "step_notes" JSONB,
  ADD COLUMN "custom_fields" JSONB;

ALTER TABLE "test_cases" ALTER COLUMN "status" SET DEFAULT 'READY';

-- CreateTable
CREATE TABLE "test_case_folders" (
  "id" UUID NOT NULL,
  "project_space_id" UUID NOT NULL,
  "parent_id" UUID,
  "client_key" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "test_case_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_case_catalogs" (
  "project_space_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_by_id" UUID,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "test_case_catalogs_pkey" PRIMARY KEY ("project_space_id")
);

-- CreateTable
CREATE TABLE "test_case_executions" (
  "id" UUID NOT NULL,
  "test_case_id" UUID NOT NULL,
  "executed_by_id" UUID NOT NULL,
  "status" "TestResultStatus" NOT NULL,
  "actual_result" TEXT,
  "environment" VARCHAR(500),
  "step_results" JSONB,
  "step_notes" JSONB,
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "test_case_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_case_history" (
  "id" UUID NOT NULL,
  "test_case_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "from_version" INTEGER,
  "to_version" INTEGER NOT NULL,
  "changes" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "test_case_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_case_folders_project_space_id_client_key_key"
  ON "test_case_folders"("project_space_id", "client_key");
CREATE INDEX "test_case_folders_project_space_id_parent_id_position_idx"
  ON "test_case_folders"("project_space_id", "parent_id", "position");
CREATE INDEX "test_cases_project_space_id_execution_status_grade_idx"
  ON "test_cases"("project_space_id", "execution_status", "grade");
CREATE INDEX "test_cases_folder_id_idx" ON "test_cases"("folder_id");
CREATE INDEX "test_case_executions_test_case_id_completed_at_idx"
  ON "test_case_executions"("test_case_id", "completed_at" DESC);
CREATE INDEX "test_case_executions_executed_by_id_completed_at_idx"
  ON "test_case_executions"("executed_by_id", "completed_at" DESC);
CREATE INDEX "test_case_history_test_case_id_created_at_idx"
  ON "test_case_history"("test_case_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "test_case_folders"
  ADD CONSTRAINT "test_case_folders_project_space_id_fkey"
  FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_case_folders"
  ADD CONSTRAINT "test_case_folders_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "test_case_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_cases"
  ADD CONSTRAINT "test_cases_folder_id_fkey"
  FOREIGN KEY ("folder_id") REFERENCES "test_case_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_case_catalogs"
  ADD CONSTRAINT "test_case_catalogs_project_space_id_fkey"
  FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_case_catalogs"
  ADD CONSTRAINT "test_case_catalogs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_case_executions"
  ADD CONSTRAINT "test_case_executions_test_case_id_fkey"
  FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_case_executions"
  ADD CONSTRAINT "test_case_executions_executed_by_id_fkey"
  FOREIGN KEY ("executed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_case_history"
  ADD CONSTRAINT "test_case_history_test_case_id_fkey"
  FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_case_history"
  ADD CONSTRAINT "test_case_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
