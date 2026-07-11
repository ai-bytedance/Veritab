# Organization Settings API

组织品牌、可见菜单和 AI 指令模板属于非秘密配置，统一存储在 `organization_settings`。Webhook 密钥、模型密钥和其他凭据不得写入该表。

- `GET /api/v1/organizations/:organizationId/settings`：需要 `space.read`。
- `PATCH /api/v1/organizations/:organizationId/settings`：需要 `space.manage`。

更新请求必须携带当前 `version`。版本不一致返回 `409 Conflict`，防止多个管理员相互覆盖。首次读取空组织时返回 `version: 0` 的干净默认值但不写数据库；首次保存才创建版本 1。

服务端仅接受固定菜单键，并始终保留 `config`。模板单项最大 30,000 字符，更新行为写入审计日志，但审计元数据不包含模板正文。
