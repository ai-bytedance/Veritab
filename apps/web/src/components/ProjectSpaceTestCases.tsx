/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldAlert, CheckCircle, AlertTriangle, Play, HelpCircle, Activity } from "lucide-react";
import { TestCase, TestCaseStatus, Issue, RequirementPriority } from "../types";

interface ProjectSpaceTestCasesProps {
  projTestCases: TestCase[];
  requirements: Issue[];
}

export default function ProjectSpaceTestCases({
  projTestCases,
  requirements,
}: ProjectSpaceTestCasesProps) {
  const totalTCs = projTestCases.length;
  const passedTCs = projTestCases.filter((tc) => tc.status === TestCaseStatus.PASS).length;
  const failedTCs = projTestCases.filter((tc) => tc.status === TestCaseStatus.FAIL).length;
  const blockedTCs = projTestCases.filter((tc) => tc.status === TestCaseStatus.BLOCKED).length;
  const untestedTCs = projTestCases.filter((tc) => tc.status === TestCaseStatus.UNTESTED || !tc.status).length;

  const passRate = totalTCs > 0 ? Math.round((passedTCs / totalTCs) * 100) : 0;

  const ptPass = totalTCs > 0 ? (passedTCs / totalTCs) * 100 : 0;
  const ptFail = totalTCs > 0 ? (failedTCs / totalTCs) * 100 : 0;
  const ptBlocked = totalTCs > 0 ? (blockedTCs / totalTCs) * 100 : 0;
  const ptUntested = totalTCs > 0 ? (untestedTCs / totalTCs) * 100 : 0;

  // Calculate coverage
  let reqUncoveredCount = 0;
  let uncoveredHighPriorityCount = 0;

  requirements.forEach((req) => {
    const linkedTCs = projTestCases.filter((tc) => tc.linkedRequirementId === req.id);
    const extraLinkedTCs = (req.linkToTestCases || []).map((id) => projTestCases.find((tc) => tc.id === id)).filter(Boolean);
    const isCovered = linkedTCs.length > 0 || extraLinkedTCs.length > 0;

    if (!isCovered) {
      reqUncoveredCount++;
      const isHighPriority = req.priority === RequirementPriority.EP || req.priority === RequirementPriority.HP1;
      if (isHighPriority) {
        uncoveredHighPriorityCount++;
      }
    }
  });

  const totalReqs = requirements.length;
  const coverageRate = totalReqs > 0 ? Math.round(((totalReqs - reqUncoveredCount) / totalReqs) * 100) : 100;

  // Radial Pass Rate Ring calculations
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (passRate / 100) * circumference;

  return (
    <div
      className="md:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 min-w-0"
      id="project-space-testcases-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 leading-tight">测试设计与覆盖</h3>
            <span className="text-[10px] text-slate-400 font-bold">用例执行状态与缺陷保障防线</span>
          </div>
        </div>
        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded shrink-0">
          通过率 {passRate}%
        </span>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 flex-1">

        {/* Left Area (sm:col-span-4) - Radial Circular Pass Rate Indicator */}
        <div className="sm:col-span-4 bg-slate-50/30 border border-slate-100 p-3 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
            执行通过比例
          </span>

          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="7"
              />
              {/* Pass rate circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#10B981"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-mono font-black text-emerald-600 leading-none">{passRate}%</span>
              <span className="text-[7.5px] font-bold text-slate-400 mt-0.5">已通过</span>
            </div>
          </div>

          <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            通过数: {passedTCs} / {totalTCs}
          </span>
        </div>

        {/* Right Area (sm:col-span-8) - Test Case execution state detail bars */}
        <div className="sm:col-span-8 flex flex-col justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase block mb-1">
              测试执行进度
            </span>

            {/* Segmented bar trackers */}
            <div className="space-y-2">
              {/* Pass bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>通过 (PASS)</span>
                  </span>
                  <span className="font-mono">{passedTCs} 个 ({Math.round(ptPass)}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${ptPass}%` }} className="h-full bg-emerald-500 transition-all duration-500" />
                </div>
              </div>

              {/* Fail bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>失败 (FAIL)</span>
                  </span>
                  <span className="font-mono">{failedTCs} 个 ({Math.round(ptFail)}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${ptFail}%` }} className="h-full bg-rose-500 transition-all duration-500" />
                </div>
              </div>

              {/* Blocked bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>阻塞 (BLOCKED)</span>
                  </span>
                  <span className="font-mono">{blockedTCs} 个 ({Math.round(ptBlocked)}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${ptBlocked}%` }} className="h-full bg-amber-500 transition-all duration-500" />
                </div>
              </div>

              {/* Untested bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>未测 (UNTESTED)</span>
                  </span>
                  <span className="font-mono">{untestedTCs} 个 ({Math.round(ptUntested)}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${ptUntested}%` }} className="h-full bg-slate-400 transition-all duration-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom simple coverage indicator badge */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-indigo-500" />
              <span>需求覆盖比例</span>
            </span>
            <span className="text-indigo-600 font-black font-mono">{coverageRate}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
