CREATE TYPE "DefectSource" AS ENUM ('MANUAL', 'TEST_EXECUTION', 'CODE_CHANGE', 'IMPORT', 'MONITORING');

ALTER TABLE "defects"
ADD COLUMN "environment" VARCHAR(500),
ADD COLUMN "precondition" TEXT,
ADD COLUMN "reproduction_steps" TEXT,
ADD COLUMN "expected_result" TEXT,
ADD COLUMN "actual_result" TEXT,
ADD COLUMN "resolution" TEXT,
ADD COLUMN "source" "DefectSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "detected_version" VARCHAR(100),
ADD COLUMN "fixed_version" VARCHAR(100),
ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sort_order" DECIMAL(20, 10) NOT NULL DEFAULT 0,
ADD COLUMN "due_at" TIMESTAMPTZ(3),
ADD COLUMN "custom_fields" JSONB;

CREATE INDEX "defects_project_space_id_severity_status_idx"
ON "defects"("project_space_id", "severity", "status");

CREATE TABLE "defect_requirement_links" (
  "defect_id" UUID NOT NULL,
  "requirement_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "defect_requirement_links_pkey" PRIMARY KEY ("defect_id", "requirement_id")
);

CREATE INDEX "defect_requirement_links_requirement_id_idx"
ON "defect_requirement_links"("requirement_id");

CREATE TABLE "defect_test_case_links" (
  "defect_id" UUID NOT NULL,
  "test_case_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "defect_test_case_links_pkey" PRIMARY KEY ("defect_id", "test_case_id")
);

CREATE INDEX "defect_test_case_links_test_case_id_idx"
ON "defect_test_case_links"("test_case_id");

CREATE TABLE "defect_comments" (
  "id" UUID NOT NULL,
  "defect_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "parent_id" UUID,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "defect_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "defect_comments_not_self_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id")
);

CREATE INDEX "defect_comments_defect_id_parent_id_created_at_idx"
ON "defect_comments"("defect_id", "parent_id", "created_at");

CREATE TABLE "defect_history" (
  "id" UUID NOT NULL,
  "defect_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "from_version" INTEGER,
  "to_version" INTEGER NOT NULL,
  "changes" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "defect_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "defect_history_defect_id_created_at_idx"
ON "defect_history"("defect_id", "created_at" DESC);

ALTER TABLE "defect_requirement_links"
ADD CONSTRAINT "defect_requirement_links_defect_id_fkey"
FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_requirement_links"
ADD CONSTRAINT "defect_requirement_links_requirement_id_fkey"
FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_test_case_links"
ADD CONSTRAINT "defect_test_case_links_defect_id_fkey"
FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_test_case_links"
ADD CONSTRAINT "defect_test_case_links_test_case_id_fkey"
FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_comments"
ADD CONSTRAINT "defect_comments_defect_id_fkey"
FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_comments"
ADD CONSTRAINT "defect_comments_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "defect_comments"
ADD CONSTRAINT "defect_comments_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "defect_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_history"
ADD CONSTRAINT "defect_history_defect_id_fkey"
FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "defect_history"
ADD CONSTRAINT "defect_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
