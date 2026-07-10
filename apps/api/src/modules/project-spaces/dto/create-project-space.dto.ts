import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateProjectSpaceDto {
  @ApiProperty({ example: "VT" })
  @IsString()
  @Length(2, 16)
  @Matches(/^[A-Z][A-Z0-9]*$/)
  key!: string;

  @ApiProperty({ example: "Veritab Platform" })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}
