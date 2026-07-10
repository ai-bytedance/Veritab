/**
 * ID formats and generators for Requirements, Defects, and TestCases.
 * Ensures completely unique, non-conflicting ID design.
 */

import { INITIAL_ISSUES, INITIAL_TEST_CASES } from "../demo/data";
import { Issue, TestCase, IssueType } from "../types";

// Helper to get stored issues or test cases directly from localStorage
const getStoredIssues = (): Issue[] => {
  if (typeof window === "undefined") return INITIAL_ISSUES;
  try {
    const data = localStorage.getItem("veritab_issues");
    return data ? JSON.parse(data) : INITIAL_ISSUES;
  } catch (e) {
    return INITIAL_ISSUES;
  }
};

const getStoredTestCases = (): TestCase[] => {
  if (typeof window === "undefined") return INITIAL_TEST_CASES;
  try {
    const data = localStorage.getItem("veritab_test_cases");
    return data ? JSON.parse(data) : INITIAL_TEST_CASES;
  } catch (e) {
    return INITIAL_TEST_CASES;
  }
};

/**
 * ID formats and generators for Requirements, Defects, and TestCases.
 * Uses purely numeric auto-incrementing sequential integers instead of random strings.
 */

export const generateReqId = (): string => {
  const issues = getStoredIssues();
  const reqIssues = issues.filter(i => i.type === IssueType.REQUIREMENT);

  let maxId = 100000; // Start at 100000 so the first new ID is 100001
  reqIssues.forEach(req => {
    const id = req.id;
    const numPart = id.replace(/[^0-9]/g, "");
    if (numPart) {
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxId && parsed < 100000000) {
        maxId = parsed;
      }
    }
  });

  // Also check localStorage counter fallback
  if (typeof window !== "undefined") {
    const localSaved = localStorage.getItem("counter-issue-req-");
    if (localSaved) {
      const parsedLocal = parseInt(localSaved, 10);
      if (!isNaN(parsedLocal) && parsedLocal > maxId && parsedLocal < 100000000) {
        maxId = parsedLocal;
      }
    }
  }

  const nextId = maxId + 1;
  if (typeof window !== "undefined") {
    localStorage.setItem("counter-issue-req-", nextId.toString());
  }
  return `issue-req-${nextId}`;
};

export const generateDefectId = (): string => {
  const issues = getStoredIssues();
  const defectIssues = issues.filter(i => i.type === IssueType.DEFECT);

  let maxId = 100000; // Start at 100000 so the first new ID is 100001
  defectIssues.forEach(df => {
    const id = df.id;
    const numPart = id.replace(/[^0-9]/g, "");
    if (numPart) {
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxId && parsed < 100000000) {
        maxId = parsed;
      }
    }
  });

  // Also check localStorage counter fallback
  if (typeof window !== "undefined") {
    const localSaved = localStorage.getItem("counter-issue-df-");
    if (localSaved) {
      const parsedLocal = parseInt(localSaved, 10);
      if (!isNaN(parsedLocal) && parsedLocal > maxId && parsedLocal < 100000000) {
        maxId = parsedLocal;
      }
    }
  }

  const nextId = maxId + 1;
  if (typeof window !== "undefined") {
    localStorage.setItem("counter-issue-df-", nextId.toString());
  }
  return `issue-df-${nextId}`;
};

export const generateCaseId = (): string => {
  const cases = getStoredTestCases();

  let maxId = 100000; // Start at 100000 so the first new ID is 100001
  cases.forEach(tc => {
    const id = tc.id;
    const numPart = id.replace(/[^0-9]/g, "");
    if (numPart) {
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxId && parsed < 100000000) {
        maxId = parsed;
      }
    }
  });

  // Also check localStorage counter fallback
  if (typeof window !== "undefined") {
    const localSaved = localStorage.getItem("counter-case-");
    if (localSaved) {
      const parsedLocal = parseInt(localSaved, 10);
      if (!isNaN(parsedLocal) && parsedLocal > maxId && parsedLocal < 100000000) {
        maxId = parsedLocal;
      }
    }
  }

  const nextId = maxId + 1;
  if (typeof window !== "undefined") {
    localStorage.setItem("counter-case-", nextId.toString());
  }
  return `case-${nextId}`;
};

export const formatCaseId = (id: string): string => {
  if (!id) return "";
  let cleanId = id;
  if (cleanId.startsWith("case-ai-")) {
    cleanId = cleanId.substring(8);
  } else if (cleanId.startsWith("case-")) {
    cleanId = cleanId.substring(5);
  } else if (cleanId.startsWith("tc-")) {
    cleanId = cleanId.substring(3);
  }
  return `#TC-${cleanId}`;
};

export const formatReqId = (id: string): string => {
  if (!id) return "";
  let cleanId = id;
  if (cleanId.startsWith("issue-req-")) {
    cleanId = cleanId.substring(10);
  } else if (cleanId.startsWith("req-")) {
    cleanId = cleanId.substring(4);
  } else if (cleanId.startsWith("issue-")) {
    cleanId = cleanId.substring(6);
  }
  return `#REQ-${cleanId}`;
};

export const formatDefectId = (id: string): string => {
  if (!id) return "";
  let cleanId = id;
  if (cleanId.startsWith("issue-defect-")) {
    cleanId = cleanId.substring(13);
  } else if (cleanId.startsWith("issue-df-idx-")) {
    cleanId = cleanId.substring(13);
  } else if (cleanId.startsWith("issue-df-")) {
    cleanId = cleanId.substring(9);
  } else if (cleanId.startsWith("defect-")) {
    cleanId = cleanId.substring(7);
  } else if (cleanId.startsWith("issue-")) {
    cleanId = cleanId.substring(6);
  }
  return `#DEF-${cleanId}`;
};
