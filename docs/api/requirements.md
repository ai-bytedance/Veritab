# Requirements API

Base resource:

```text
/api/v1/organizations/{organizationId}/spaces/{projectSpaceId}/requirements
```

All endpoints require an access JWT. The server verifies active organization membership, project ownership and the endpoint permission; path IDs are never trusted as authorization evidence.

## Endpoints

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/requirements` | `requirement.read` | Cursor page, filters, search and status facets |
| GET | `/requirements/{id}` | `requirement.read` | Requirement detail and available transitions |
| GET | `/requirements/{id}/history` | `requirement.read` | Latest 100 immutable changes |
| POST | `/requirements` | `requirement.create` | Create a DRAFT requirement and scoped display number |
| PATCH | `/requirements/{id}` | `requirement.update` | Update attributes with optimistic locking |
| POST | `/requirements/{id}/transitions` | `requirement.transition` | Apply a workflow transition with optimistic locking |
| DELETE | `/requirements/{id}?version=n` | `requirement.delete` | Soft delete with optimistic locking |

## List query

- `limit`: 1–100, default 20.
- `cursor`: last item UUID returned by the previous page.
- `page`: 1-based compatibility mode for the existing numbered-pagination UI; it cannot be combined with `cursor`.
- `q`: case-insensitive search over display number, title and description.
- `status`, `priority`, `type`.
- `assigneeId`, `creatorId`, `iterationId`.
- `sortBy`: `updatedAt`, `createdAt`, `priority`, `sortOrder`.
- `sortDirection`: `asc` or `desc`.

The response contains `items`, `pageInfo { hasNext, nextCursor, limit, total }` and unfiltered project `statusCounts` for board counters.

## Workflow

```text
DRAFT <-> UNDER_REVIEW -> IN_PROGRESS -> TESTING -> ACCEPTING -> DONE
  ^              |            ^            |           |          |
  |              +------------+------------+-----------+----------+
  +------------------------- CANCELLED ------------------+
```

Exact rules are encoded in `RequirementWorkflowService`; API clients must not infer that every status can transition to every other status. `GET /{id}` returns the currently legal next values.

## Concurrency

Every mutation includes the version last read by the client. Updates execute as:

```sql
UPDATE requirements
SET ..., version = version + 1
WHERE id = :id AND project_space_id = :space AND version = :expectedVersion;
```

No affected row means another user won the race; the API returns `409 Conflict`. The client must reload and let the user reconcile changes rather than silently overwriting them.

## Side effects

Create, update, transition and delete each write, in the same PostgreSQL transaction:

1. the current requirement state;
2. immutable `requirement_history`;
3. the security `audit_logs` entry;
4. an `outbox_events` record for asynchronous notification and integration processing.

External channels are never called from the HTTP transaction.
