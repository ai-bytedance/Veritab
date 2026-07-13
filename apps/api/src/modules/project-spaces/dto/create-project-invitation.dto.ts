import { ArrayUnique, IsArray, IsUUID } from "class-validator";
export class CreateProjectInvitationDto { @IsUUID() userId!: string; @IsArray() @ArrayUnique() @IsUUID("4", { each: true }) roleIds!: string[]; }
