import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GitRepositoryStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Length, Matches, MaxLength, Min } from "class-validator";

export class UpdateGitRepositoryDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(1000)
  webUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  defaultBranch?: string;

  @ApiPropertyOptional({ enum: GitRepositoryStatus })
  @IsOptional()
  @IsEnum(GitRepositoryStatus)
  status?: GitRepositoryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(vault|aws-secrets|gcp-secrets|azure-keyvault|env):\/\//)
  credentialRef?: string;
}
