import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsUUID } from "class-validator";

export class SyncCodeChangeLinksDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMaxSize(100) @IsUUID(undefined, { each: true }) requirementIds!: string[];
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMaxSize(100) @IsUUID(undefined, { each: true }) defectIds!: string[];
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMaxSize(100) @IsUUID(undefined, { each: true }) testCaseIds!: string[];
}
