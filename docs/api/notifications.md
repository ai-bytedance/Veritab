# Outbound Notifications

外部通知不会在业务 HTTP 事务内直接发送。业务模块写入 `outbox_events`，手工通知通过 `POST /notifications/requests` 写入同一可靠队列。

渠道配置由 `GET/PUT /notifications/channels/:provider` 管理。Webhook HTTPS 地址和签名密钥使用 `WEBHOOK_ENCRYPTION_KEY`（Base64 编码的 32 字节 AES key）进行 AES-256-GCM 加密；读取 API 只返回是否已配置，永不返回密文或明文。

独立 Worker 使用 `npm run start:worker --workspace=@veritab/api` 启动。多个实例通过 PostgreSQL `FOR UPDATE SKIP LOCKED` 抢占任务，单次租约 60 秒；失败按 30 秒起步指数退避，最长一小时，第 8 次失败进入死信。

管理员可以读取最近 100 条通知死信，并通过 `POST /notifications/dead-letters/:eventId/replay` 重放。重放操作会写审计日志。
