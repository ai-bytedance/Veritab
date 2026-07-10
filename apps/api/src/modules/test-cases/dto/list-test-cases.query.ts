import { ApiPropertyOptional } from "@nestjs/swagger";
import { TestCaseGrade, TestCaseStatus, TestResultStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class ListTestCasesQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: TestCaseGrade })
  @IsOptional()
  @IsEnum(TestCaseGrade)
  grade?: TestCaseGrade;

  @ApiPropertyOptional({ enum: TestCaseStatus })
  @IsOptional()
  @IsEnum(TestCaseStatus)
  lifecycleStatus?: TestCaseStatus;

  @ApiPropertyOptional({ enum: TestResultStatus })
  @IsOptional()
  @IsEnum(TestResultStatus)
  executionStatus?: TestResultStatus;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folderKey?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 100;
}
