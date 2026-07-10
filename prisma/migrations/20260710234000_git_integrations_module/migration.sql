CREATE TYPE "GitRepositoryStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');
CREATE TYPE "PullRequestStatus" AS ENUM ('DRAFT', 'OPEN', 'MERGED', 'CLOSED');

ALTER TABLE "code_changes"
  ADD COLUMN "repository_id" UUID,
  ADD COLUMN "branch" VARCHAR(255),
  ADD COLUMN "additions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deletions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "files_changed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "web_url" VARCHAR(1000),
  ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "git_repositories" (
  "id" UUID NOT NULL,
  "project_space_id" UUID NOT NULL,
  "provider" "GitProvider" NOT NULL,
  "repository_key" VARCHAR(500) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "web_url" VARCHAR(1000) NOT NULL,
  "default_branch" VARCHAR(255) NOT NULL DEFAULT 'main',
  "credential_ref" VARCHAR(500),
  "status" "GitRepositoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_synced_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "git_repositories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "code_change_files" (
  "id" UUID NOT NULL,
  "code_change_id" UUID NOT NULL,
  "path" VARCHAR(1000) NOT NULL,
  "status" VARCHAR(30) NOT NULL,
  "additions" INTEGER NOT NULL DEFAULT 0,
  "deletions" INTEGER NOT NULL DEFAULT 0,
  "patch" TEXT,
  CONSTRAINT "code_change_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pull_requests" (
  "id" UUID NOT NULL,
  "project_space_id" UUID NOT NULL,
  "repository_id" UUID NOT NULL,
  "merge_commit_id" UUID,
  "external_id" VARCHAR(100) NOT NULL,
  "number" INTEGER NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "status" "PullRequestStatus" NOT NULL,
  "source_branch" VARCHAR(255) NOT NULL,
  "target_branch" VARCHAR(255) NOT NULL,
  "author_name" VARCHAR(160),
  "web_url" VARCHAR(1000),
  "opened_at" TIMESTAMPTZ(3),
  "merged_at" TIMESTAMPTZ(3),
  "closed_at" TIMESTAMPTZ(3),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "code_change_requirement_links" (
  "code_change_id" UUID NOT NULL,
  "requirement_id" UUID NOT NULL,
  CONSTRAINT "code_change_requirement_links_pkey" PRIMARY KEY ("code_change_id", "requirement_id")
);
CREATE TABLE "code_change_defect_links" (
  "code_change_id" UUID NOT NULL,
  "defect_id" UUID NOT NULL,
  CONSTRAINT "code_change_defect_links_pkey" PRIMARY KEY ("code_change_id", "defect_id")
);
CREATE TABLE "code_change_test_case_links" (
  "code_change_id" UUID NOT NULL,
  "test_case_id" UUID NOT NULL,
  CONSTRAINT "code_change_test_case_links_pkey" PRIMARY KEY ("code_change_id", "test_case_id")
);
CREATE TABLE "git_webhook_events" (
  "id" UUID NOT NULL,
  "repository_id" UUID NOT NULL,
  "delivery_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3),
  CONSTRAINT "git_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "git_repositories_project_space_id_provider_repository_key_key" ON "git_repositories"("project_space_id", "provider", "repository_key");
CREATE INDEX "git_repositories_project_space_id_status_updated_at_idx" ON "git_repositories"("project_space_id", "status", "updated_at" DESC);
CREATE UNIQUE INDEX "code_change_files_code_change_id_path_key" ON "code_change_files"("code_change_id", "path");
CREATE UNIQUE INDEX "pull_requests_repository_id_external_id_key" ON "pull_requests"("repository_id", "external_id");
CREATE INDEX "pull_requests_project_space_id_status_updated_at_idx" ON "pull_requests"("project_space_id", "status", "updated_at" DESC);
CREATE UNIQUE INDEX "git_webhook_events_repository_id_delivery_id_key" ON "git_webhook_events"("repository_id", "delivery_id");
CREATE INDEX "git_webhook_events_received_at_idx" ON "git_webhook_events"("received_at" DESC);
CREATE INDEX "code_changes_repository_id_committed_at_idx" ON "code_changes"("repository_id", "committed_at" DESC);

ALTER TABLE "git_repositories" ADD CONSTRAINT "git_repositories_project_space_id_fkey" FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "git_repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "code_change_files" ADD CONSTRAINT "code_change_files_code_change_id_fkey" FOREIGN KEY ("code_change_id") REFERENCES "code_changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_project_space_id_fkey" FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "git_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_merge_commit_id_fkey" FOREIGN KEY ("merge_commit_id") REFERENCES "code_changes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "code_change_requirement_links" ADD CONSTRAINT "code_change_requirement_links_code_change_id_fkey" FOREIGN KEY ("code_change_id") REFERENCES "code_changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "code_change_requirement_links" ADD CONSTRAINT "code_change_requirement_links_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "code_change_defect_links" ADD CONSTRAINT "code_change_defect_links_code_change_id_fkey" FOREIGN KEY ("code_change_id") REFERENCES "code_changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "code_change_defect_links" ADD CONSTRAINT "code_change_defect_links_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "code_change_test_case_links" ADD CONSTRAINT "code_change_test_case_links_code_change_id_fkey" FOREIGN KEY ("code_change_id") REFERENCES "code_changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "code_change_test_case_links" ADD CONSTRAINT "code_change_test_case_links_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "git_webhook_events" ADD CONSTRAINT "git_webhook_events_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "git_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
