import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min } from "class-validator";

export const NOTIFICATION_EVENT_TYPES = [
  "RequirementCreated", "RequirementUpdated", "RequirementStatusChanged", "RequirementDeleted",
  "DefectCreated", "DefectUpdated", "DefectStatusChanged", "DefectCommentCreated", "DefectReplyCreated", "DefectDeleted",
  "TestCaseCreated", "TestCaseUpdated", "TestCaseExecuted", "TestCaseDeleted",
] as const;

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

  @ApiProperty({ enum: NOTIFICATION_EVENT_TYPES, isArray: true })
  @IsArray()
  @ArrayMaxSize(NOTIFICATION_EVENT_TYPES.length)
  @ArrayUnique()
  @IsIn(NOTIFICATION_EVENT_TYPES, { each: true })
  eventTypes!: string[];
}
