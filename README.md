# Veritab Agile Platform

Veritab 是面向研发团队的敏捷研发与质量协作平台。当前仓库采用 TypeScript monorepo：React Web 与 NestJS API 共享一套工程、数据库迁移和质量门禁。

## 目录

```text
apps/
  api/       NestJS + Fastify 业务 API
  web/       React + Vite Web 应用
prisma/      Prisma Schema、迁移与种子数据
scripts/     可重复的端到端验收脚本
docs/        架构和 API 文档
```

## 常用命令

```bash
npm install
npm run dev:api
npm run dev:web
npm run lint
npm test
npm run build
```

本地基础设施与环境变量参见 [.env.example](.env.example) 和 [compose.yaml](compose.yaml)。详细架构见 [docs/architecture.md](docs/architecture.md)。

生产容器部署参见 [docs/deployment.md](docs/deployment.md) 与 [compose.production.yaml](compose.production.yaml)。

正式上线前必须逐项完成 [商业上线就绪度与 P0 门禁](docs/commercial-readiness.md)。

每次推送和 Pull Request 均由 [CI 工作流](.github/workflows/ci.yml) 执行类型检查、测试、构建、Compose 校验和生产依赖审计。

AI 能力由 NestJS 服务端网关统一调用。`AI_API_KEY` 只能通过服务端环境变量或生产 Secret Manager 注入，禁止写入 Vite 环境变量、浏览器存储或数据库业务配置。
