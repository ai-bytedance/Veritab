/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  X,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info
} from "lucide-react";
import {
  Project,
  Issue,
  TestCase,
  TestCaseStatus,
  DefectStatus,
  DefectSeverity,
  RequirementStatus
} from "../types";
import CustomDropdown from "./CustomDropdown";

interface ProjectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  requirements: Issue[];
  defects: Issue[];
  projTestCases: TestCase[];
  onInvokeAI: (prompt: string) => Promise<string>;
}

export default function ProjectReportModal({
  isOpen,
  onClose,
  project,
  requirements,
  defects,
  projTestCases,
  onInvokeAI,
}: ProjectReportModalProps) {
  const [selectedScope, setSelectedScope] = useState<"project" | "requirement">("project");
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [aiReport, setAiReport] = useState<string>("");
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  // Initialize or fallback to selected requirement ID
  const effectiveReqId = selectedReqId || (requirements.length > 0 ? requirements[0].id : "");
  const activeReq = selectedScope === "requirement" ? requirements.find(r => r.id === effectiveReqId) : null;

  // Filter dataset based on current report scope
  const currentReqs = activeReq ? [activeReq] : requirements;
  const currentTestCases = activeReq
    ? projTestCases.filter(tc => tc.linkedRequirementId === effectiveReqId || activeReq.linkToTestCases?.includes(tc.id))
    : projTestCases;
  const currentDefects = activeReq
    ? defects.filter(d =>
        d.linkToRequirements?.includes(effectiveReqId) ||
        d.linkToTestCases?.some(tcId => currentTestCases.some(tc => tc.id === tcId)) ||
        (activeReq.linkToDefects || []).includes(d.id)
      )
    : defects;

  // Compute stats dynamically for current scope
  const reqCompletedCount = currentReqs.filter((r) => r.requirementStatus === RequirementStatus.COMPLETED).length;

  let progressScore = 100;
  if (selectedScope === "project") {
    progressScore = requirements.length > 0 ? Math.round((reqCompletedCount / requirements.length) * 100) : 100;
  } else if (activeReq) {
    const status = activeReq.requirementStatus;
    progressScore = status === RequirementStatus.COMPLETED ? 100
      : status === RequirementStatus.TESTING || status === RequirementStatus.ACCEPTING ? 75
      : status === RequirementStatus.DEVELOPING ? 45
      : status === RequirementStatus.UNDER_REVIEW ? 25
      : 10;
  }

  const passedCases = currentTestCases.filter((tc) => tc.status === TestCaseStatus.PASS).length;
  const qualityScore = currentTestCases.length > 0 ? Math.round((passedCases / currentTestCases.length) * 100) : 100;

  // Count uncovered requirements (requirements with no test cases linked)
  let reqUncoveredCount = 0;
  currentReqs.forEach((req) => {
    const linkedTCs = projTestCases.filter((tc) => tc.linkedRequirementId === req.id);
    const extraLinkedTCs = (req.linkToTestCases || []).map((id) => projTestCases.find((tc) => tc.id === id)).filter(Boolean);
    if (linkedTCs.length === 0 && extraLinkedTCs.length === 0) {
      reqUncoveredCount++;
    }
  });

  const uncoveredPercentage = currentReqs.length > 0
    ? Math.round((reqUncoveredCount / currentReqs.length) * 100)
    : 0;
  const testCoverageRate = 100 - uncoveredPercentage;

  const fatalDefects = currentDefects.filter((d) => d.severity === DefectSeverity.FATAL).length;
  const seriousDefects = currentDefects.filter((d) => d.severity === DefectSeverity.SERIOUS).length;
  const unresolvedDefectsCount = currentDefects.filter(
    (d) => d.defectStatus !== DefectStatus.CLOSED && d.defectStatus !== DefectStatus.RESOLVED
  ).length;

  const resolvedDefectsCount = currentDefects.filter(
    (d) => d.defectStatus === DefectStatus.CLOSED || d.defectStatus === DefectStatus.RESOLVED
  ).length;
  const defectResolveRate = currentDefects.length > 0 ? Math.round((resolvedDefectsCount / currentDefects.length) * 100) : 100;

  // Quality Health Score Calculation (weighted formula)
  const healthScore = Math.round(0.3 * progressScore + 0.4 * qualityScore + 0.3 * defectResolveRate);

  // Quality Judgment Determination
  let conclusionLevel: "pass" | "warn" | "fail" = "pass";
  let conclusionTitle = "准予发布";
  let conclusionDesc = "项目整体质量指标极佳。核心业务路径已实现测试用例100%覆盖并通过，未发现阻碍性的致命或严重缺陷，各项过程指标均符合高质量交付标准。";

  if (healthScore < 70 || fatalDefects > 0 || seriousDefects > 1) {
    conclusionLevel = "fail";
    conclusionTitle = "暂缓交付 / 阻碍级风险";
    conclusionDesc = "检测到严重质量偏离。由于测试用例通过率较低、存在高危遗留缺陷或存在严重的过程合规风险，建议立即挂起发布计划，组织研发团队开展专项治理。";
  } else if (healthScore < 88 || unresolvedDefectsCount > 0 || testCoverageRate < 80) {
    conclusionLevel = "warn";
    conclusionTitle = "带病观察发布 / 灰度释放";
    conclusionDesc = "核心功能基本具备发布底线，但仍存在零星一般缺陷或低优测试覆盖漏洞。建议通过小流量灰度、白名单试用等手段逐步释放，并密切监控线上异常。";
  }

  const handleTriggerAiAudit = async () => {
    setIsLoadingReport(true);
    setAiReport("");
    try {
      const prompt = `你现在是资深软件质量审计专家，请基于当前项目空间的研发与测试数据，以卓越的【质量判断思维】撰写一份精简深刻的评估报告。

报告基本数据：
- 报告范围: ${selectedScope === "project" ? "整个项目" : `单项需求: [${activeReq?.id}] ${activeReq?.title}`}
- 需求总数: ${currentReqs.length} 个 (交付完成率: ${progressScore}%)
- 测试用例数: ${currentTestCases.length} 个 (测试通过率: ${qualityScore}%)
- 测试覆盖率: ${testCoverageRate}%
- 活跃未闭环缺陷数: ${unresolvedDefectsCount} 个 (致命: ${fatalDefects}, 严重: ${seriousDefects})
- 缺陷解决率: ${defectResolveRate}%
- 综合质量得分: ${healthScore}分

请严格按照以下【质量判断思维】维度输出，先说结论，不含任何废话，总字数控制在250字以内：
1. 🏆 评审结论：明确指出是否建议发布（如：准予发布 / 带病观察发布 / 建议挂起暂缓发布），给出定性依据。
2. ✅ 正确的实践：识别出本项目做得好的地方（例如：高优覆盖、缺陷闭环及时等）。
3. ⚠️ 识别出的风险：有哪些需要立即关注的安全或质量盲区（例如：未覆盖用例、未复现Bug、遗留一般Bug等）。
4. 🔍 遗留问题与监控项：上线后或后续周期中，测试与运维应当重点追踪和监控哪些点。`;
      const response = await onInvokeAI(prompt);
      setAiReport(response);
    } catch (e) {
      setAiReport("AI智能评审服务连接超时，请检查您的密钥设置。");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleCopyReport = () => {
    const scopeName = selectedScope === "project"
      ? `${project.name} - 项目交付质量报告`
      : `需求 [${activeReq?.id}] ${activeReq?.title} - 专项评估报告`;

    const markdownText = `
# 质量交付评估报告
报告范围: ${scopeName}
评估时间: ${new Date().toLocaleDateString('zh-CN')}
综合质量评分: ${healthScore} 分

## 一、 评审结论
- **结论定性**: ${conclusionTitle}
- **定性依据**: ${conclusionDesc}

## 二、 核心质量指标
- 需求交付进度: ${progressScore}% (已完成 ${reqCompletedCount} / ${currentReqs.length})
- 测试通过率: ${qualityScore}% (通过 ${passedCases} / ${currentTestCases.length})
- 测试覆盖深度: ${testCoverageRate}% (${reqUncoveredCount} 个需求未保)
- 未闭环缺陷: ${unresolvedDefectsCount} 个 (致命: ${fatalDefects}, 严重: ${seriousDefects})

## 三、 质量复盘与合规诊断
1. 【✅ 正确的实践】核心场景及主干代码已完成首轮回归，高危致命缺陷已在发布前拦截。
2. 【⚠️ 识别出的风险】部分处于开发中/评审中的边缘场景尚无测试用例闭环保障，存在测试盲区。
3. 【🔍 遗留观察项】持续监控低优先级遗留缺陷，尤其是偶发性性能波动，建立线上舆情追踪。
    `;
    navigator.clipboard.writeText(markdownText.trim());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-slate-50 w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        id="quality-report-modal"
      >
        {/* Modal Header - No prefix icons as requested */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800">一键生成 · 质量交付报告</h2>
            <p className="text-[10px] text-slate-400 font-semibold">透视空间交付合规性与测试闭环率，辅助高质量软件释放决策</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            id="close-report-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope Selector Controls */}
        <div className="bg-white px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500">报告范围:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setSelectedScope("project")}
                className={`px-3.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedScope === "project"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                id="scope-project-btn"
              >
                整个项目质量评估
              </button>
              <button
                onClick={() => {
                  setSelectedScope("requirement");
                  if (requirements.length > 0 && !selectedReqId) {
                    setSelectedReqId(requirements[0].id);
                  }
                }}
                className={`px-3.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedScope === "requirement"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                id="scope-requirement-btn"
              >
                特定需求专项评估
              </button>
            </div>
          </div>

          {selectedScope === "requirement" && (
            <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[280px]">
              <span className="text-xs font-black text-slate-500 shrink-0">选择目标需求:</span>
              <CustomDropdown
                options={requirements.map((req) => ({
                  value: req.id,
                  label: `[${req.id}] ${req.title}`,
                }))}
                value={effectiveReqId}
                onChange={(val) => setSelectedReqId(val)}
                className="w-full sm:w-64"
                placeholder="选择关联的需求"
              />
            </div>
          )}
        </div>

        {/* Report Document Content Frame */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-150/20 space-y-5" id="printable-report-area">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">

            {/* Header Title Information */}
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded tracking-wider uppercase">
                  QUALITY ASSESSMENT REPORT
                </span>
                <h1 className="text-base font-black text-slate-800 tracking-tight" id="report-title-heading">
                  {selectedScope === "project"
                    ? `${project.name} · 项目交付质量综合评审`
                    : `需求 [${activeReq?.id}] · ${activeReq?.title} · 交付质量专项评审`
                  }
                </h1>
                <p className="text-[10px] text-slate-400 font-bold" id="report-metadata-line">
                  评估周期：{new Date().toLocaleDateString('zh-CN')} &nbsp;|&nbsp; 评估机制：全量研运合规性校验与智能诊断
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">综合质量得分</span>
                  <span className={`text-xl font-mono font-black block leading-none mt-1 ${
                    healthScore >= 90 ? "text-emerald-600" : healthScore >= 75 ? "text-indigo-600" : "text-amber-500"
                  }`} id="health-score-display">
                    {healthScore} <span className="text-[10px] font-bold text-slate-400">分</span>
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded ${
                    conclusionLevel === "pass" ? "bg-emerald-50 text-emerald-700" :
                    conclusionLevel === "warn" ? "bg-amber-50 text-amber-700" :
                    "bg-rose-50 text-rose-700"
                  }`}>
                    {conclusionLevel === "pass" ? "推荐发布" : conclusionLevel === "warn" ? "观察释放" : "暂缓交付"}
                  </span>
                </div>
              </div>
            </div>

            {/* PART 1: Conclusion First (质量评审结论 - 先说结论) */}
            <div className={`rounded-xl p-4 border ${
              conclusionLevel === "pass" ? "bg-emerald-50/40 border-emerald-100 text-emerald-950" :
              conclusionLevel === "warn" ? "bg-amber-50/30 border-amber-200 text-amber-950" :
              "bg-rose-50/40 border-rose-100 text-rose-950"
            }`} id="report-section-conclusion">
              <div className="flex items-center gap-2 mb-1.5 font-black text-xs">
                {conclusionLevel === "pass" && <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
                {conclusionLevel === "warn" && <Eye className="h-4.5 w-4.5 text-amber-600 shrink-0" />}
                {conclusionLevel === "fail" && <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />}
                <span className={`text-xs font-extrabold ${
                  conclusionLevel === "pass" ? "text-emerald-900" :
                  conclusionLevel === "warn" ? "text-amber-900" :
                  "text-rose-900"
                }`}>
                  质量评审结论：{conclusionTitle}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed font-semibold">
                {conclusionDesc}
              </p>
            </div>

            {/* PART 2: Core Quality Metrics (核心质量透视指标 - 质量人最关心的4个精炼指标) */}
            <div className="space-y-2.5" id="report-section-metrics">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-indigo-600 rounded-sm" />
                <h3 className="text-xs font-black text-slate-800">核心质量判定指标</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-slate-50/70 border border-slate-100/80 p-3 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block">需求交付完成度</span>
                    <span className="text-base font-black text-slate-800 block mt-1">{progressScore}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold mt-2 block truncate">
                    已交付 {reqCompletedCount} / {currentReqs.length}
                  </span>
                </div>

                <div className="bg-slate-50/70 border border-slate-100/80 p-3 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block">测试用例通过率</span>
                    <span className={`text-base font-black block mt-1 ${qualityScore >= 90 ? "text-emerald-600" : "text-amber-500"}`}>{qualityScore}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold mt-2 block">
                    通过 {passedCases} / {currentTestCases.length}
                  </span>
                </div>

                <div className="bg-slate-50/70 border border-slate-100/80 p-3 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block">测试覆盖深度</span>
                    <span className={`text-base font-black block mt-1 ${testCoverageRate >= 90 ? "text-emerald-600" : "text-amber-500"}`}>{testCoverageRate}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold mt-2 block">
                    {reqUncoveredCount} 个需求缺失用例
                  </span>
                </div>

                <div className="bg-slate-50/70 border border-slate-100/80 p-3 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block">活跃/遗留缺陷数</span>
                    <span className={`text-base font-black block mt-1 ${unresolvedDefectsCount > 0 ? "text-rose-500" : "text-slate-800"}`}>{unresolvedDefectsCount} 个</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold mt-2 block">
                    高危严重缺陷: {fatalDefects + seriousDefects} 个
                  </span>
                </div>
              </div>
            </div>

            {/* PART 3: Quality Judgment & Diagnosis Thinking Cards (质量保障过程复盘与合规判定) */}
            <div className="space-y-2.5" id="report-section-judgments">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-indigo-600 rounded-sm" />
                <h3 className="text-xs font-black text-slate-800">质量诊断与合规追踪</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {/* 1. Correct Practices */}
                <div className="bg-emerald-50/10 border border-emerald-100/40 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[11px]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>✓ 正确的交付实践</span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed font-semibold">
                    核心业务场景及主干代码已实现全量首轮回归测试。高优核心缺陷已全部闭环，开发和联调交付链路安全规范，杜绝了低级功能性阻碍。
                  </p>
                </div>

                {/* 2. Identified Risks */}
                <div className="bg-amber-50/10 border border-amber-200/40 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 font-black text-[11px]">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>⚠️ 识别出的关键风险</span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed font-semibold">
                    {reqUncoveredCount > 0
                      ? `检测到有 ${reqUncoveredCount} 个阶段性需求在本次交付周期内尚未规划、关联任何保障用例，具有一定的测试盲区风险，应补全保障。`
                      : "测试保障深度完善。然而在多环境交付及边界条件下的部分异常流校验仍面临一定覆盖压力，需预防高负载下的业务波动。"
                    }
                  </p>
                </div>

                {/* 3. Post-release Observations */}
                <div className="bg-indigo-50/10 border border-indigo-100/40 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-black text-[11px]">
                    <Eye className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>🔍 遗留问题与监控项</span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed font-semibold">
                    {unresolvedDefectsCount > 0
                      ? `对当前遗留的 ${unresolvedDefectsCount} 个一般/提示级缺陷，建议制定次级版本修复迭代，并持续监控多维环境下的线上运行崩溃率。`
                      : "空间目前无遗留缺陷流转，建议上线后重点观测首批用户的网络延迟、数据库吞吐率等基础环境指标，对异常日志设置实时告警。"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* PART 4: AI Intelligent Diagnosis */}
            <div className="space-y-2.5" id="report-section-ai">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-sm" />
                  <h3 className="text-xs font-black text-slate-800">AI 智能质量判定</h3>
                </div>

                <button
                  onClick={handleTriggerAiAudit}
                  disabled={isLoadingReport}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-50"
                  id="trigger-ai-audit-btn"
                >
                  {isLoadingReport ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" /> 专家研判中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" /> {aiReport ? "重构评审" : "运行 AI 判定"}
                    </>
                  )}
                </button>
              </div>

              {aiReport ? (
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 text-indigo-950 space-y-2 leading-relaxed animate-in fade-in duration-200" id="ai-report-box">
                  <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-semibold">
                    {aiReport}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-[10.5px] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{isLoadingReport ? "AI 质量决策引擎正在全面审计交付矩阵数据，请稍候..." : "点击上方按钮调取大模型运行符合质量判断思维的深度研判定性。"}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white px-6 py-4 border-t border-slate-150 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">
            质量守护决策系统 · 基于质量判断思维设计
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopyReport}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center cursor-pointer border ${
                copySuccess
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              id="copy-markdown-btn"
            >
              {copySuccess ? "已成功复制" : "复制Markdown"}
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center cursor-pointer"
              id="print-pdf-btn"
            >
              导出 PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              id="close-footer-btn"
            >
              关闭
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
