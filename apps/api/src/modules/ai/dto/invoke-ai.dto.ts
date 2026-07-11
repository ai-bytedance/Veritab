import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class InvokeAiDto {
  @ApiProperty({ minLength: 1, maxLength: 30000 })
  @IsString()
  @Length(1, 30000)
  prompt!: string;
}
