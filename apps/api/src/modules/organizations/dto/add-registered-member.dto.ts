import { IsIn, IsUUID } from "class-validator";

export class AddRegisteredMemberDto {
  @IsUUID()
  userId!: string;

  @IsIn(["org_admin", "developer", "tester", "viewer"])
  roleCode!: "org_admin" | "developer" | "tester" | "viewer";
}
