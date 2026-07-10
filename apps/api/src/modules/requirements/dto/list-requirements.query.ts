import { ApiPropertyOptional } from "@nestjs/swagger";
import { RequirementPriority, RequirementStatus, RequirementType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export enum RequirementSortField {
  UPDATED_AT = "updatedAt",
  CREATED_AT = "createdAt",
  PRIORITY = "priority",
  SORT_ORDER = "sortOrder",
}

export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

export class ListRequirementsQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ format: "uuid", description: "Last item ID from the previous page" })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, description: "Page-number compatibility mode; do not combine with cursor" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Case-insensitive title/description search" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: RequirementStatus })
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @ApiPropertyOptional({ enum: RequirementPriority })
  @IsOptional()
  @IsEnum(RequirementPriority)
  priority?: RequirementPriority;

  @ApiPropertyOptional({ enum: RequirementType })
  @IsOptional()
  @IsEnum(RequirementType)
  type?: RequirementType;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  iterationId?: string;

  @ApiPropertyOptional({ enum: RequirementSortField, default: RequirementSortField.UPDATED_AT })
  @IsOptional()
  @IsEnum(RequirementSortField)
  sortBy: RequirementSortField = RequirementSortField.UPDATED_AT;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection: SortDirection = SortDirection.DESC;
}
