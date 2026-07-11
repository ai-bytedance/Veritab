import assert from "node:assert/strict";

const apiBase = process.env.E2E_API_BASE ?? "http://127.0.0.1:3001/api/v1";
const identifier = process.env.E2E_IDENTIFIER;
const password = process.env.E2E_PASSWORD;
const organizationSlug = process.env.E2E_ORGANIZATION_SLUG;
const projectSpaceKey = process.env.E2E_PROJECT_SPACE_KEY;
if (!identifier || !password || !organizationSlug || !projectSpaceKey) throw new Error("E2E_IDENTIFIER, E2E_PASSWORD, E2E_ORGANIZATION_SLUG and E2E_PROJECT_SPACE_KEY are required");

let token;
let organizationId;
let projectSpaceId;
let resourceBase;
let requirement;
let defect;
let testCase;

async function request(path, options = {}, expected = [200]) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!expected.includes(response.status)) {
    throw new Error(`${options.method ?? "GET"} ${path} returned ${response.status}: ${text}`);
  }
  return { status: response.status, body };
}

async function cleanup() {
  try {
    if (testCase) {
      const current = await request(`${resourceBase}/test-cases/${testCase.id}`, {}, [200, 404]);
      if (current.status === 200) {
        await request(`${resourceBase}/test-cases/${testCase.id}?version=${current.body.version}`, { method: "DELETE" }, [204]);
      }
    }
    if (defect) {
      const current = await request(`${resourceBase}/defects/${defect.id}`, {}, [200, 404]);
      if (current.status === 200) {
        await request(`${resourceBase}/defects/${defect.id}?version=${current.body.version}`, { method: "DELETE" }, [204]);
      }
    }
    if (requirement) {
      const current = await request(`${resourceBase}/requirements/${requirement.id}`, {}, [200, 404]);
      if (current.status === 200) {
        await request(`${resourceBase}/requirements/${requirement.id}?version=${current.body.version}`, { method: "DELETE" }, [204]);
      }
    }
    if (resourceBase) {
      const document = await request(`${resourceBase}/test-cases/mindmap`);
      await request(
        `${resourceBase}/test-cases/mindmap/folders`,
        { method: "PUT", body: JSON.stringify({ version: document.body.version, folders: [] }) },
      );
    }
  } catch (error) {
    console.error("E2E cleanup failed:", error.message);
  }
}

