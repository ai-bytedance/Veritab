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

`prisma:seed` installs only system permissions and built-in roles. It never creates users, organizations, project spaces, or sample business data.

Create the first tenant explicitly after setting all `BOOTSTRAP_*` variables:

```bash
npm run prisma:bootstrap
```

Required variables are `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_DISPLAY_NAME`, `BOOTSTRAP_ORGANIZATION_SLUG`, `BOOTSTRAP_ORGANIZATION_NAME`, `BOOTSTRAP_PROJECT_KEY`, and `BOOTSTRAP_PROJECT_NAME`. Bootstrap fails closed if any value is missing or if the tenant already exists.

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
- Git integration API with secret-reference repository configuration, idempotent Commit/PR imports, file patches and agile-entity traceability.
- Liveness/readiness endpoints and OpenAPI documentation.

## Security boundaries

- Never expose `JWT_*_SECRET`, password hashes, provider secrets or `DATABASE_URL` to the browser.
- Production secrets must come from a secrets manager rather than an image or repository.
- `CORS_ORIGINS` must be an explicit comma-separated allowlist.
- Database migrations are an explicit deployment job; API replicas must not run migrations on startup.
