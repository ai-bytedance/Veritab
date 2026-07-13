import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListUsersQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED", "DEACTIVATED"])
  status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
