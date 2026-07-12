import { WebhookProvider } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUrl, Length, MaxLength } from "class-validator";

export class RequestNotificationDto {
  @ApiProperty({ enum: ["FEISHU", "WECOM", "DINGTALK"] })
  @IsEnum(WebhookProvider)
  provider!: WebhookProvider;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @Length(1, 300)
  title!: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ["https", "http"], require_protocol: true })
  @MaxLength(2048)
  link?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dedupeKey?: string;
}
