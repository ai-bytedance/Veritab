import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class AssignProjectMemberRoleDto {
  @IsUUID() projectSpaceId!: string;
  @IsOptional() @IsString() @Length(2, 64) roleCode?: string;
}
