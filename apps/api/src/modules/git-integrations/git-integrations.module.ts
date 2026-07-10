import { Module } from "@nestjs/common";
import { GitIntegrationsController } from "./git-integrations.controller";
import { GitIntegrationsService } from "./git-integrations.service";

@Module({ controllers: [GitIntegrationsController], providers: [GitIntegrationsService] })
export class GitIntegrationsModule {}
