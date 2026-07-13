import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from "class-validator";
import { ResourceStatus } from "@prisma/client";

export class UpdateOrganizationDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;
}
