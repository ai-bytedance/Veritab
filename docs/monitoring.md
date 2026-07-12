# 生产监控基线

Veritab API 提供 Prometheus 文本指标端点 `GET /api/v1/metrics`。该端点不接受用户 JWT，必须使用独立的 `METRICS_TOKEN`：

```http
Authorization: Bearer <METRICS_TOKEN>
```

生产环境必须通过 Secret Manager 注入至少 32 字符的随机令牌，并在反向代理或网络策略中只允许监控系统访问该路径。令牌不得写入浏览器配置、仓库或普通用户会话。

## 必须采集的指标

| 指标 | 含义 | 建议告警 |
| --- | --- | --- |
| `veritab_up` | API 能否查询数据库 | 1 分钟内为 0，P0 |
| `veritab_outbox_pending_events` | 待处理领域事件 | 连续 10 分钟大于 100，P1 |
| `veritab_outbox_dead_letter_events` | 死信事件 | 大于 0，P1 |
| `veritab_outbox_oldest_pending_age_seconds` | 最老待处理事件年龄 | 连续 5 分钟大于 300，P1 |
| `veritab_database_connections` | 当前数据库连接数 | 与最大连接数比值超过 80%，P1 |
| `veritab_database_max_connections` | PostgreSQL 最大连接数 | 用于连接比例计算 |
| `veritab_database_size_bytes` | 当前数据库容量 | 按存储配额设置 70%/85% 告警 |

主机或 Kubernetes 层仍需采集 CPU、内存、磁盘可用量、容器重启次数和网络错误。对象存储容量、PostgreSQL 备份成功时间与恢复演练结果属于外部基础设施指标，不应伪装成应用自身指标。
