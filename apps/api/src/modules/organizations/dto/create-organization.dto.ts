import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class CreateOrganizationDto {
  @ApiProperty({ example: "acme-rd" })
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiProperty({ example: "Acme Research and Development" })
  @IsString()
  @Length(2, 160)
  name!: string;
}
