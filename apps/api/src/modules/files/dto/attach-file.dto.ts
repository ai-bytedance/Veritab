import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsUUID } from "class-validator";

export class AttachFileDto {
  @ApiProperty({ enum: ["REQUIREMENT", "DEFECT", "TEST_CASE"] })
  @IsIn(["REQUIREMENT", "DEFECT", "TEST_CASE"])
  resourceType!: "REQUIREMENT" | "DEFECT" | "TEST_CASE";

  @ApiProperty()
  @IsUUID()
  resourceId!: string;
}
