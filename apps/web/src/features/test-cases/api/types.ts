export interface TestCaseApiScope {
  organizationId: string;
  projectSpaceId: string;
}

type ApiTestCaseGrade = "P0" | "P1" | "P2" | "P3";
export type ApiTestResultStatus = "UNTESTED" | "PASS" | "FAIL" | "BLOCKED";

export interface ApiTestCaseExecution {
  id: string;
  status: ApiTestResultStatus;
  actualResult: string | null;
  environment: string | null;
  stepResults: Record<string, string> | null;
  stepNotes: Record<string, string> | null;
  definitionSnapshot: { title: string; precondition: string | null; steps: string | null; expectedResult: string | null; version: number } | null;
  startedAt: string | null;
  completedAt: string;
  executedBy: { id: string; username: string; displayName: string };
}

export interface ApiTestCase {
  id: string;
  projectSpaceId: string;
  displayNo: string;
  title: string;
  grade: ApiTestCaseGrade;
  precondition: string | null;
  steps: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  executionStatus: ApiTestResultStatus;
  creatorId: string;
  assigneeId: string | null;
  requirementId: string | null;
  releaseVersion: string | null;
  tags: string[];
  module: string | null;
  isMindmapMode: boolean;
  stepResults: Record<string, "pass" | "fail" | "blocked" | "untested"> | null;
  stepNotes: Record<string, string> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  folder: { clientKey: string; name: string } | null;
  defectLinks: Array<{ defectId: string; defect: { id: string; displayNo: string; title: string } }>;
  executions?: ApiTestCaseExecution[];
}

interface ApiTestCaseFolder {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  createdAt: string;
}

export interface ApiTestCaseMindmap {
  version: number;
  updatedAt: string | null;
  folders: ApiTestCaseFolder[];
  testCases: ApiTestCase[];
  requirements: Array<{
    id: string;
    displayNo: string;
    title: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
