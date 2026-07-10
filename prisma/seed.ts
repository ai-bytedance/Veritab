import { PrismaClient, ScopeType, SubjectType, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const permissionCodes = [
  "organization.read",
  "organization.manage",
  "space.read",
  "space.manage",
  "member.read",
  "member.manage",
  "requirement.read",
  "requirement.create",
  "requirement.update",
  "requirement.transition",
  "requirement.delete",
  "defect.read",
  "defect.create",
  "defect.update",
  "defect.transition",
  "defect.delete",
  "defect.comment",
  "testcase.read",
  "testcase.create",
  "testcase.update",
  "testcase.execute",
  "testcase.delete",
  "testcase.mindmap",
  "testcase.import",
  "testcase.export",
  "integration.read",
  "integration.manage",
  "audit.read",
] as const;

async function main(): Promise<void> {
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, description: `Allows ${code}` },
      }),
    ),
  );

  const roleDefinitions = [
    { code: "org_admin", name: "Organization administrator", permissions: permissionCodes },
    {
      code: "space_admin",
      name: "Project space administrator",
      permissions: permissionCodes.filter((code) => code !== "organization.manage"),
    },
    {
      code: "developer",
      name: "Developer",
      permissions: [
        "space.read",
        "member.read",
        "requirement.read",
        "requirement.update",
        "requirement.transition",
        "defect.read",
        "defect.create",
        "defect.update",
        "defect.transition",
        "defect.comment",
        "testcase.read",
        "testcase.export",
        "integration.read",
      ],
    },
    {
      code: "tester",
      name: "Tester",
      permissions: [
        "space.read",
        "member.read",
        "requirement.read",
        "defect.read",
        "defect.create",
        "defect.update",
        "defect.transition",
        "defect.delete",
        "defect.comment",
        "testcase.read",
        "testcase.create",
        "testcase.update",
        "testcase.execute",
        "testcase.delete",
        "testcase.mindmap",
        "testcase.import",
        "testcase.export",
      ],
    },
    {
      code: "viewer",
      name: "Viewer",
      permissions: ["organization.read", "space.read", "member.read", "requirement.read", "defect.read", "testcase.read"],
    },
  ] as const;

  for (const definition of roleDefinitions) {
    const existingRole = await prisma.role.findFirst({
      where: { organizationId: null, code: definition.code },
    });
    const role = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: { name: definition.name, isSystem: true },
        })
      : await prisma.role.create({
          data: { code: definition.code, name: definition.name, isSystem: true },
        });
    const allowed = permissions.filter((permission) =>
      (definition.permissions as readonly string[]).includes(permission.code),
    );
    await prisma.rolePermission.createMany({
      data: allowed.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  if (process.env.NODE_ENV === "production") {
    return;
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe-Immediately-123!";
  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com" },
    update: {},
    create: {
      username: process.env.SEED_ADMIN_USERNAME ?? "admin",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      displayName: "Veritab Administrator",
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
      status: UserStatus.ACTIVE,
    },
  });
  const organization = await prisma.organization.upsert({
    where: { slug: "veritab-demo" },
    update: {},
    create: { slug: "veritab-demo", name: "Veritab Demo Organization" },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: admin.id } },
    update: {},
    create: { organizationId: organization.id, userId: admin.id },
  });
  const adminRole = await prisma.role.findFirstOrThrow({ where: { code: "org_admin", organizationId: null } });
  const existingBinding = await prisma.roleBinding.findFirst({
    where: {
      roleId: adminRole.id,
      userId: admin.id,
      organizationId: organization.id,
      scopeType: ScopeType.ORGANIZATION,
    },
  });
  if (!existingBinding) {
    await prisma.roleBinding.create({
      data: {
        roleId: adminRole.id,
        subjectType: SubjectType.USER,
        userId: admin.id,
        scopeType: ScopeType.ORGANIZATION,
        organizationId: organization.id,
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
