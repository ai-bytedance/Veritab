import assert from "node:assert/strict";

const apiBase = process.env.E2E_API_BASE ?? "http://127.0.0.1:3001/api/v1";
const identifier = process.env.E2E_IDENTIFIER;
const password = process.env.E2E_PASSWORD;
const organizationSlug = process.env.E2E_ORGANIZATION_SLUG;
const projectSpaceKey = process.env.E2E_PROJECT_SPACE_KEY;
if (!identifier || !password || !organizationSlug || !projectSpaceKey) throw new Error("E2E_IDENTIFIER, E2E_PASSWORD, E2E_ORGANIZATION_SLUG and E2E_PROJECT_SPACE_KEY are required");
let token;

async function request(path, options = {}, expected = [200]) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!expected.includes(response.status)) throw new Error(`${options.method ?? "GET"} ${path} returned ${response.status}: ${text}`);
  return { status: response.status, body };
}

const login = await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
token = login.body.accessToken;
const organizations = (await request("/organizations")).body;
const organizationId = organizations.find((item) => item.slug === organizationSlug).id;
const spaces = (await request(`/organizations/${organizationId}/spaces`)).body;
const projectSpaceId = spaces.find((item) => item.key === projectSpaceKey).id;
const base = `/organizations/${organizationId}/spaces/${projectSpaceId}`;
const unique = Date.now();
const repositoryKey = `e2e/runtime-${unique}`;

let repository;
let requirement;
let defect;
let testCase;

try {
  const plaintextRejected = await request(`${base}/git/repositories`, {
    method: "POST",
    body: JSON.stringify({ provider: "GITHUB", repositoryKey, name: "Runtime", webUrl: `https://github.com/${repositoryKey}`, credentialRef: "ghp_plaintext" }),
  }, [400]);
  assert.equal(plaintextRejected.status, 400);

  repository = (await request(`${base}/git/repositories`, {
    method: "POST",
    body: JSON.stringify({ provider: "GITHUB", repositoryKey, name: "Runtime Git E2E", webUrl: `https://github.com/${repositoryKey}`, defaultBranch: "main", credentialRef: "vault://veritab/e2e/git-token" }),
  }, [201])).body;
  assert.equal(repository.credentialConfigured, true);
  assert.equal("credentialRef" in repository, false);

  const originalVersion = repository.version;
  repository = (await request(`${base}/git/repositories/${repository.id}`, {
    method: "PATCH",
    body: JSON.stringify({ version: repository.version, name: "Runtime Git E2E Updated" }),
  })).body;
  assert.equal(repository.version, originalVersion + 1);
  assert.equal((await request(`${base}/git/repositories/${repository.id}`, { method: "PATCH", body: JSON.stringify({ version: originalVersion, name: "Stale" }) }, [409])).status, 409);

  requirement = (await request(`${base}/requirements`, { method: "POST", body: JSON.stringify({ title: `Git traceability requirement ${unique}` }) }, [201])).body;
  defect = (await request(`${base}/defects`, { method: "POST", body: JSON.stringify({ title: `Git traceability defect ${unique}`, source: "CODE_CHANGE" }) }, [201])).body;
  testCase = (await request(`${base}/test-cases`, { method: "POST", body: JSON.stringify({ title: `Git traceability test ${unique}`, requirementId: requirement.id }) }, [201])).body;

  const sha = "a".repeat(40);
  const importPayload = {
    deliveryId: `delivery-${unique}`,
    eventType: "push",
    commits: [{
      sha,
      title: `feat: runtime Git integration ${unique}`,
      branch: "main",
      authorName: "Veritab E2E",
      authorEmail: "e2e@example.com",
      webUrl: `https://github.com/${repositoryKey}/commit/${sha}`,
      committedAt: new Date().toISOString(),
      files: [{ path: "apps/api/src/example.ts", status: "modified", additions: 4, deletions: 1, patch: "@@ -1 +1 @@\n-old\n+new" }],
    }],
    pullRequests: [{ externalId: "1", number: 1, title: "Runtime PR", status: "MERGED", sourceBranch: "feature/e2e", targetBranch: "main", authorName: "Veritab E2E", mergeCommitSha: sha, openedAt: new Date().toISOString(), mergedAt: new Date().toISOString() }],
  };
  const imported = await request(`${base}/git/repositories/${repository.id}/import`, { method: "POST", body: JSON.stringify(importPayload) }, [201]);
  assert.deepEqual(imported.body, { duplicate: false, importedCommits: 1, importedPullRequests: 1 });
  const duplicate = await request(`${base}/git/repositories/${repository.id}/import`, { method: "POST", body: JSON.stringify(importPayload) }, [201]);
  assert.equal(duplicate.body.duplicate, true);

  const changes = await request(`${base}/git/changes?q=${unique}&page=1&limit=20`);
  assert.equal(changes.body.pageInfo.total, 1);
  const change = changes.body.items[0];
  assert.equal(change.files[0].path, "apps/api/src/example.ts");
  const linked = await request(`${base}/git/changes/${change.id}/links`, {
    method: "PUT",
    body: JSON.stringify({ requirementIds: [requirement.id], defectIds: [defect.id], testCaseIds: [testCase.id] }),
  });
  assert.equal(linked.body.requirementLinks[0].requirementId, requirement.id);
  assert.equal(linked.body.defectLinks[0].defectId, defect.id);
  assert.equal(linked.body.testCaseLinks[0].testCaseId, testCase.id);
  const pullRequests = await request(`${base}/git/pull-requests?repositoryId=${repository.id}`);
  assert.equal(pullRequests.body[0].mergeCommit.commitSha, sha);

  await request(`${base}/git/repositories/${repository.id}?version=${repository.version}`, { method: "DELETE" }, [204]);
  assert.equal((await request(`${base}/git/changes?q=${unique}&page=1&limit=20`)).body.pageInfo.total, 0);
  await request(`${base}/test-cases/${testCase.id}?version=${testCase.version}`, { method: "DELETE" }, [204]);
  await request(`${base}/defects/${defect.id}?version=${defect.version}`, { method: "DELETE" }, [204]);
  await request(`${base}/requirements/${requirement.id}?version=${requirement.version}`, { method: "DELETE" }, [204]);
  repository = requirement = defect = testCase = undefined;

  console.log(JSON.stringify({ result: "passed", checks: ["plaintext-token-rejection", "repository-optimistic-lock", "idempotent-import", "commit-files", "pull-request-merge-link", "agile-traceability", "cascade-disconnect"] }, null, 2));
} finally {
  if (repository) await request(`${base}/git/repositories/${repository.id}?version=${repository.version}`, { method: "DELETE" }, [204, 404]).catch(() => undefined);
  if (testCase) { const current = await request(`${base}/test-cases/${testCase.id}`, {}, [200, 404]); if (current.status === 200) await request(`${base}/test-cases/${testCase.id}?version=${current.body.version}`, { method: "DELETE" }, [204]); }
  if (defect) { const current = await request(`${base}/defects/${defect.id}`, {}, [200, 404]); if (current.status === 200) await request(`${base}/defects/${defect.id}?version=${current.body.version}`, { method: "DELETE" }, [204]); }
  if (requirement) { const current = await request(`${base}/requirements/${requirement.id}`, {}, [200, 404]); if (current.status === 200) await request(`${base}/requirements/${requirement.id}?version=${current.body.version}`, { method: "DELETE" }, [204]); }
}
