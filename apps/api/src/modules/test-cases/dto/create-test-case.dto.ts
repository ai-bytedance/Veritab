import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TestCaseGrade, TestCaseStatus } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from "class-validator";

export class CreateTestCaseDto {
  @ApiProperty()
  @IsString()
  @Length(2, 300)
  title!: string;

  @ApiPropertyOptional({ enum: TestCaseGrade, default: TestCaseGrade.P1 })
  @IsOptional()
  @IsEnum(TestCaseGrade)
  grade?: TestCaseGrade;

  @ApiPropertyOptional({ enum: TestCaseStatus, default: TestCaseStatus.READY })
  @IsOptional()
  @IsEnum(TestCaseStatus)
  lifecycleStatus?: TestCaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  precondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  steps?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  expectedResult?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @ApiPropertyOptional({ description: "Stable client key of a test-case folder" })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  folderKey?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  linkedDefectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  releaseVersion?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMindmapMode?: boolean;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
