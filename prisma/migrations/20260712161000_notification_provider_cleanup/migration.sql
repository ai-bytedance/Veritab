DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "webhook_configs"
    WHERE "provider"::text NOT IN ('FEISHU', 'WECOM', 'DINGTALK')
  ) THEN
    RAISE EXCEPTION 'Unsupported webhook provider rows must be removed explicitly before this migration';
  END IF;
END $$;

ALTER TABLE "webhook_configs" ALTER COLUMN "provider" TYPE TEXT USING "provider"::text;
DROP TYPE "WebhookProvider";
CREATE TYPE "WebhookProvider" AS ENUM ('FEISHU', 'WECOM', 'DINGTALK');
ALTER TABLE "webhook_configs" ALTER COLUMN "provider" TYPE "WebhookProvider" USING "provider"::"WebhookProvider";
