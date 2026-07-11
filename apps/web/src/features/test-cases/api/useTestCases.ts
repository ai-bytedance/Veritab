import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Folder, IssueType, TestCase, TestCaseGrade, TestCaseStatus } from "../../../types";
import { CreateTestCaseInput, testCasesApi, UpdateTestCaseInput } from "./testCasesApi";
import { ApiTestCase, ApiTestCaseMindmap, ApiTestResultStatus, TestCaseApiScope } from "./types";

const gradeToUi = {
  P0: TestCaseGrade.P0,
  P1: TestCaseGrade.P1,
  P2: TestCaseGrade.P2,
  P3: TestCaseGrade.P3,
} as const;

const gradeToApi: Record<TestCaseGrade, "P0" | "P1" | "P2" | "P3"> = {
  [TestCaseGrade.P0]: "P0",
  [TestCaseGrade.P1]: "P1",
  [TestCaseGrade.P2]: "P2",
  [TestCaseGrade.P3]: "P3",
};

const statusToUi: Record<ApiTestResultStatus, TestCaseStatus> = {
  UNTESTED: TestCaseStatus.UNTESTED,
  PASS: TestCaseStatus.PASS,
  FAIL: TestCaseStatus.FAIL,
  BLOCKED: TestCaseStatus.BLOCKED,
};

const statusToApi: Record<TestCaseStatus, ApiTestResultStatus> = {
  [TestCaseStatus.UNTESTED]: "UNTESTED",
  [TestCaseStatus.PASS]: "PASS",
  [TestCaseStatus.FAIL]: "FAIL",
  [TestCaseStatus.BLOCKED]: "BLOCKED",
};

function queryKey(scope: TestCaseApiScope | undefined) {
  return ["test-case-mindmap", scope?.organizationId, scope?.projectSpaceId] as const;
}

