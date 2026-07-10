import { Module } from "@nestjs/common";
import { RequirementWorkflowService } from "./requirement-workflow.service";
import { RequirementsController } from "./requirements.controller";
import { RequirementsService } from "./requirements.service";

@Module({
  controllers: [RequirementsController],
  providers: [RequirementsService, RequirementWorkflowService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
