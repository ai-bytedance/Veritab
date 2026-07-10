/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Workflow, Compass, Layers, CheckCircle2, Flame, ArrowRight } from "lucide-react";
import { Issue, RequirementStatus, RequirementPriority } from "../types";

interface ProjectSpaceRequirementsProps {
  requirements: Issue[];
}

export default function ProjectSpaceRequirements({ requirements }: ProjectSpaceRequirementsProps) {
  const totalReqs = requirements.length;

  // 1. Lifecycle status extraction
  const completedCount = requirements.filter(
    (r) => r.requirementStatus === RequirementStatus.COMPLETED
  ).length;

  const testingCount = requirements.filter(
    (r) => r.requirementStatus === RequirementStatus.TESTING || r.requirementStatus === RequirementStatus.ACCEPTING
  ).length;

  const developingCount = requirements.filter(
    (r) => r.requirementStatus === RequirementStatus.DEVELOPING
  ).length;

  const planningCount = requirements.filter(
    (r) => r.requirementStatus === RequirementStatus.DRAFT || r.requirementStatus === RequirementStatus.UNDER_REVIEW || !r.requirementStatus
  ).length;

  // Percentage Calculations
  const pctPlanning = totalReqs > 0 ? Math.round((planningCount / totalReqs) * 100) : 0;
  const pctDeveloping = totalReqs > 0 ? Math.round((developingCount / totalReqs) * 100) : 0;
  const pctTesting = totalReqs > 0 ? Math.round((testingCount / totalReqs) * 100) : 0;
  const pctCompleted = totalReqs > 0 ? Math.round((completedCount / totalReqs) * 100) : 0;

  // 2. Priorities
  const epCount = requirements.filter((r) => r.priority === RequirementPriority.EP).length;
  const hp1Count = requirements.filter((r) => r.priority === RequirementPriority.HP1).length;
  const mp2Count = requirements.filter((r) => r.priority === RequirementPriority.MP2).length;
  const lp3Count = requirements.filter((r) => r.priority === RequirementPriority.LP3).length;

  const completionRate = totalReqs > 0 ? Math.round((completedCount / totalReqs) * 100) : 0;

  return (
    <div
      className="md:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 min-w-0"
      id="project-space-requirements-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 leading-tight">需求交付生命周期</h3>
            <span className="text-[10px] text-slate-400 font-bold">全流程研发生命周期追踪</span>
          </div>
        </div>
        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded shrink-0">
          交付率 {completionRate}%
        </span>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 flex-1 flex flex-col justify-between">

        {/* Visual Pipeline (A horizontal delivery pipeline layout) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
              交付流水线视图
            </span>
            <span className="text-[9px] text-slate-400 font-bold">
              总计：{totalReqs} 需求
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 relative">
            {/* Step 1: Planning */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between hover:bg-slate-100/50 transition-colors relative min-w-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span className="truncate">1.规划中</span>
                  <Compass className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </div>
                <div className="text-base font-mono font-black text-slate-700 leading-tight">{planningCount}</div>
              </div>
              <div className="mt-2 text-[8.5px] text-slate-400 font-bold">{pctPlanning}% 占比</div>
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-10 hidden sm:block">
                <ArrowRight className="h-3 w-3 text-slate-300" />
              </div>
            </div>

            {/* Step 2: Developing */}
            <div className="bg-blue-50/20 border border-blue-100/60 rounded-xl p-2.5 flex flex-col justify-between hover:bg-blue-50/40 transition-colors relative min-w-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-600">
                  <span className="truncate">2.研发中</span>
                  <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                </div>
                <div className="text-base font-mono font-black text-blue-600 leading-tight">{developingCount}</div>
              </div>
              <div className="mt-2 text-[8.5px] text-blue-400 font-bold">{pctDeveloping}% 占比</div>
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-10 hidden sm:block">
                <ArrowRight className="h-3 w-3 text-slate-300" />
              </div>
            </div>

            {/* Step 3: Testing */}
            <div className="bg-amber-50/20 border border-amber-100/60 rounded-xl p-2.5 flex flex-col justify-between hover:bg-amber-50/40 transition-colors relative min-w-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-600">
                  <span className="truncate">3.验证中</span>
                  <Workflow className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                </div>
                <div className="text-base font-mono font-black text-amber-600 leading-tight">{testingCount}</div>
              </div>
              <div className="mt-2 text-[8.5px] text-amber-400 font-bold">{pctTesting}% 占比</div>
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-10 hidden sm:block">
                <ArrowRight className="h-3 w-3 text-slate-300" />
              </div>
            </div>

            {/* Step 4: Completed */}
            <div className="bg-emerald-50/20 border border-emerald-100/60 rounded-xl p-2.5 flex flex-col justify-between hover:bg-emerald-50/40 transition-colors relative min-w-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600">
                  <span className="truncate">4.已发布</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                </div>
                <div className="text-base font-mono font-black text-emerald-600 leading-tight">{completedCount}</div>
              </div>
              <div className="mt-2 text-[8.5px] text-emerald-400 font-bold">{pctCompleted}% 占比</div>
            </div>
          </div>
        </div>

        {/* Priority Matrix Distribution */}
        <div className="bg-slate-50/40 border border-slate-100 p-3.5 rounded-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
              需求优先级矩阵
            </span>
            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
              <Flame className="h-3 w-3 text-rose-500" /> 优先级层级
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Urgent & High priority */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                  <span className="text-rose-600 flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                    <span className="truncate">紧急需求 (EP)</span>
                  </span>
                  <span className="font-mono">{epCount} 个</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalReqs > 0 ? (epCount / totalReqs) * 100 : 0}%` }}
                    className="h-full bg-rose-500 transition-all duration-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                  <span className="text-orange-500 flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                    <span className="truncate">高优需求 (HP1)</span>
                  </span>
                  <span className="font-mono">{hp1Count} 个</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalReqs > 0 ? (hp1Count / totalReqs) * 100 : 0}%` }}
                    className="h-full bg-orange-500 transition-all duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Medium & Low priority */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                  <span className="text-amber-500 flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">中优需求 (MP2)</span>
                  </span>
                  <span className="font-mono">{mp2Count} 个</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalReqs > 0 ? (mp2Count / totalReqs) * 100 : 0}%` }}
                    className="h-full bg-amber-500 transition-all duration-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                  <span className="text-slate-400 flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="truncate">低优需求 (LP3)</span>
                  </span>
                  <span className="font-mono">{lp3Count} 个</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalReqs > 0 ? (lp3Count / totalReqs) * 100 : 0}%` }}
                    className="h-full bg-slate-400 transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
