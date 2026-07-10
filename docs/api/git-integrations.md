# Git Integrations API

Base resource:

```text
/api/v1/organizations/{organizationId}/spaces/{projectSpaceId}/git
```

## Security boundary

- The browser never sends or stores a GitHub/GitLab access token. Repository configuration accepts only a Secret Manager reference such as `vault://veritab/git/token`.
- Repository URLs must use HTTPS and repository keys are normalized as `owner/name`.
- Provider workers normalize signed webhook or polling payloads before calling the authenticated import endpoint.
- Every import carries a provider delivery ID. `(repository_id, delivery_id)` is unique, making retries idempotent.
- Import, delivery record, Commit/PR upsert, audit log and Outbox event commit atomically.
- File patches are limited to 200 KB per file at the API boundary. Binary contents and full repository archives are never stored.

## Endpoints

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/repositories` | `integration.read` | List connected repositories without credential references |
| POST | `/repositories` | `integration.manage` | Connect a repository using a credential reference |
| PATCH | `/repositories/{id}` | `integration.manage` | Update repository configuration with optimistic locking |
| DELETE | `/repositories/{id}?version=n` | `integration.manage` | Disconnect a repository and cascade imported provider data |
| POST | `/repositories/{id}/import` | `integration.manage` | Idempotently import normalized Commits and PR/MRs |
| GET | `/changes` | `integration.read` | Search and page Commits with file/traceability details |
| GET | `/changes/{id}` | `integration.read` | Read one Commit and its files, PRs and linked agile entities |
| PUT | `/changes/{id}/links` | `integration.manage` | Atomically replace requirement, defect and test-case links |
| GET | `/pull-requests` | `integration.read` | List normalized GitHub PR / GitLab MR records |

Provider-specific network clients and signature verification run in a separate worker. This API deliberately exposes a normalized internal ingestion contract so provider retries cannot bypass project RBAC, idempotency, audit or transaction boundaries.
