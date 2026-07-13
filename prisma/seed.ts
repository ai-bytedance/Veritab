import { PrismaClient } from "@prisma/client";

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
    { code: "org_admin", name: "组织管理员", permissions: permissionCodes },
    {
      code: "space_admin",
      name: "项目空间管理员",
      permissions: permissionCodes.filter((code) => code !== "organization.manage"),
    },
    {
      code: "developer",
      name: "开发人员",
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
      name: "测试人员",
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
      name: "只读成员",
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

}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
