import { IsIn, IsUUID } from "class-validator";

export class ListFilesDto {
  @IsIn(["REQUIREMENT", "DEFECT", "TEST_CASE"])
  resourceType!: string;

  @IsUUID()
  resourceId!: string;
}
