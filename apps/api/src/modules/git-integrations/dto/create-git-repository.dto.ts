import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GitProvider } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl, Length, Matches, MaxLength } from "class-validator";

export class CreateGitRepositoryDto {
  @ApiProperty({ enum: GitProvider })
  @IsEnum(GitProvider)
  provider!: GitProvider;

  @ApiProperty({ example: "ai-bytedance/Veritab" })
  @IsString()
  @Length(3, 500)
  @Matches(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
  repositoryKey!: string;

  @ApiProperty({ example: "Veritab" })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(1000)
  webUrl!: string;

  @ApiPropertyOptional({ default: "main" })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  defaultBranch?: string;

  @ApiPropertyOptional({ description: "Secret-manager reference; never a plaintext token" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(vault|aws-secrets|gcp-secrets|azure-keyvault|env):\/\//)
  credentialRef?: string;
}
