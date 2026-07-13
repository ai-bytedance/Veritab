ALTER TABLE "users"
ADD COLUMN "feishu_user_id" VARCHAR(128),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "users_feishu_user_id_key" ON "users"("feishu_user_id");
