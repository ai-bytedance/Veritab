import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@example.com", description: "Username or email address" })
  @IsString()
  @Length(1, 320)
  identifier!: string;

  @ApiProperty({ example: "ChangeMe-Immediately-123!", format: "password" })
  @IsString()
  @Length(8, 128)
  password!: string;
}
