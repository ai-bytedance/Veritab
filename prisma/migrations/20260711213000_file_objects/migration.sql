CREATE TYPE "FileObjectStatus" AS ENUM ('PENDING', 'READY', 'DELETED');

CREATE TABLE "file_objects" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "project_space_id" UUID NOT NULL,
  "uploader_id" UUID NOT NULL,
  "object_key" VARCHAR(500) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "content_type" VARCHAR(160) NOT NULL,
  "expected_size" BIGINT NOT NULL,
  "actual_size" BIGINT,
  "checksum_sha256" VARCHAR(64),
  "status" "FileObjectStatus" NOT NULL DEFAULT 'PENDING',
  "resource_type" VARCHAR(80),
  "resource_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalized_at" TIMESTAMPTZ(3),
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_objects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "file_objects_project_space_id_fkey" FOREIGN KEY ("project_space_id") REFERENCES "project_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "file_objects_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "file_objects_object_key_key" ON "file_objects"("object_key");
CREATE INDEX "file_objects_project_space_id_resource_type_resource_id_created_at_idx" ON "file_objects"("project_space_id", "resource_type", "resource_id", "created_at" DESC);
CREATE INDEX "file_objects_status_created_at_idx" ON "file_objects"("status", "created_at");
