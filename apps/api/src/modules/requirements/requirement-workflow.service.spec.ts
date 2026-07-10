import { BadRequestException } from "@nestjs/common";
import { RequirementStatus } from "@prisma/client";
import { RequirementWorkflowService } from "./requirement-workflow.service";

describe("RequirementWorkflowService", () => {
  const service = new RequirementWorkflowService();

  it.each([
    [RequirementStatus.DRAFT, RequirementStatus.UNDER_REVIEW],
    [RequirementStatus.UNDER_REVIEW, RequirementStatus.IN_PROGRESS],
    [RequirementStatus.IN_PROGRESS, RequirementStatus.TESTING],
    [RequirementStatus.TESTING, RequirementStatus.ACCEPTING],
    [RequirementStatus.ACCEPTING, RequirementStatus.DONE],
    [RequirementStatus.DONE, RequirementStatus.IN_PROGRESS],
    [RequirementStatus.CANCELLED, RequirementStatus.DRAFT],
  ])("allows %s -> %s", (from, to) => {
    expect(() => service.assertTransition(from, to)).not.toThrow();
  });

  it("allows an idempotent transition to the current status", () => {
    expect(() => service.assertTransition(RequirementStatus.TESTING, RequirementStatus.TESTING)).not.toThrow();
  });

  it("rejects skipping required workflow gates", () => {
    expect(() => service.assertTransition(RequirementStatus.DRAFT, RequirementStatus.DONE)).toThrow(
      BadRequestException,
    );
  });

  it("reports only the next legal transitions", () => {
    expect(service.availableTransitions(RequirementStatus.TESTING)).toEqual([
      RequirementStatus.IN_PROGRESS,
      RequirementStatus.ACCEPTING,
      RequirementStatus.CANCELLED,
    ]);
  });
});
