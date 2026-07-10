/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Project,
  Issue,
  TestCase,
  IssueType,
  TestCaseStatus,
  DefectStatus,
  DefectSeverity,
  RequirementStatus,
  User,
  UserGroup
} from "../types";
import ProjectReportModal from "./ProjectReportModal";
import ProjectSpaceHeader from "./ProjectSpaceHeader";
import ProjectSpaceStats from "./ProjectSpaceStats";
import ProjectSpaceRequirements from "./ProjectSpaceRequirements";
import ProjectSpaceTestCases from "./ProjectSpaceTestCases";
import ProjectSpaceDefects from "./ProjectSpaceDefects";

interface ProjectSpaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  issues: Issue[];
  testCases: TestCase[];
  users: User[];
  onInvokeAI: (prompt: string) => Promise<string>;
  onAddTestCase: (testCase: Partial<TestCase>) => void;
  currentUser?: User;
  userGroups?: UserGroup[];
}

export default function ProjectSpace({
  project,
  onUpdateProject,
  issues,
  testCases,
  users,
  onInvokeAI,
  onAddTestCase,
  currentUser,
  userGroups,
}: ProjectSpaceProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);

  // 1. Filter project-specific data
  const projIssues = issues.filter((i) => i.projectId === project.id);
  const requirements = projIssues.filter((i) => i.type === IssueType.REQUIREMENT);
  const defects = projIssues.filter((i) => i.type === IssueType.DEFECT);
  const projTestCases = testCases.filter((tc) => tc.projectId === project.id);

  // 2. Metrics Calculations for Report Modal
  const passedCases = projTestCases.filter((tc) => tc.status === TestCaseStatus.PASS).length;
  const passRate = projTestCases.length > 0 ? Math.round((passedCases / projTestCases.length) * 100) : 0;

  // Defect counts by severity
  const fatalDefects = defects.filter((d) => d.severity === DefectSeverity.FATAL).length;
  const seriousDefects = defects.filter((d) => d.severity === DefectSeverity.SERIOUS).length;
  const normalDefects = defects.filter((d) => d.severity === DefectSeverity.NORMAL).length;
  const promptDefects = defects.filter((d) => d.severity === DefectSeverity.PROMPT).length;

  const resolvedDefectsCount = defects.filter(
    (d) => d.defectStatus === DefectStatus.CLOSED || d.defectStatus === DefectStatus.RESOLVED
  ).length;
  const defectResolveRate = defects.length > 0 ? Math.round((resolvedDefectsCount / defects.length) * 100) : 100;

  // Requirements Progress distribution
  const reqDraftReviewCount = requirements.filter(
    (r) => r.requirementStatus === RequirementStatus.DRAFT || r.requirementStatus === RequirementStatus.UNDER_REVIEW || !r.requirementStatus
  ).length;
  const reqDevCount = requirements.filter((r) => r.requirementStatus === RequirementStatus.DEVELOPING).length;
  const reqTestingCount = requirements.filter(
    (r) => r.requirementStatus === RequirementStatus.TESTING || r.requirementStatus === RequirementStatus.ACCEPTING
  ).length;
  const reqCompletedCount = requirements.filter((r) => r.requirementStatus === RequirementStatus.COMPLETED).length;

  // Requirements coverage
  let reqUncoveredCount = 0;
  requirements.forEach((req) => {
    const linkedTCs = projTestCases.filter((tc) => tc.linkedRequirementId === req.id);
    const extraLinkedTCs = (req.linkToTestCases || []).map((id) => projTestCases.find((tc) => tc.id === id)).filter(Boolean);
    if (linkedTCs.length === 0 && extraLinkedTCs.length === 0) {
      reqUncoveredCount++;
    }
  });

  const progressScore = requirements.length > 0 ? Math.round((reqCompletedCount / requirements.length) * 100) : 100;
  const healthScore = Math.round(0.4 * progressScore + 0.4 * passRate + 0.2 * defectResolveRate);

  return (
    <div className="space-y-5 flex flex-col h-full" id="project-space-main">
      {/* 1. Header (Configuration & Trigger AI) */}
      <ProjectSpaceHeader
        project={project}
        onUpdateProject={onUpdateProject}
        onOpenReport={() => setIsReportOpen(true)}
        currentUser={currentUser}
        userGroups={userGroups}
      />

      {/* 2. Micro-stats cards block */}
      <ProjectSpaceStats
        requirements={requirements}
        defects={defects}
        projTestCases={projTestCases}
      />

      {/* 3. Main content workspace grid */}
      <div className="grid gap-5 md:grid-cols-12 flex-1">
        {/* Requirements phase timeline pipeline (col-span-6 on desktop) */}
        <ProjectSpaceRequirements
          requirements={requirements}
        />

        {/* Test cases progress & coverage radial meters (col-span-6 on desktop) */}
        <ProjectSpaceTestCases
          projTestCases={projTestCases}
          requirements={requirements}
        />

        {/* Full-width: Defect governance and convergence SVG trend charts */}
        <ProjectSpaceDefects
          defects={defects}
          users={users}
        />
      </div>

      {/* Report Modal Component */}
      <ProjectReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        project={project}
        requirements={requirements}
        defects={defects}
        projTestCases={projTestCases}
        onInvokeAI={onInvokeAI}
      />
    </div>
  );
}
