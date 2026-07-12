import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class CreateOrganizationDto {
  @ApiProperty({ example: "Acme Research and Development" })
  @IsString()
  @Length(2, 160)
  name!: string;
}
