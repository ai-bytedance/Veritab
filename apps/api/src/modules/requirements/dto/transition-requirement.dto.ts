import { ApiProperty } from "@nestjs/swagger";
import { RequirementStatus } from "@prisma/client";
import { IsEnum, IsInt, Min } from "class-validator";

export class TransitionRequirementDto {
  @ApiProperty({ enum: RequirementStatus })
  @IsEnum(RequirementStatus)
  status!: RequirementStatus;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}
