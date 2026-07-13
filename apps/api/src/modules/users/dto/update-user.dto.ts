import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class UpdateUserDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 128)
  feishuUserId?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "DEACTIVATED"])
  status?: "ACTIVE" | "DEACTIVATED";
}
