import { IsString, Length, Matches, MinLength } from "class-validator";

export class AcceptInvitationDto {
  @IsString()
  @Length(40, 100)
  token!: string;

  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  username!: string;

  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}
