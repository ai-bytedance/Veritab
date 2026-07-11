/**
 * ID formats and generators for Requirements, Defects, and TestCases.
 * Ensures completely unique, non-conflicting ID design.
 */

const transientId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;

// These IDs exist only while optimistic UI state is awaiting the server response.
// Durable display numbers and UUIDs are assigned by PostgreSQL-backed APIs.
export const generateReqId = (): string => transientId("issue-req");
export const generateDefectId = (): string => transientId("issue-df");
export const generateCaseId = (): string => transientId("case");

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
