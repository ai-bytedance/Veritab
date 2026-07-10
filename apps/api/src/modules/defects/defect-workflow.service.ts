import { BadRequestException, Injectable } from "@nestjs/common";
import { DefectStatus } from "@prisma/client";

const transitions: Readonly<Record<DefectStatus, readonly DefectStatus[]>> = {
  OPEN: [DefectStatus.CONFIRMED, DefectStatus.IN_PROGRESS, DefectStatus.REJECTED, DefectStatus.CLOSED],
  CONFIRMED: [DefectStatus.IN_PROGRESS, DefectStatus.REJECTED],
  IN_PROGRESS: [DefectStatus.RESOLVED, DefectStatus.REJECTED],
  RESOLVED: [DefectStatus.VERIFIED, DefectStatus.REOPENED],
  VERIFIED: [DefectStatus.CLOSED, DefectStatus.REOPENED],
  CLOSED: [DefectStatus.REOPENED],
  REJECTED: [DefectStatus.REOPENED, DefectStatus.CLOSED],
  REOPENED: [DefectStatus.IN_PROGRESS, DefectStatus.RESOLVED],
};

@Injectable()
export class DefectWorkflowService {
  assertTransition(from: DefectStatus, to: DefectStatus): void {
    if (from === to) return;
    if (!transitions[from].includes(to)) {
      throw new BadRequestException(`Defect cannot transition from ${from} to ${to}`);
    }
  }

  availableTransitions(from: DefectStatus): readonly DefectStatus[] {
    return transitions[from];
  }
}
