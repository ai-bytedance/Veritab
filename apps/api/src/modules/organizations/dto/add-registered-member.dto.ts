import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class AddRegisteredMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString() @Length(2, 64)
  roleCode?: string;
}
