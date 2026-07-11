# AI Gateway API

`POST /api/v1/organizations/:organizationId/spaces/:projectSpaceId/ai/invoke`

服务端使用 OpenAI-compatible Chat Completions 协议调用管理员配置的模型。请求需要有效登录态和 `space.read` 权限，并单独限制为每分钟 10 次。

请求体：

```json
{ "prompt": "..." }
```

响应体：

```json
{ "text": "..." }
```

部署环境必须配置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`。生产环境的 `AI_BASE_URL` 必须使用 HTTPS。审计日志只记录模型、字符数和 Token 用量，不记录提示词、响应正文或密钥。
