import { Transform } from "class-transformer";
import { IsEmail, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateMemberInvitationDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail()
  email!: string;

  @IsString() @Length(2, 64)
  roleCode!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours = 24;
}
