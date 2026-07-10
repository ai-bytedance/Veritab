import { Module } from "@nestjs/common";
import { ProjectSpacesController } from "./project-spaces.controller";
import { ProjectSpacesService } from "./project-spaces.service";

@Module({ controllers: [ProjectSpacesController], providers: [ProjectSpacesService] })
export class ProjectSpacesModule {}
