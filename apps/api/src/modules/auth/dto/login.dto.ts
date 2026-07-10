import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@example.com", description: "Username or email address" })
  @IsString()
  @Length(1, 320)
  identifier!: string;

  @ApiProperty({ format: "password", writeOnly: true })
  @IsString()
  @Length(8, 128)
  password!: string;
}
