import { IsIn } from "class-validator";

export class AssignMemberRoleDto {
  @IsIn(["org_admin", "developer", "tester", "viewer"])
  roleCode!: "org_admin" | "developer" | "tester" | "viewer";
}
