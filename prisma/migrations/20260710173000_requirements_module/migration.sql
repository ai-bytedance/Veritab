-- Align the persistence workflow with the existing product workflow.
ALTER TYPE "RequirementStatus" RENAME VALUE 'BACKLOG' TO 'DRAFT';
ALTER TYPE "RequirementStatus" RENAME VALUE 'READY' TO 'UNDER_REVIEW';
ALTER TYPE "RequirementStatus" RENAME VALUE 'IN_REVIEW' TO 'TESTING';
ALTER TYPE "RequirementStatus" ADD VALUE 'ACCEPTING' BEFORE 'DONE';

CREATE TYPE "RequirementType" AS ENUM ('EPIC', 'FEATURE', 'STORY', 'TASK');

ALTER TABLE "requirements"
ADD COLUMN "acceptance_criteria" TEXT,
ADD COLUMN "type" "RequirementType" NOT NULL DEFAULT 'STORY',
ADD COLUMN "parent_id" UUID,
ADD COLUMN "story_points" SMALLINT,
ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sort_order" DECIMAL(20, 10) NOT NULL DEFAULT 0,
ADD COLUMN "planned_start_at" TIMESTAMPTZ(3),
ADD COLUMN "planned_end_at" TIMESTAMPTZ(3),
ADD COLUMN "due_at" TIMESTAMPTZ(3),
ADD COLUMN "custom_fields" JSONB;

ALTER TABLE "requirements"
ADD CONSTRAINT "requirements_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "requirements"
ADD CONSTRAINT "requirements_story_points_check"
CHECK ("story_points" IS NULL OR ("story_points" >= 0 AND "story_points" <= 100));

ALTER TABLE "requirements"
ADD CONSTRAINT "requirements_planned_date_range_check"
CHECK ("planned_end_at" IS NULL OR "planned_start_at" IS NULL OR "planned_end_at" >= "planned_start_at");

CREATE INDEX "requirements_project_space_id_type_priority_idx"
ON "requirements"("project_space_id", "type", "priority");

CREATE INDEX "requirements_parent_id_idx" ON "requirements"("parent_id");

CREATE TABLE "requirement_history" (
  "id" UUID NOT NULL,
  "requirement_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "from_version" INTEGER,
  "to_version" INTEGER NOT NULL,
  "changes" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "requirement_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "requirement_history_requirement_id_created_at_idx"
ON "requirement_history"("requirement_id", "created_at" DESC);

ALTER TABLE "requirement_history"
ADD CONSTRAINT "requirement_history_requirement_id_fkey"
FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "requirement_history"
ADD CONSTRAINT "requirement_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_counters" (
  "project_space_id" UUID NOT NULL,
  "requirement_next" INTEGER NOT NULL DEFAULT 1,
  "defect_next" INTEGER NOT NULL DEFAULT 1,
  "test_case_next" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "project_counters_pkey" PRIMARY KEY ("project_space_id")
);

ALTER TABLE "project_counters"
ADD CONSTRAINT "project_counters_project_space_id_fkey"
FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