try {
  const login = await request(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    },
  );
  token = login.body.accessToken;
  const organizations = (await request("/organizations")).body;
  organizationId = organizations.find((item) => item.slug === organizationSlug)?.id;
  assert.ok(organizationId);
  const spaces = (await request(`/organizations/${organizationId}/spaces`)).body;
  projectSpaceId = spaces.find((item) => item.key === projectSpaceKey)?.id;
  assert.ok(projectSpaceId);
  resourceBase = `/organizations/${organizationId}/spaces/${projectSpaceId}`;
  const unique = `testcase-e2e-${Date.now()}`;

  const initialDocument = (await request(`${resourceBase}/test-cases/mindmap`)).body;
  const folders = [
    { clientKey: `${unique}-root`, name: "Runtime root", position: 0 },
    { clientKey: `${unique}-child`, name: "Runtime child", parentKey: `${unique}-root`, position: 0 },
  ];
  const folderSync = await request(`${resourceBase}/test-cases/mindmap/folders`, {
    method: "PUT",
    body: JSON.stringify({ version: initialDocument.version, folders }),
  });
  const catalogVersion = folderSync.body.version;
  assert.equal(folderSync.body.folders[1].parentId, `${unique}-root`);

  const staleFolderSync = await request(
    `${resourceBase}/test-cases/mindmap/folders`,
    { method: "PUT", body: JSON.stringify({ version: initialDocument.version, folders }) },
    [409],
  );
  assert.equal(staleFolderSync.status, 409);

  const cycle = await request(
    `${resourceBase}/test-cases/mindmap/folders`,
    {
      method: "PUT",
      body: JSON.stringify({
        version: catalogVersion,
        folders: [
          { clientKey: "cycle-a", name: "A", parentKey: "cycle-b", position: 0 },
          { clientKey: "cycle-b", name: "B", parentKey: "cycle-a", position: 0 },
        ],
      }),
    },
    [400],
  );
  assert.equal(cycle.status, 400);
  assert.equal((await request(`${resourceBase}/test-cases/mindmap`)).body.version, catalogVersion);

  requirement = (
    await request(
      `${resourceBase}/requirements`,
      { method: "POST", body: JSON.stringify({ title: `Test coverage ${unique}` }) },
      [201],
    )
  ).body;
  defect = (
    await request(
      `${resourceBase}/defects`,
      { method: "POST", body: JSON.stringify({ title: `Execution defect ${unique}`, source: "TEST_EXECUTION" }) },
      [201],
    )
  ).body;
  testCase = (
    await request(
      `${resourceBase}/test-cases`,
      {
        method: "POST",
        body: JSON.stringify({
          title: `Runtime test case ${unique}`,
          grade: "P0",
          precondition: "Authenticated test environment",
          steps: "1. Open the workspace\n2. Execute the scenario",
          expectedResult: "The persisted mindmap remains consistent",
          requirementId: requirement.id,
          folderKey: `${unique}-child`,
          linkedDefectId: defect.id,
          releaseVersion: "0.2.0-e2e",
          tags: ["e2e", "mindmap"],
          isMindmapMode: true,
        }),
      },
      [201],
    )
  ).body;
  assert.match(testCase.displayNo, /^E2E-TC-\d{6}$/);
  assert.equal(testCase.folder.clientKey, `${unique}-child`);
  assert.equal(testCase.requirementId, requirement.id);
  assert.equal(testCase.defectLinks[0].defectId, defect.id);

  const listed = await request(`${resourceBase}/test-cases?q=${encodeURIComponent(unique)}&page=1&limit=20`);
  assert.equal(listed.body.pageInfo.total, 1);
  const originalVersion = testCase.version;
  testCase = (
    await request(`${resourceBase}/test-cases/${testCase.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        version: testCase.version,
        title: `Runtime test case verified ${unique}`,
        module: "Quality Platform",
      }),
    })
  ).body;
  assert.equal(testCase.version, originalVersion + 1);

  const staleUpdate = await request(
    `${resourceBase}/test-cases/${testCase.id}`,
    { method: "PATCH", body: JSON.stringify({ version: originalVersion, title: `Stale ${unique}` }) },
    [409],
  );
  assert.equal(staleUpdate.status, 409);

  const execution = await request(
    `${resourceBase}/test-cases/${testCase.id}/executions`,
    {
      method: "POST",
      body: JSON.stringify({
        version: testCase.version,
        status: "FAIL",
        actualResult: "A controlled failure was recorded",
        environment: "local-e2e",
        stepResults: { 0: "pass", 1: "fail" },
        stepNotes: { 1: "Expected E2E failure marker" },
      }),
    },
    [201],
  );
  testCase = execution.body.testCase;
  assert.equal(testCase.executionStatus, "FAIL");

  const detail = await request(`${resourceBase}/test-cases/${testCase.id}`);
  assert.equal(detail.body.executions[0].status, "FAIL");
  const history = await request(`${resourceBase}/test-cases/${testCase.id}/history`);
  assert.equal(history.body.length, 3);
  const exported = await request(`${resourceBase}/test-cases/export`);
  assert.equal(exported.body.schemaVersion, 1);
  assert.ok(exported.body.testCases.some((item) => item.id === testCase.id));

  const removeFolder = await request(`${resourceBase}/test-cases/mindmap/folders`, {
    method: "PUT",
    body: JSON.stringify({
      version: catalogVersion,
      folders: [{ clientKey: `${unique}-root`, name: "Runtime root", position: 0 }],
    }),
  });
  assert.equal(removeFolder.body.version, catalogVersion + 1);
  const afterFolderRemoval = await request(`${resourceBase}/test-cases/${testCase.id}`);
  assert.equal(afterFolderRemoval.body.folder, null);

  await request(`${resourceBase}/test-cases/${testCase.id}?version=${testCase.version}`, { method: "DELETE" }, [204]);
  const afterDelete = await request(`${resourceBase}/test-cases?q=${encodeURIComponent(unique)}&page=1&limit=20`);
  assert.equal(afterDelete.body.pageInfo.total, 0);

  await request(`${resourceBase}/defects/${defect.id}?version=${defect.version}`, { method: "DELETE" }, [204]);
  await request(`${resourceBase}/requirements/${requirement.id}?version=${requirement.version}`, { method: "DELETE" }, [204]);
  const finalDocument = await request(`${resourceBase}/test-cases/mindmap`);
  await request(`${resourceBase}/test-cases/mindmap/folders`, {
    method: "PUT",
    body: JSON.stringify({ version: finalDocument.body.version, folders: [] }),
  });
  requirement = undefined;
  defect = undefined;
  testCase = undefined;

  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "mindmap-folder-cas",
          "cycle-rejection",
          "create-search-and-traceability",
          "optimistic-lock-409",
          "append-only-execution",
          "immutable-history",
          "portable-export",
          "folder-removal-detach",
          "soft-delete",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (process.exitCode) await cleanup();
}
