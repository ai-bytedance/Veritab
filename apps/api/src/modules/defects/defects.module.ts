import { Module } from "@nestjs/common";
import { DefectWorkflowService } from "./defect-workflow.service";
import { DefectsController } from "./defects.controller";
import { DefectsService } from "./defects.service";

@Module({
  controllers: [DefectsController],
  providers: [DefectsService, DefectWorkflowService],
  exports: [DefectsService],
})
export class DefectsModule {}
