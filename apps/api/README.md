# Veritab API

NestJS 11 + Fastify + Prisma backend foundation for the Veritab Agile Platform.

## Local development

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run prisma:migrate:dev --workspace=@veritab/api -- --name init
npm run prisma:seed --workspace=@veritab/api
npm run dev:api
```

API base: `http://localhost:3001/api/v1`
Swagger UI: `http://localhost:3001/docs`

Development seed credentials come from `.env`. Change them before first use. The seed refuses to create a default administrator when `NODE_ENV=production`.

## Implemented foundation

- Access JWT and rotating Refresh JWT cookie sessions with reuse detection.
- Argon2id password verification and non-enumerating login failures.
- Organization/project-space scoped RBAC enforced by global guards.
- User, organization and project-space foundation endpoints.
- Strict DTO validation, request IDs, structured request logging, rate limiting and Problem Details errors.
- Prisma schema for identity, RBAC and core agile entities.
- Requirements REST API with server-side search/filtering, cursor pagination, workflow guards, optimistic locking, immutable history, audit and Outbox events.
- Defects REST API with severity/source filters, resolution workflow, comments/replies, requirement/test-case traceability and transactional history/audit/Outbox records.
- Test-case and mindmap API with versioned folder trees, definition/execution separation, optimistic locking, requirement/defect traceability and portable JSON export.
- Liveness/readiness endpoints and OpenAPI documentation.

## Security boundaries

- Never expose `JWT_*_SECRET`, password hashes, provider secrets or `DATABASE_URL` to the browser.
- Production secrets must come from a secrets manager rather than an image or repository.
- `CORS_ORIGINS` must be an explicit comma-separated allowlist.
- Database migrations are an explicit deployment job; API replicas must not run migrations on startup.
