import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TestResultStatus } from "@prisma/client";
import { IsEnum, IsInt, IsISO8601, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class ExecuteTestCaseDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ enum: TestResultStatus })
  @IsEnum(TestResultStatus)
  status!: TestResultStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  actualResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  environment?: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  stepResults?: Record<string, unknown>;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  stepNotes?: Record<string, unknown>;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;
}
