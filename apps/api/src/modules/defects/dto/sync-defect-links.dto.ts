import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsInt, IsUUID, Min } from "class-validator";

export class SyncDefectLinksDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  requirementIds!: string[];

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  testCaseIds!: string[];
}
