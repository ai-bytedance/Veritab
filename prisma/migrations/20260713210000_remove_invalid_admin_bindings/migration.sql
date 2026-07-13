DELETE FROM "role_bindings" rb
USING "roles" r, "users" u
WHERE rb."role_id" = r."id"
  AND rb."user_id" = u."id"
  AND r."code" = 'org_admin'
  AND u."is_system_admin" = false;
