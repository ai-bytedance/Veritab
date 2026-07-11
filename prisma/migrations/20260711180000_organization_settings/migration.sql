CREATE TABLE "organization_settings" (
  "organization_id" UUID NOT NULL,
  "brand_name" VARCHAR(80) NOT NULL DEFAULT 'Veritab',
  "brand_description" VARCHAR(240) NOT NULL DEFAULT '敏捷研发管理平台',
  "visible_menus" TEXT[] NOT NULL DEFAULT ARRAY['overview','requirement','defect','testcase','code_changes','metrics','config']::TEXT[],
  "test_case_prompt_template" TEXT NOT NULL DEFAULT '',
  "requirement_prompt_template" TEXT NOT NULL DEFAULT '',
  "defect_prompt_template" TEXT NOT NULL DEFAULT '',
  "report_prompt_template" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("organization_id"),
  CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
