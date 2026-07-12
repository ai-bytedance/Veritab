# Production deployment

`compose.production.yaml` 用于单机生产或预生产基线，包含 PostgreSQL、Redis、一次性迁移、API、通知 Worker、维护 Worker和静态 Web。Web 只绑定 `127.0.0.1`，应由宿主机负载均衡器或 TLS 反向代理对外发布。

```bash
cp .env.production.example .env.production
# 使用 Secret Manager 或密码管理器填写所有必填值
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d
```

运行约束：

- API/Worker 使用固定非 root UID/GID 10001、只读根文件系统、移除 Linux capabilities，并启用 `no-new-privileges`。
- 数据库迁移与幂等系统种子必须成功完成后 API 和 Worker 才会启动。系统种子只维护权限和角色，不创建用户、组织、项目空间或业务数据。
- API readiness 成功后 Web 才启动。
- PostgreSQL 和 Redis 不暴露宿主机端口。
- `.env.production` 禁止提交；生产优先使用 Docker/Kubernetes Secrets 或云 Secret Manager。
- `WEBHOOK_ENCRYPTION_KEY` 必须备份并建立轮换方案，丢失后已有渠道密文无法恢复。
- PostgreSQL/Redis 卷必须配置加密备份、恢复演练、磁盘告警和异地副本。

Compose 中的资源额度是 100–200 人规模的保守起点，不是容量承诺。上线前应根据压测结果调整，并在 Kubernetes/ECS 等平台配置多 API 副本、PodDisruptionBudget、自动扩缩容和托管数据库。
