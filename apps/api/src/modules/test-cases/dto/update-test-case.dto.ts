import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TestCaseGrade, TestCaseStatus } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

export class UpdateTestCaseDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @ApiPropertyOptional({ enum: TestCaseGrade })
  @IsOptional()
  @IsEnum(TestCaseGrade)
  grade?: TestCaseGrade;

  @ApiPropertyOptional({ enum: TestCaseStatus })
  @IsOptional()
  @IsEnum(TestCaseStatus)
  lifecycleStatus?: TestCaseStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  precondition?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  steps?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  expectedResult?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  requirementId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(1, 120)
  folderKey?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  linkedDefectId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  releaseVersion?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  module?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMindmapMode?: boolean;

  @ApiPropertyOptional({ type: "object", additionalProperties: true, nullable: true })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown> | null;
}
