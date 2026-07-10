import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PullRequestStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ImportedCodeFileDto {
  @IsString() @Length(1, 1000) path!: string;
  @IsString() @Matches(/^(added|modified|deleted|renamed)$/) status!: string;
  @IsInt() @Min(0) additions = 0;
  @IsInt() @Min(0) deletions = 0;
  @IsOptional() @IsString() @MaxLength(200_000) patch?: string;
}

export class ImportedCommitDto {
  @IsString() @Matches(/^[a-fA-F0-9]{7,64}$/) sha!: string;
  @IsString() @Length(1, 500) title!: string;
  @IsOptional() @IsString() @MaxLength(255) branch?: string;
  @IsOptional() @IsString() @MaxLength(160) authorName?: string;
  @IsOptional() @IsEmail() authorEmail?: string;
  @IsOptional() @IsUrl({ protocols: ["https"], require_protocol: true }) @MaxLength(1000) webUrl?: string;
  @IsISO8601() committedAt!: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ImportedCodeFileDto) files!: ImportedCodeFileDto[];
}

export class ImportedPullRequestDto {
  @IsString() @Length(1, 100) externalId!: string;
  @IsInt() @Min(1) number!: number;
  @IsString() @Length(1, 500) title!: string;
  @IsEnum(PullRequestStatus) status!: PullRequestStatus;
  @IsString() @Length(1, 255) sourceBranch!: string;
  @IsString() @Length(1, 255) targetBranch!: string;
  @IsOptional() @IsString() @MaxLength(160) authorName?: string;
  @IsOptional() @IsUrl({ protocols: ["https"], require_protocol: true }) @MaxLength(1000) webUrl?: string;
  @IsOptional() @Matches(/^[a-fA-F0-9]{7,64}$/) mergeCommitSha?: string;
  @IsOptional() @IsISO8601() openedAt?: string;
  @IsOptional() @IsISO8601() mergedAt?: string;
  @IsOptional() @IsISO8601() closedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ImportGitChangesDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  deliveryId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  eventType!: string;

  @ApiProperty({ type: [ImportedCommitDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ImportedCommitDto)
  commits!: ImportedCommitDto[];

  @ApiPropertyOptional({ type: [ImportedPullRequestDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ImportedPullRequestDto)
  pullRequests?: ImportedPullRequestDto[];
}
