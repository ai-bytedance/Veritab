import { IsIn, IsOptional, IsUUID } from "class-validator";

export class AssignGroupRoleDto {
  @IsIn(["ORGANIZATION", "PROJECT_SPACE"])
  scopeType!: "ORGANIZATION" | "PROJECT_SPACE";

  @IsIn(["org_admin", "space_admin", "developer", "tester", "viewer"])
  roleCode!: "org_admin" | "space_admin" | "developer" | "tester" | "viewer";

  @IsOptional()
  @IsUUID()
  projectSpaceId?: string;
}
