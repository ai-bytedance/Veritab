import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

export class CreateUploadDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @Length(1, 255)
  fileName!: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @Length(1, 160)
  contentType!: string;

  @ApiProperty({ minimum: 1, maximum: 104857600 })
  @IsInt()
  @Min(1)
  @Max(104857600)
  size!: number;

  @ApiPropertyOptional({ description: "Lowercase SHA-256 hex digest" })
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  checksumSha256?: string;
}
