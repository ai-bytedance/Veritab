import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

const menuKeys = ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"] as const;

export class UpdateOrganizationSettingsDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  brandName?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  brandDescription?: string;

  @ApiPropertyOptional({ enum: menuKeys, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(menuKeys.length)
  @IsIn(menuKeys, { each: true })
  visibleMenus?: string[];

  @ApiPropertyOptional({ maxLength: 30000 })
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  testCasePromptTemplate?: string;

  @ApiPropertyOptional({ maxLength: 30000 })
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  requirementPromptTemplate?: string;

  @ApiPropertyOptional({ maxLength: 30000 })
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  defectPromptTemplate?: string;

  @ApiPropertyOptional({ maxLength: 30000 })
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  reportPromptTemplate?: string;
}
