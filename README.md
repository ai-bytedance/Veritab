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
