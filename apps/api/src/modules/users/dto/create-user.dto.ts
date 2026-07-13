import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";

export class CreateUserDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z][a-zA-Z0-9._-]*$/)
  username!: string;

  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Length(2, 120)
  displayName!: string;

  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  feishuUserId?: string;
}
