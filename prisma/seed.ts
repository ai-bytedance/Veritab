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

const permissionNames: Record<(typeof permissionCodes)[number], string> = {
  "organization.read": "查看组织", "organization.manage": "管理组织",
  "space.read": "查看项目空间", "space.manage": "管理项目空间",
  "member.read": "查看成员与群组", "member.manage": "管理成员与群组",
  "requirement.read": "查看需求", "requirement.create": "创建需求", "requirement.update": "编辑需求", "requirement.transition": "变更需求状态", "requirement.delete": "删除需求",
  "defect.read": "查看缺陷", "defect.create": "创建缺陷", "defect.update": "编辑缺陷", "defect.transition": "变更缺陷状态", "defect.delete": "删除缺陷", "defect.comment": "评论缺陷",
  "testcase.read": "查看用例", "testcase.create": "创建用例", "testcase.update": "编辑用例", "testcase.execute": "执行用例", "testcase.delete": "删除用例", "testcase.mindmap": "编辑用例脑图", "testcase.import": "导入用例", "testcase.export": "导出用例",
  "integration.read": "查看服务集成", "integration.manage": "管理服务集成", "audit.read": "查看审计日志",
};

async function main(): Promise<void> {
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: { description: permissionNames[code] },
        create: { code, description: permissionNames[code] },
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
