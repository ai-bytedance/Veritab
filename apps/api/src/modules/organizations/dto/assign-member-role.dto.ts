import { IsString, Length } from "class-validator";

export class AssignMemberRoleDto {
  @IsString() @Length(2, 64)
  roleCode!: string;
}
