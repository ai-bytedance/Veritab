import { ArrayUnique, IsArray, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateRoleDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsArray() @ArrayUnique() @IsString({ each: true }) permissionCodes!: string[];
}
