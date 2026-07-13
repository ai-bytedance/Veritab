import { PrismaClient, ScopeType, SubjectType, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for tenant bootstrap`);
  return value;
}

function optional(name: string): string {
  return process.env[name]?.trim() ?? "";
}

async function main(): Promise<void> {
  const username = required("BOOTSTRAP_ADMIN_USERNAME");
  const email = optional("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const password = required("BOOTSTRAP_ADMIN_PASSWORD");
  const displayName = required("BOOTSTRAP_ADMIN_DISPLAY_NAME");
  const organizationSlug = optional("BOOTSTRAP_ORGANIZATION_SLUG") || "default";
  const organizationName = optional("BOOTSTRAP_ORGANIZATION_NAME") || "默认组织";
  const projectKey = (optional("BOOTSTRAP_PROJECT_KEY") || "DEFAULT").toUpperCase();
  const projectName = optional("BOOTSTRAP_PROJECT_NAME") || "默认项目空间";

  if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters");

  const adminRole = await prisma.role.findFirst({ where: { code: "org_admin", organizationId: null } });
  if (!adminRole) throw new Error("System roles are missing; run prisma:seed first");

  const result = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findFirst({ where: { OR: [{ username }, ...(email ? [{ email }] : [])] } });
    if (existingUser) throw new Error("Bootstrap administrator already exists");
    if (organizationSlug) {
      const existingOrganization = await tx.organization.findUnique({ where: { slug: organizationSlug } });
      if (existingOrganization) throw new Error("Bootstrap organization already exists");
    }

    const user = await tx.user.create({
      data: {
        username,
        email,
        displayName,
        isSystemAdmin: true,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        status: UserStatus.ACTIVE,
      },
    });
    const organization = await tx.organization.create({ data: { slug: organizationSlug, name: organizationName } });
    await tx.organizationMember.create({ data: { organizationId: organization.id, userId: user.id } });
    await tx.roleBinding.create({ data: { roleId: adminRole!.id, subjectType: SubjectType.USER, userId: user.id, scopeType: ScopeType.ORGANIZATION, organizationId: organization.id } });
    const projectSpace = await tx.projectSpace.create({ data: { organizationId: organization.id, key: projectKey, name: projectName } });
    await tx.projectMember.create({ data: { projectSpaceId: projectSpace.id, userId: user.id } });
    await tx.auditLog.createMany({ data: [
      { organizationId: organization.id, actorId: user.id, action: "organization.create", resourceType: "Organization", resourceId: organization.id },
      { organizationId: organization.id, projectSpaceId: projectSpace.id, actorId: user.id, action: "space.create", resourceType: "ProjectSpace", resourceId: projectSpace.id },
    ] });
    return { userId: user.id, organizationId: organization.id, projectSpaceId: projectSpace.id };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
