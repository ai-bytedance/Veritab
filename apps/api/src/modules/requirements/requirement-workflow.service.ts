import { BadRequestException, Injectable } from "@nestjs/common";
import { RequirementStatus } from "@prisma/client";

const transitions: Readonly<Record<RequirementStatus, readonly RequirementStatus[]>> = {
  DRAFT: [RequirementStatus.UNDER_REVIEW, RequirementStatus.CANCELLED],
  UNDER_REVIEW: [RequirementStatus.DRAFT, RequirementStatus.IN_PROGRESS, RequirementStatus.CANCELLED],
  IN_PROGRESS: [RequirementStatus.TESTING, RequirementStatus.CANCELLED],
  TESTING: [RequirementStatus.IN_PROGRESS, RequirementStatus.ACCEPTING, RequirementStatus.CANCELLED],
  ACCEPTING: [RequirementStatus.TESTING, RequirementStatus.DONE, RequirementStatus.CANCELLED],
  DONE: [RequirementStatus.IN_PROGRESS],
  CANCELLED: [RequirementStatus.DRAFT],
};

@Injectable()
export class RequirementWorkflowService {
  assertTransition(from: RequirementStatus, to: RequirementStatus): void {
    if (from === to) return;
    if (!transitions[from].includes(to)) {
      throw new BadRequestException(`Requirement cannot transition from ${from} to ${to}`);
    }
  }

  availableTransitions(from: RequirementStatus): readonly RequirementStatus[] {
    return transitions[from];
  }
}
