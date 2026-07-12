import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateMemberInvitationDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail()
  email!: string;

  @IsIn(["org_admin", "developer", "tester", "viewer"])
  roleCode!: "org_admin" | "developer" | "tester" | "viewer";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours = 24;
}
