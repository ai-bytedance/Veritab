/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Activity, Layers, AlertTriangle, ShieldCheck, ShieldAlert, HelpCircle, X } from "lucide-react";
import { Issue, TestCase, TestCaseStatus, DefectStatus, RequirementStatus, RequirementPriority } from "../types";

interface ProjectSpaceStatsProps {
  requirements: Issue[];
  defects: Issue[];
  projTestCases: TestCase[];
}

export default function ProjectSpaceStats({
  requirements,
  defects,
  projTestCases,
}: ProjectSpaceStatsProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 1. Requirement Delivery Progress
  const reqCompletedCount = requirements.filter((r) => r.requirementStatus === RequirementStatus.COMPLETED).length;
  const progressScore = requirements.length > 0 ? Math.round((reqCompletedCount / requirements.length) * 100) : 100;

  // 2. Uncovered Requirements (Filter by high priority to match "High-Risk" definition)
  const uncoveredHighRiskReqs: Issue[] = [];
  requirements.forEach((req) => {
    const isHighRisk = req.priority === RequirementPriority.EP || req.priority === RequirementPriority.HP1 || !req.priority;
    const linkedTCs = projTestCases.filter((tc) => tc.linkedRequirementId === req.id);
    const extraLinkedTCs = (req.linkToTestCases || []).map((id) => projTestCases.find((tc) => tc.id === id)).filter(Boolean);
    if (isHighRisk && linkedTCs.length === 0 && extraLinkedTCs.length === 0) {
      uncoveredHighRiskReqs.push(req);
    }
  });
  const reqUncoveredCount = uncoveredHighRiskReqs.length;

  // 3. Test Cases Pass Rate
  const passedCases = projTestCases.filter((tc) => tc.status === TestCaseStatus.PASS).length;
  const passRate = projTestCases.length > 0 ? Math.round((passedCases / projTestCases.length) * 100) : 0;

  // 4. Closed/Resolved defects
  const resolvedDefects = defects.filter(
    (d) => d.defectStatus === DefectStatus.CLOSED || d.defectStatus === DefectStatus.RESOLVED
  ).length;
  const defectResolveRate = defects.length > 0 ? Math.round((resolvedDefects / defects.length) * 100) : 100;
  const activeDefectsCount = defects.length - resolvedDefects;

  // 5. Comprehensive Health Score
  const healthScore = Math.round(0.4 * progressScore + 0.4 * passRate + 0.2 * defectResolveRate);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 shrink-0" id="project-space-stats-grid">
      {/* Card 1: Project Comprehensive Health Score */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all hover:shadow-md relative overflow-visible group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 relative group/tooltip">
            <span className="text-xs font-black text-slate-400 tracking-tight">项目健康评分</span>
            <HelpCircle className="h-3 w-3 text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
            <div className="absolute top-6 left-0 w-48 bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed font-semibold hidden group-hover/tooltip:block border border-slate-700/50">
              基于项目交付进度（占比40%）、测试用例通过率（占比40%）及缺陷收敛闭环率（占比20%）加权计算得出的综合健康评定分。
            </div>
          </div>
          <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Activity className="h-4 w-4 text-indigo-500" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className={`text-3xl font-black font-mono leading-none ${
            healthScore >= 90 ? "text-emerald-600" :
            healthScore >= 75 ? "text-indigo-600" :
            healthScore >= 60 ? "text-amber-500" : "text-rose-500"
          }`}>
            {healthScore}
          </span>
          <span className="text-xs font-bold text-slate-400">分</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            healthScore >= 90 ? "bg-emerald-50 text-emerald-700" :
            healthScore >= 75 ? "bg-indigo-50 text-indigo-700" :
            healthScore >= 60 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
          }`}>
            {healthScore >= 90 ? "质量极佳" : healthScore >= 75 ? "进度良好" : healthScore >= 60 ? "需警惕风险" : "有高风险"}
          </span>
          <span className="text-[9px] text-slate-400 font-bold" title="公式: 0.4*进度 + 0.4*用例 + 0.2*闭环">
            加权计算
          </span>
        </div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
      </div>

      {/* Card 2: Requirements Delivery Rate */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all hover:shadow-md relative overflow-visible">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 relative group/tooltip">
            <span className="text-xs font-black text-slate-400 tracking-tight">需求交付进度</span>
            <HelpCircle className="h-3 w-3 text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
            <div className="absolute top-6 left-0 w-48 bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed font-semibold hidden group-hover/tooltip:block border border-slate-700/50">
              当前项目中已处于 [已完成] 状态的需求占所有历史存量需求的百分比，直接体现需求交付的闭环状态与完整度。
            </div>
          </div>
          <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-800 font-mono leading-none">
            {progressScore}%
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
          <span>已完成: {reqCompletedCount} / {requirements.length} 个</span>
          <div className="h-1 w-10 bg-slate-100 rounded-full overflow-hidden shrink-0 ml-1.5">
            <div style={{ width: `${progressScore}%` }} className="bg-indigo-500 h-full" />
          </div>
        </div>
      </div>

      {/* Card 3: High Risk Uncovered Requirements */}
      <div
        onClick={() => { if (reqUncoveredCount > 0) setShowDetailModal(true); }}
        className={`rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all relative overflow-visible ${
          reqUncoveredCount > 0
            ? "border-rose-100 bg-rose-50/10 hover:border-rose-200 cursor-pointer hover:shadow-md"
            : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 relative group/tooltip">
            <span className="text-xs font-black text-slate-400 tracking-tight">高风险未覆盖需求</span>
            <HelpCircle className="h-3 w-3 text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
            <div className="absolute top-6 left-0 sm:left-1/2 sm:-translate-x-1/2 w-48 bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed font-semibold hidden group-hover/tooltip:block border border-slate-700/50">
              高优先级业务需求（紧急/高优）中，由于未关联任何测试保障用例而处于“零保障”状态的需求总数，属于核心漏洞盲区。
            </div>
          </div>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${reqUncoveredCount > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
            <AlertTriangle className={`h-4 w-4 ${reqUncoveredCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className={`text-2xl font-black font-mono leading-none ${reqUncoveredCount > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
            {reqUncoveredCount} 个
          </span>
          {reqUncoveredCount > 0 && (
            <span className="text-[8.5px] text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md font-extrabold select-none">
              查看明细
            </span>
          )}
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-semibold leading-tight">
          {reqUncoveredCount > 0 ? "⚠️ 存在未覆盖核心业务盲区" : "✅ 所有需求均有测试保障"}
        </div>
      </div>

      {/* Card 4: Test Case Count & Pass Rate */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all hover:shadow-md relative overflow-visible">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 relative group/tooltip">
            <span className="text-xs font-black text-slate-400 tracking-tight">测试用例通过率</span>
            <HelpCircle className="h-3 w-3 text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
            <div className="absolute top-6 right-0 w-48 bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed font-semibold hidden group-hover/tooltip:block border border-slate-700/50">
              当前空间下已执行且执行结果为 [通过] 的测试用例占所有测试用例的百分率，反映了当前系统的核心功能品质。
            </div>
          </div>
          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="text-2xl font-black text-emerald-600 font-mono leading-none">
            {passRate}%
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-semibold">
          已通过: {passedCases} / {projTestCases.length} 个用例
        </div>
      </div>

      {/* Card 5: Defect Closed Loop Control */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all hover:shadow-md relative overflow-visible">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 relative group/tooltip">
            <span className="text-xs font-black text-slate-400 tracking-tight">未闭环缺陷数</span>
            <HelpCircle className="h-3 w-3 text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
            <div className="absolute top-6 right-0 w-48 bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed font-semibold hidden group-hover/tooltip:block border border-slate-700/50">
              当前空间内处于非 [已闭环] 及非 [已解决] 状态的历史存量缺陷，值越低，系统漏洞存量越小。
            </div>
          </div>
          <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className={`text-2xl font-black font-mono leading-none ${activeDefectsCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {activeDefectsCount} 个
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
          <span>解决率: {defectResolveRate}%</span>
          <span className="text-[9px] text-slate-400 font-normal">总数: {defects.length}</span>
        </div>
      </div>

      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200" id="uncovered-reqs-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 mx-4" id="uncovered-reqs-modal">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 leading-tight">高风险未覆盖需求明细</h3>
                  <span className="text-[10px] text-slate-400 font-bold">核心需求质量保障漏洞排查</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                id="uncovered-reqs-modal-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Explanatory banner */}
            <div className="bg-rose-50/50 border border-rose-100/60 p-3 rounded-xl text-[10px] font-bold text-rose-700 leading-relaxed">
              以下是优先级为 <span className="underline">紧急-EP</span> 或 <span className="underline">高优-HP1</span> 且尚未关联任何测试用例的业务需求。它们目前属于“零覆盖”保障状态，极易发生线上缺陷。建议尽快为其设计测试用例。
            </div>

            {/* Modal List */}
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
              {uncoveredHighRiskReqs.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] font-black font-mono text-indigo-600 block shrink-0 mb-0.5">
                      {req.id}
                    </span>
                    <span className="text-[11px] font-black text-slate-700 block truncate" title={req.title}>
                      {req.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded leading-none border ${
                      req.priority === RequirementPriority.EP
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-orange-50 text-orange-700 border-orange-100"
                    }`}>
                      {req.priority === RequirementPriority.EP ? "紧急-EP" : "高优-HP1"}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 bg-white border border-slate-100 px-1 py-0.5 rounded">
                      {req.requirementStatus === RequirementStatus.DRAFT ? "草稿" :
                       req.requirementStatus === RequirementStatus.UNDER_REVIEW ? "评审中" :
                       req.requirementStatus === RequirementStatus.DEVELOPING ? "开发中" :
                       req.requirementStatus === RequirementStatus.TESTING ? "测试中" :
                       req.requirementStatus === RequirementStatus.ACCEPTING ? "验收中" :
                       req.requirementStatus === RequirementStatus.COMPLETED ? "已完成" : "未知"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 pt-3 mt-1">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                id="uncovered-reqs-modal-footer-close"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
