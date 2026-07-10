export interface FileChange {
  filename: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  diff: string;
}

export interface CommitData {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  branch: string;
  files: FileChange[];
}

export interface AIStructuredReport {
  summary: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CLEAN";
  defects: {
    title: string;
    severity: "致命" | "严重" | "一般" | "提示";
    description: string;
    fix: string;
  }[];
  suggestedCode?: string;
  testCase?: {
    name: string;
    precondition: string;
    steps: string;
    expectedResult: string;
    unitTestCode?: string;
  };
}
