const base = process.env.E2E_API_BASE ?? "http://127.0.0.1:3001/api/v1";
const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("E2E_PASSWORD is required");

let token = "";
async function request(path, init = {}, expected = 200) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (response.status !== expected) throw new Error(`${init.method ?? "GET"} ${path}: expected ${expected}, received ${response.status}: ${await response.text()}`);
  return response.status === 204 ? undefined : response.json();
}

const login = await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier: "admin", password }) });
token = login.accessToken;
const organizations = await request("/organizations");
if (organizations.length !== 1) throw new Error(`Expected one organization, received ${organizations.length}`);
const organizationId = organizations[0].id;
const members = await request(`/organizations/${organizationId}/members`);
if (members.length !== 1 || members[0].user.username !== "admin") throw new Error("Expected the clean bootstrap administrator");
const userId = members[0].user.id;
await request(`/organizations/${organizationId}/members/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status: "SUSPENDED" }) }, 400);
await request(`/organizations/${organizationId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ roleCode: "viewer" }) }, 400);

console.log(JSON.stringify({ result: "passed", checks: ["member-list", "self-suspension-guard", "self-demotion-guard"] }, null, 2));
