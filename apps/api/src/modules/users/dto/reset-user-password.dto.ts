import { IsString, MinLength } from "class-validator";

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(12)
  password!: string;
}
