import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

export class UpdateRoleDto {
  @IsInt() @Min(1) version!: number;
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsArray() @ArrayUnique() @IsString({ each: true }) permissionCodes!: string[];
}
