import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class AssignGroupRoleDto {
  @IsIn(["ORGANIZATION", "PROJECT_SPACE"])
  scopeType!: "ORGANIZATION" | "PROJECT_SPACE";

  @IsOptional() @IsString() @Length(2, 64)
  roleCode?: string;

  @IsOptional()
  @IsUUID()
  projectSpaceId?: string;
}
