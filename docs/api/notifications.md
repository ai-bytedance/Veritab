# Outbound Notifications

外部通知不会在业务 HTTP 事务内直接发送。业务模块写入 `outbox_events`，手工通知通过 `POST /notifications/requests` 写入同一可靠队列。

渠道配置由 `GET/PUT /notifications/channels/:provider` 管理。Webhook HTTPS 地址和签名密钥使用 `WEBHOOK_ENCRYPTION_KEY`（Base64 编码的 32 字节 AES key）进行 AES-256-GCM 加密；读取 API 只返回是否已配置，永不返回密文或明文。

当前提交覆盖安全配置和可靠入队边界。实际外部投递 Worker、指数退避、死信管理将在独立 Worker 进程中实现；在 Worker 上线前，系统不会谎报外部送达成功。
