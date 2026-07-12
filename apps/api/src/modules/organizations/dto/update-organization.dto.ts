import { IsInt, IsString, Length, Min } from "class-validator";

export class UpdateOrganizationDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @Length(2, 160)
  name!: string;
}
