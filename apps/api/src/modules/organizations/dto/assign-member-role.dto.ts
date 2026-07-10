import { IsIn } from "class-validator";

export class AssignMemberRoleDto {
  @IsIn(["org_admin", "space_admin", "developer", "tester", "viewer"])
  roleCode!: "org_admin" | "space_admin" | "developer" | "tester" | "viewer";
}