function toTestCase(value: ApiTestCase, projectId: string): TestCase {
  return {
    id: value.id,
    displayNo: value.displayNo,
    revision: value.version,
    projectId,
    name: value.title,
    grade: gradeToUi[value.grade],
    precondition: value.precondition || "",
    steps: value.steps || "",
    expectedResult: value.expectedResult || "",
    actualResult: value.actualResult || undefined,
    status: statusToUi[value.executionStatus],
    linkedRequirementId: value.requirementId || undefined,
    linkedDefectId: value.defectLinks[0]?.defectId,
    creatorId: value.creatorId,
    assigneeId: value.assigneeId || undefined,
    version: value.releaseVersion || undefined,
    tags: value.tags.join(", "),
    module: value.module || undefined,
    isMindmapMode: value.isMindmapMode,
    folderId: value.folder?.clientKey,
    stepResults: value.stepResults
      ? Object.fromEntries(Object.entries(value.stepResults).map(([key, result]) => [Number(key), result]))
      : undefined,
    stepNotes: value.stepNotes
      ? Object.fromEntries(Object.entries(value.stepNotes).map(([key, note]) => [Number(key), note]))
      : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function createInput(value: TestCase): CreateTestCaseInput {
  return {
    title: value.name,
    grade: gradeToApi[value.grade],
    precondition: value.precondition || undefined,
    steps: value.steps || undefined,
    expectedResult: value.expectedResult || undefined,
    requirementId: value.linkedRequirementId,
    folderKey: value.folderId,
    assigneeId: value.assigneeId,
    linkedDefectId: value.linkedDefectId,
    releaseVersion: value.version,
    tags: value.tags?.split(/[，,\s]+/).map((tag) => tag.trim()).filter(Boolean),
    module: value.module,
    isMindmapMode: value.isMindmapMode,
  };
}

function updateInput(value: TestCase, version: number): UpdateTestCaseInput {
  return {
    ...createInput(value),
    version,
    requirementId: value.linkedRequirementId || null,
    folderKey: value.folderId || null,
    assigneeId: value.assigneeId || null,
    linkedDefectId: value.linkedDefectId || null,
    releaseVersion: value.version || null,
    module: value.module || null,
  };
}

function isExecutionChange(current: ApiTestCase, target: TestCase): boolean {
  return (
    current.executionStatus !== statusToApi[target.status] ||
    (current.actualResult || undefined) !== target.actualResult ||
    JSON.stringify(current.stepResults || {}) !== JSON.stringify(target.stepResults || {}) ||
    JSON.stringify(current.stepNotes || {}) !== JSON.stringify(target.stepNotes || {})
  );
}

function isDefinitionChange(current: ApiTestCase, target: TestCase): boolean {
  const input = createInput(target);
  return (
    current.title !== input.title ||
    current.grade !== input.grade ||
    (current.precondition || undefined) !== input.precondition ||
    (current.steps || undefined) !== input.steps ||
    (current.expectedResult || undefined) !== input.expectedResult ||
    (current.requirementId || undefined) !== input.requirementId ||
    (current.folder?.clientKey || undefined) !== input.folderKey ||
    (current.assigneeId || undefined) !== input.assigneeId ||
    (current.defectLinks[0]?.defectId || undefined) !== input.linkedDefectId ||
    (current.releaseVersion || undefined) !== input.releaseVersion ||
    current.tags.join(",") !== (input.tags || []).join(",") ||
    (current.module || undefined) !== input.module ||
    current.isMindmapMode !== Boolean(input.isMindmapMode)
  );
}

export function useTestCaseBridge(scope: TestCaseApiScope | undefined, projectId: string) {
  const client = useQueryClient();
  const key = queryKey(scope);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const query = useQuery({ queryKey: key, queryFn: () => testCasesApi.mindmap(scope!), enabled: Boolean(scope) });

  const createMutation = useMutation({
    scope: { id: "test-case-write-queue" },
    mutationFn: (value: TestCase) => testCasesApi.create(scope!, createInput(value)),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const updateMutation = useMutation({
    scope: { id: "test-case-write-queue" },
    mutationFn: async (target: TestCase) => {
      const document = client.getQueryData<ApiTestCaseMindmap>(key);
      let current = document?.testCases.find((item) => item.id === target.id);
      if (!current) throw new Error("Test case is no longer present in the server document");
      if (isDefinitionChange(current, target)) {
        current = await testCasesApi.update(scope!, target.id, updateInput(target, current.version));
      }
      if (isExecutionChange(current, target)) {
        const result = await testCasesApi.execute(scope!, target.id, {
          version: current.version,
          status: statusToApi[target.status],
          actualResult: target.actualResult,
          stepResults: target.stepResults,
          stepNotes: target.stepNotes,
        });
        current = result.testCase;
      }
      return current;
    },
    onSuccess: (updated) => {
      client.setQueryData<ApiTestCaseMindmap>(key, (document) =>
        document
          ? { ...document, testCases: document.testCases.map((item) => (item.id === updated.id ? updated : item)) }
          : document,
      );
      void client.invalidateQueries({ queryKey: ["resource-history", "test-cases", scope?.organizationId, scope?.projectSpaceId, updated.id] });
    },
    onError: () => client.invalidateQueries({ queryKey: key }),
  });
  const deleteMutation = useMutation({
    scope: { id: "test-case-write-queue" },
    mutationFn: async (id: string) => {
      const current = client.getQueryData<ApiTestCaseMindmap>(key)?.testCases.find((item) => item.id === id);
      if (!current) return id;
      await testCasesApi.remove(scope!, id, current.version);
      return id;
    },
    onSuccess: (id) => {
      client.setQueryData<ApiTestCaseMindmap>(key, (document) =>
        document ? { ...document, testCases: document.testCases.filter((item) => item.id !== id) } : document,
      );
    },
  });
  const foldersMutation = useMutation({
    scope: { id: "test-case-write-queue" },
    mutationFn: (folders: Folder[]) => {
      const version = client.getQueryData<ApiTestCaseMindmap>(key)?.version ?? 1;
      return testCasesApi.syncFolders(
        scope!,
        version,
        folders.map((folder, position) => ({
          clientKey: folder.id,
          name: folder.name,
          parentKey: folder.parentId,
          position,
        })),
      );
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: () => client.invalidateQueries({ queryKey: key }),
  });

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const queueUpdate = (value: TestCase) => {
    const existing = timers.current.get(value.id);
    if (existing) clearTimeout(existing);
    timers.current.set(
      value.id,
      setTimeout(() => {
        timers.current.delete(value.id);
        updateMutation.mutate(value);
      }, 400),
    );
  };

  return {
    testCases: (query.data?.testCases || []).map((value) => toTestCase(value, projectId)),
    folders: (query.data?.folders || []).map((folder) => ({
      id: folder.id,
      projectId,
      name: folder.name,
      parentId: folder.parentId || undefined,
      createdAt: folder.createdAt,
    })),
    requirements: (query.data?.requirements || []).map((requirement) => ({
      id: requirement.id,
      displayNo: requirement.displayNo,
      projectId,
      type: IssueType.REQUIREMENT,
      title: requirement.title,
      content: requirement.description || "",
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    })),
    isLoading: query.isLoading,
    isSaving:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || foldersMutation.isPending,
    error: query.error || createMutation.error || updateMutation.error || deleteMutation.error || foldersMutation.error,
    createTestCase: (value: TestCase) => createMutation.mutate(value),
    createTestCases: async (values: TestCase[]) => {
      for (let index = 0; index < values.length; index += 1) {
        try {
          await createMutation.mutateAsync(values[index]);
        } catch (reason) {
          const detail = reason instanceof Error ? reason.message : "未知错误";
          throw new Error(`已写入 ${index} 条，第 ${index + 1} 条失败：${detail}`);
        }
      }
    },
    updateTestCase: queueUpdate,
    deleteTestCase: (id: string) => deleteMutation.mutate(id),
    deleteTestCases: (ids: string[]) => ids.forEach((id) => deleteMutation.mutate(id)),
    updateFolders: (folders: Folder[]) => foldersMutation.mutate(folders),
  };
}
