import { BadRequestException } from "@nestjs/common";
import { DefectStatus } from "@prisma/client";
import { DefectWorkflowService } from "./defect-workflow.service";

describe("DefectWorkflowService", () => {
  const service = new DefectWorkflowService();

  it.each([
    [DefectStatus.OPEN, DefectStatus.IN_PROGRESS],
    [DefectStatus.OPEN, DefectStatus.REJECTED],
    [DefectStatus.IN_PROGRESS, DefectStatus.RESOLVED],
    [DefectStatus.RESOLVED, DefectStatus.VERIFIED],
    [DefectStatus.VERIFIED, DefectStatus.CLOSED],
    [DefectStatus.CLOSED, DefectStatus.REOPENED],
    [DefectStatus.REOPENED, DefectStatus.IN_PROGRESS],
  ])("allows %s -> %s", (from, to) => {
    expect(() => service.assertTransition(from, to)).not.toThrow();
  });

  it("rejects closing an in-progress defect without resolution and verification", () => {
    expect(() => service.assertTransition(DefectStatus.IN_PROGRESS, DefectStatus.CLOSED)).toThrow(
      BadRequestException,
    );
  });

  it("returns the legal transitions for a resolved defect", () => {
    expect(service.availableTransitions(DefectStatus.RESOLVED)).toEqual([
      DefectStatus.VERIFIED,
      DefectStatus.REOPENED,
    ]);
  });
});
