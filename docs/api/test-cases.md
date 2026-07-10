# Test Cases and Mindmap API

Base resource:

```text
/api/v1/organizations/{organizationId}/spaces/{projectSpaceId}/test-cases
```

All routes require an access JWT and project-scoped RBAC. Test-case lifecycle (`DRAFT`, `READY`, `DEPRECATED`) is deliberately separate from the latest execution result (`UNTESTED`, `PASS`, `FAIL`, `BLOCKED`).

## Endpoints

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/test-cases` | `testcase.read` | Search, filters, paging and result/grade facets |
| GET | `/test-cases/mindmap` | `testcase.read` | Load the persisted folder tree, cases and requirement references |
| PUT | `/test-cases/mindmap/folders` | `testcase.mindmap` | CAS replacement of the folder hierarchy |
| GET | `/test-cases/export` | `testcase.export` | Portable JSON export with schema version |
| POST | `/test-cases` | `testcase.create` | Create a READY test case and project-scoped display number |
| GET | `/test-cases/{id}` | `testcase.read` | Definition, traceability and latest 50 executions |
| PATCH | `/test-cases/{id}` | `testcase.update` | Update definition/placement with optimistic locking |
| POST | `/test-cases/{id}/executions` | `testcase.execute` | Append an execution and update the latest result atomically |
| GET | `/test-cases/{id}/history` | `testcase.read` | Latest 100 immutable definition/execution changes |
| DELETE | `/test-cases/{id}?version=n` | `testcase.delete` | Soft-delete with optimistic locking |

The existing browser importer uses the create endpoint through a serialized write queue. Large commercial imports should use the planned asynchronous import-job pipeline described in the architecture document, rather than one oversized HTTP transaction.

## Mindmap consistency

- Folder identifiers exposed to the UI are stable `clientKey` values; internal database IDs remain UUIDs.
- Every full folder synchronization requires the last-read catalog `version`.
- Missing parents, duplicate keys, self-parenting and cycles are rejected before database writes.
- A stale document returns `409 Conflict`; it never silently overwrites another editor's hierarchy.
- Folder changes, audit log and Outbox event commit in the same transaction.

## Execution consistency

Each execution is append-only in `test_case_executions`. The test-case row stores only the latest result for efficient boards. Execution append, latest-result update, immutable history, audit log and Outbox event share one PostgreSQL transaction.
