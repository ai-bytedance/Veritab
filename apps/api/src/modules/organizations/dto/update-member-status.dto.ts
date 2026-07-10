import { MembershipStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateMemberStatusDto {
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
