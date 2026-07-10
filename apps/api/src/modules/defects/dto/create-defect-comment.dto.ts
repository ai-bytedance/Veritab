import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateDefectCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 10_000 })
  @IsString()
  @Length(1, 10_000)
  content!: string;

  @ApiPropertyOptional({ format: "uuid", description: "Parent comment for a reply" })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
