import assert from "node:assert/strict";

const apiBase = process.env.E2E_API_BASE ?? "http://127.0.0.1:3001/api/v1";
const identifier = process.env.E2E_IDENTIFIER ?? "admin@example.com";
const password = process.env.E2E_PASSWORD;
const organizationSlug = process.env.E2E_ORGANIZATION_SLUG ?? "veritab-demo";
const projectSpaceKey = process.env.E2E_PROJECT_SPACE_KEY ?? "E2E";

if (!password) {
  throw new Error("E2E_PASSWORD is required");
}

let accessToken;
let organizationId;
let projectSpaceId;
let requirementId;
let requirementVersion;
let defectId;
let defectVersion;

async function request(path, options = {}, expectedStatuses = [200]) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${options.method ?? "GET"} ${path} returned ${response.status}: ${text}`);
  }
  return { status: response.status, body };
}

async function cleanup() {
  if (defectId) {
    try {
      const current = await request(
        `/organizations/${organizationId}/spaces/${projectSpaceId}/defects/${defectId}`,
        {},
        [200, 404],
      );
      if (current.status === 200) {
        await request(
          `/organizations/${organizationId}/spaces/${projectSpaceId}/defects/${defectId}?version=${current.body.version}`,
          { method: "DELETE" },
          [204],
        );
      }
    } catch (error) {
      console.error("Defect cleanup failed:", error.message);
    }
  }
  if (requirementId) {
    try {
      const current = await request(
        `/organizations/${organizationId}/spaces/${projectSpaceId}/requirements/${requirementId}`,
        {},
        [200, 404],
      );
      if (current.status === 200) {
        await request(
          `/organizations/${organizationId}/spaces/${projectSpaceId}/requirements/${requirementId}?version=${current.body.version}`,
          { method: "DELETE" },
          [204],
        );
      }
    } catch (error) {
      console.error("Requirement cleanup failed:", error.message);
    }
  }
}

try {
  const login = await request(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ identifier, password }) },
    [200],
  );
  accessToken = login.body.accessToken;
  assert.ok(accessToken, "Login did not return an access token");

  const organizations = (await request("/organizations")).body;
  const organization = organizations.find((item) => item.slug === organizationSlug);
  assert.ok(organization, `Organization ${organizationSlug} was not found`);
  organizationId = organization.id;

  const spaces = (await request(`/organizations/${organizationId}/spaces`)).body;
  const space = spaces.find((item) => item.key === projectSpaceKey);
  assert.ok(space, `Project space ${projectSpaceKey} was not found`);
  projectSpaceId = space.id;

  const resourceBase = `/organizations/${organizationId}/spaces/${projectSpaceId}`;
  const unique = `defect-e2e-${Date.now()}`;

  const requirement = await request(
    `${resourceBase}/requirements`,
    {
      method: "POST",
      body: JSON.stringify({
        title: `Traceability requirement ${unique}`,
        description: "Temporary requirement created by the defect E2E acceptance test.",
      }),
    },
    [201],
  );
  requirementId = requirement.body.id;
  requirementVersion = requirement.body.version;

  const created = await request(
    `${resourceBase}/defects`,
    {
      method: "POST",
      body: JSON.stringify({
        title: `Runtime acceptance ${unique}`,
        description: "Temporary defect created by the runtime acceptance test.",
        severity: "MAJOR",
        source: "TEST_EXECUTION",
        environment: "local-e2e",
        reproductionSteps: "1. Run the E2E script\n2. Observe the API response",
        expectedResult: "All workflow invariants hold",
        actualResult: "Pending verification",
        labels: ["e2e", "runtime"],
      }),
    },
    [201],
  );
  defectId = created.body.id;
  defectVersion = created.body.version;
  assert.equal(created.body.status, "OPEN");
  assert.match(created.body.displayNo, new RegExp(`^${projectSpaceKey}-DEF-\\d{6}$`));

  const listed = await request(`${resourceBase}/defects?q=${encodeURIComponent(unique)}&page=1&limit=20`);
  assert.equal(listed.body.pageInfo.total, 1);
  assert.equal(listed.body.items[0].id, defectId);

  const originalVersion = defectVersion;
  const updated = await request(
    `${resourceBase}/defects/${defectId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        version: defectVersion,
        title: `Runtime acceptance verified ${unique}`,
        actualResult: "Optimistic update succeeded",
        detectedVersion: "0.1.0-e2e",
      }),
    },
  );
  defectVersion = updated.body.version;
  assert.equal(defectVersion, originalVersion + 1);

  const stale = await request(
    `${resourceBase}/defects/${defectId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ version: originalVersion, title: `Stale overwrite ${unique}` }),
    },
    [409],
  );
  assert.equal(stale.status, 409);

  const linked = await request(
    `${resourceBase}/defects/${defectId}/links`,
    {
      method: "PUT",
      body: JSON.stringify({ version: defectVersion, requirementIds: [requirementId], testCaseIds: [] }),
    },
  );
  defectVersion = linked.body.version;
  assert.equal(linked.body.requirementLinks[0].requirement.id, requirementId);

  const comment = await request(
    `${resourceBase}/defects/${defectId}/comments`,
    { method: "POST", body: JSON.stringify({ content: "Top-level E2E verification comment" }) },
    [201],
  );
  const reply = await request(
    `${resourceBase}/defects/${defectId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content: "E2E reply", parentId: comment.body.id }),
    },
    [201],
  );
  const detailWithComments = await request(`${resourceBase}/defects/${defectId}`);
  assert.equal(detailWithComments.body.comments[0].replies[0].id, reply.body.id);

  for (const status of ["CONFIRMED", "IN_PROGRESS"]) {
    const transitioned = await request(
      `${resourceBase}/defects/${defectId}/transitions`,
      { method: "POST", body: JSON.stringify({ status, version: defectVersion }) },
    );
    defectVersion = transitioned.body.version;
    assert.equal(transitioned.body.status, status);
  }

  const invalidTransition = await request(
    `${resourceBase}/defects/${defectId}/transitions`,
    { method: "POST", body: JSON.stringify({ status: "CLOSED", version: defectVersion }) },
    [400],
  );
  assert.equal(invalidTransition.status, 400);

  const resolutionUpdate = await request(
    `${resourceBase}/defects/${defectId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        version: defectVersion,
        resolution: "Fixed and covered by the E2E workflow test",
        fixedVersion: "0.1.1-e2e",
      }),
    },
  );
  defectVersion = resolutionUpdate.body.version;

  for (const status of ["RESOLVED", "VERIFIED", "CLOSED"]) {
    const transitioned = await request(
      `${resourceBase}/defects/${defectId}/transitions`,
      { method: "POST", body: JSON.stringify({ status, version: defectVersion }) },
    );
    defectVersion = transitioned.body.version;
    assert.equal(transitioned.body.status, status);
  }

  const history = await request(`${resourceBase}/defects/${defectId}/history`);
  assert.ok(history.body.length >= 9, "Expected immutable history for every defect mutation");

  await request(
    `${resourceBase}/defects/${defectId}/comments/${reply.body.id}`,
    { method: "DELETE" },
    [204],
  );
  const afterReplyDelete = await request(`${resourceBase}/defects/${defectId}`);
  assert.equal(afterReplyDelete.body.comments[0].replies.length, 0);

  await request(`${resourceBase}/defects/${defectId}?version=${defectVersion}`, { method: "DELETE" }, [204]);
  const afterDelete = await request(`${resourceBase}/defects?q=${encodeURIComponent(unique)}&page=1&limit=20`);
  assert.equal(afterDelete.body.pageInfo.total, 0);
  defectId = undefined;

  await request(
    `${resourceBase}/requirements/${requirementId}?version=${requirementVersion}`,
    { method: "DELETE" },
    [204],
  );
  requirementId = undefined;

  console.log(
    JSON.stringify(
      {
        result: "passed",
        organization: organizationSlug,
        projectSpace: projectSpaceKey,
        checks: [
          "authentication",
          "create-and-list",
          "optimistic-lock-409",
          "requirement-link",
          "comment-and-reply",
          "workflow-and-invalid-transition",
          "immutable-history",
          "comment-soft-delete",
          "defect-soft-delete",
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
