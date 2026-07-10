import { PrismaClient } from "@prisma/client";

const base = process.env.E2E_API_BASE ?? "http://127.0.0.1:3001/api/v1";
const adminPassword = process.env.E2E_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
if (!adminPassword || !databaseUrl) throw new Error("E2E_PASSWORD and DATABASE_URL are required");

const stamp = Date.now();
const email = `e2e-member-${stamp}@example.invalid`;
const username = `e2e_member_${stamp}`;
const memberPassword = `E2E-Member-${stamp}!`;
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

async function request(path, init = {}, expected = 200, token = "") {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (response.status !== expected) throw new Error(`${init.method ?? "GET"} ${path}: expected ${expected}, received ${response.status}: ${await response.text()}`);
  return response.status === 204 ? undefined : response.json();
}

try {
  const adminLogin = await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier: "admin", password: adminPassword }) });
  const organizations = await request("/organizations", {}, 200, adminLogin.accessToken);
  const organizationId = organizations[0].id;
  const invitation = await request(`/organizations/${organizationId}/invitations`, {
    method: "POST",
    body: JSON.stringify({ email, roleCode: "tester", expiresInHours: 1 }),
  }, 201, adminLogin.accessToken);
  if (!invitation.activationToken) throw new Error("Activation token was not returned once at creation");

  await request("/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token: invitation.activationToken, username, displayName: "E2E Member", password: memberPassword }),
  }, 201);
  await request("/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token: invitation.activationToken, username: `${username}_again`, displayName: "E2E Member", password: memberPassword }),
  }, 410);
  const memberLogin = await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier: username, password: memberPassword }) });
  if (!memberLogin.user.roleCodes.includes("tester")) throw new Error("Invited tester role was not reflected in authentication metadata");
  const members = await request(`/organizations/${organizationId}/members`, {}, 200, adminLogin.accessToken);
  if (!members.some((member) => member.user.email === email)) throw new Error("Accepted member is missing from organization list");

  console.log(JSON.stringify({ result: "passed", checks: ["one-time-token", "password-activation", "role-binding", "member-list", "token-reuse-rejection"] }, null, 2));
} finally {
  const user = await prisma.user.findUnique({ where: { email } });
  await prisma.organizationInvitation.deleteMany({ where: { email } });
  if (user) await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}
