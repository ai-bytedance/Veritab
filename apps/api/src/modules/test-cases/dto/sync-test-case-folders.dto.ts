import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Length, Min, ValidateNested } from "class-validator";

export class TestCaseFolderInputDto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  clientKey!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  parentKey?: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}

export class SyncTestCaseFoldersDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ type: [TestCaseFolderInputDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => TestCaseFolderInputDto)
  folders!: TestCaseFolderInputDto[];
}
