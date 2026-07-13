UPDATE "roles"
SET "name" = '系统管理员',
    "description" = '系统内置管理角色，负责组织、成员与项目空间管理'
WHERE "code" = 'org_admin' AND "organization_id" IS NULL;
