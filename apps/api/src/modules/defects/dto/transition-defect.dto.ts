import { ApiProperty } from "@nestjs/swagger";
import { DefectStatus } from "@prisma/client";
import { IsEnum, IsInt, Min } from "class-validator";

export class TransitionDefectDto {
  @ApiProperty({ enum: DefectStatus })
  @IsEnum(DefectStatus)
  status!: DefectStatus;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}
