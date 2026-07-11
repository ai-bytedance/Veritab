import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min } from "class-validator";

export class UpdateChannelDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({ description: "HTTPS webhook endpoint; omit to retain the stored endpoint" })
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  endpoint?: string;

  @ApiPropertyOptional({ description: "Signing secret; omit to retain the stored secret" })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  secret?: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
