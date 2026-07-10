# Defects API

Base resource:

```text
/api/v1/organizations/{organizationId}/spaces/{projectSpaceId}/defects
```

All routes require an access JWT and project-scoped RBAC. The backend verifies that the project belongs to the organization and that every linked requirement, test case, iteration and assignee belongs to the same project space.

## Endpoints

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/defects` | `defect.read` | Search, filters, status/severity facets, cursor or page pagination |
| GET | `/defects/{id}` | `defect.read` | Detail, traceability links, comments and available transitions |
| GET | `/defects/{id}/history` | `defect.read` | Latest 100 immutable history entries |
| POST | `/defects` | `defect.create` | Create an OPEN defect and project-scoped display number |
| PATCH | `/defects/{id}` | `defect.update` | Update attributes using optimistic locking |
| POST | `/defects/{id}/transitions` | `defect.transition` | Apply a validated workflow transition |
| PUT | `/defects/{id}/links` | `defect.update` | Atomically replace requirement and test-case links |
| POST | `/defects/{id}/comments` | `defect.comment` | Create a comment or one-level reply |
| DELETE | `/defects/{id}/comments/{commentId}` | `defect.comment` | Soft-delete a comment owned by the caller |
| DELETE | `/defects/{id}?version=n` | `defect.delete` | Soft-delete with optimistic locking |

## Workflow

The primary quality path is:

```text
OPEN -> CONFIRMED -> IN_PROGRESS -> RESOLVED -> VERIFIED -> CLOSED
  |          |             |             |           |
  +------ REJECTED         +-------- REOPENED <------+
```

Fast triage may move OPEN directly to IN_PROGRESS. Closing IN_PROGRESS directly is rejected: resolution and verification cannot be bypassed. Reopening a closed or verified defect returns it through REOPENED before active work resumes.

## Consistency

- Attribute updates, transitions, link replacement and deletion require the last-read `version`.
- A stale version returns `409 Conflict` and never overwrites another user's update.
- Each successful defect mutation writes `defect_history`, `audit_logs` and `outbox_events` in the same PostgreSQL transaction.
- Comments are independent append-only collaboration records and do not cause spurious defect-version conflicts.
- External notifications are produced later from Outbox events, never within the HTTP transaction.
