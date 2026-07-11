# File Objects API

附件使用 S3-compatible 对象存储和两阶段上传：

1. `POST /files/uploads` 登记文件名、MIME、大小并获取短期 PUT URL。
2. 浏览器直接 PUT 到对象存储，必须携带响应给出的全部签名 Header。
3. `POST /files/:id/complete` 由服务端通过 HEAD 校验大小、MIME 和可选 SHA-256 元数据。
4. `PATCH /files/:id/attachment` 将 READY 文件绑定到同一项目空间的需求、缺陷或测试用例。

下载接口只签发短期 GET URL。数据库和 API 不保存或返回永久公开 URL。默认单文件上限 10 MiB，允许 PDF、PNG/JPEG/WebP、文本、CSV、JSON、XLSX 和 PPTX；生产环境自定义 S3 Endpoint 必须使用 HTTPS。

推荐生产环境使用工作负载身份或实例角色。只有无法使用工作负载身份时才通过 Secret Manager 注入 `S3_ACCESS_KEY_ID` 与 `S3_SECRET_ACCESS_KEY`。

维护进程使用 `npm run start:maintenance --workspace=@veritab/api` 启动。它每 15 分钟清理一批超过 `FILE_PENDING_RETENTION_HOURS`（默认 24 小时）仍未完成的对象和数据库预留记录；对象删除与状态更新都是幂等的。
