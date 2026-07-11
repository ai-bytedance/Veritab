import React, { useState } from "react";
import {
  History,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  HelpCircle
} from "lucide-react";
import { TestCase } from "../types";
import { ApiTestCaseExecution } from "../features/test-cases/api/types";

interface RegressionHistoryTabProps {
  activeCase: TestCase;
  executions: ApiTestCaseExecution[];
}

export default function RegressionHistoryTab({ activeCase, executions }: RegressionHistoryTabProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isSectionExpanded, setIsSectionExpanded] = useState<boolean>(true);

  const runs = executions.map((execution) => ({
    log: {
      id: execution.id,
      createdAt: execution.completedAt,
      userName: execution.executedBy.displayName || execution.executedBy.username,
      oldValue: execution.status,
    },
    snap: {
      overallStatus: execution.status as string,
      steps: (execution.definitionSnapshot?.steps ?? activeCase.steps)?.split("\n").map((value) => value.trim()).filter(Boolean) || [],
      expected: (execution.definitionSnapshot?.expectedResult ?? activeCase.expectedResult)?.split("\n").map((value) => value.trim()).filter(Boolean) || [],
      results: execution.stepResults || {},
      notes: execution.stepNotes || {},
      description: execution.actualResult,
    },
  }));

  if (runs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/40 py-16 text-center text-slate-400 font-sans p-6 mb-4">
        <HelpCircle className="mx-auto h-12 w-12 text-slate-300 mb-3 animate-pulse" />
        <h4 className="text-sm font-black text-slate-700 mb-1">🔍 暂无历史回归记录</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          该测试用例目前还没有任何已归归档的历史质量校验报告。当您在“分步交互回归”或“XMind脑图验证”后点击“提交并归档报告”，快照会永久同步至此。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/25 rounded-2xl border border-slate-100 p-4 space-y-3 font-sans animate-fade-in text-left">
      <button
        type="button"
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
        className="w-full flex items-center justify-between cursor-pointer hover:opacity-90 select-none text-left"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-white border border-slate-150 flex items-center justify-center shrink-0">
            <History className="h-3.5 w-3.5 text-indigo-650" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[11px] font-bold text-slate-800">历史回归记录</h4>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-extrabold">
                共 {runs.length} 次归档
              </span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">详细记录并回溯每个执行版本的状态、明细与偏差说明</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-550 font-extrabold hover:underline">
          <span>{isSectionExpanded ? "收起记录" : "展开记录"}</span>
          {isSectionExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isSectionExpanded && (
        <div className="pt-3 border-t border-slate-100 space-y-4 animate-fade-in">
          {runs.map(({ log, snap }) => {
            const isExpanded = expandedLogId === log.id;
          const dateStr = new Date(log.createdAt).toLocaleString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });

          const overall = snap?.overallStatus || log.oldValue || "未测试";

          // Re-generate or fetch dynamic snaps steps if saved, else fallback to current case steps
          const stepsList = (snap?.steps && Array.isArray(snap.steps))
            ? snap.steps
            : (activeCase.steps ? activeCase.steps.split("\n").map(s => s.trim()).filter(Boolean) : []);

          const expectedList = (snap?.expected && Array.isArray(snap.expected))
            ? snap.expected
            : (activeCase.expectedResult ? activeCase.expectedResult.split("\n").map(s => s.trim()).filter(Boolean) : []);

          const resultsMap = snap?.results || {};
          const notesMap = snap?.notes || {};

          // Count totals inside the run snapshot
          const totalInRun = stepsList.length;
          const passedInRun = Object.values(resultsMap).filter(v => v === "pass").length;
          const failedInRun = Object.values(resultsMap).filter(v => v === "fail").length;
          const blockedInRun = Object.values(resultsMap).filter(v => v === "blocked").length;

          return (
            <div
              key={log.id}
              className={`rounded-2xl border transition-all duration-350 bg-white ${
                isExpanded
                  ? "border-slate-200 shadow-sm ring-4 ring-slate-50/80"
                  : "border-slate-100 hover:border-slate-200 hover:shadow-xs"
              }`}
            >
              {/* Header block click triggering expand/collapse */}
              <div
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator circle badge */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    overall === "PASS" || overall === "通过" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                    overall === "FAIL" || overall === "失败" ? "bg-rose-50 text-rose-600 border-rose-200" :
                    overall === "BLOCKED" || overall === "阻断" ? "bg-amber-50 text-amber-600 border-amber-200" :
                    "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    {overall === "PASS" || overall === "通过" ? <CheckCircle2 className="h-4 w-4" /> :
                     overall === "FAIL" || overall === "失败" ? <XCircle className="h-4 w-4" /> :
                     <AlertTriangle className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800">
                        【{overall}】回归报告工单
                      </span>
                      <span className="font-mono text-[9px] bg-slate-150 text-slate-705 text-[8.5px] px-1.5 py-0.5 rounded font-bold">
                        ID: {log.id.substring(log.id.length - 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-semibold mt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.userName || "未知测试员"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance stats progress pill */}
                <div className="flex items-center gap-4.5 pl-11 md:pl-0">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500">
                    <span className="text-emerald-600 font-black">{passedInRun}✓</span>
                    <span>/</span>
                    <span className="text-rose-600 font-black">{failedInRun}✗</span>
                    <span>/</span>
                    <span className="text-amber-600 font-black">{blockedInRun}⚠️</span>
                    <span className="text-slate-400 text-[10px] font-medium font-mono">({passedInRun}/{totalInRun})</span>
                  </div>

                  <div className="text-slate-400 hover:text-slate-700 transition-colors">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Steps list details for Complete Trace-back */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/40 p-4.5 space-y-4 animate-fade-in text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-600 uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      质量回归步骤级判定轨迹
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stepsList.map((stepText, idx) => {
                      const stepStatus = resultsMap[idx] || "untested";
                      const stepExpected = expectedList[idx] || expectedList[expectedList.length - 1] || expectedList[0] || "通过验证且运行符合逻辑标准";
                      const note = notesMap[idx] || "";

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-3.5 bg-white space-y-2 last:border-b shadow-2xs ${
                            stepStatus === "pass" ? "border-emerald-100" :
                            stepStatus === "fail" ? "border-rose-200" :
                            stepStatus === "blocked" ? "border-amber-200" :
                            "border-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-2.5">
                              <span className={`w-5 h-5 rounded-md text-[9.5px] font-black font-mono flex items-center justify-center shrink-0 border ${
                                stepStatus === "pass" ? "bg-emerald-500 text-white border-emerald-600" :
                                stepStatus === "fail" ? "bg-rose-500 text-white border-rose-600" :
                                stepStatus === "blocked" ? "bg-amber-500 text-white border-amber-600" :
                                "bg-slate-550 text-slate-500 border-slate-200"
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-slate-800 leading-snug">{stepText}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  💡 预期：<span className="font-medium text-slate-600">{stepExpected}</span>
                                </p>
                              </div>
                            </div>

                            {/* Status label badge */}
                            <span className={`text-[8.5px] font-black font-mono px-2 py-0.5 rounded-full uppercase shrink-0 ${
                              stepStatus === "pass" ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50" :
                              stepStatus === "fail" ? "bg-rose-50 text-rose-600 border border-rose-200/50" :
                              stepStatus === "blocked" ? "bg-amber-50 text-amber-600 border border-amber-200/50" :
                              "bg-slate-100 text-slate-500"
                            }`}>
                              {stepStatus === "pass" ? "✓ 通过" :
                               stepStatus === "fail" ? "✗ 失败" :
                               stepStatus === "blocked" ? "⚠️ 阻断" : "未测试"}
                            </span>
                          </div>

                          {/* Detail Note (if fails/blocked) */}
                          {note.trim() && (
                            <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed font-mono ${
                              stepStatus === "fail"
                                ? "bg-rose-50/30 border-rose-100/60 text-rose-700"
                                : "bg-amber-50/30 border-amber-100/60 text-amber-700"
                            }`}>
                              <span className="font-black block text-[9.5px] mb-0.5">
                                {stepStatus === "fail" ? "🚨 记录异常偏差值：" : "⚠️ 阻断拦截说明："}
                              </span>
                              <p className="font-medium">{note}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary card */}
                  {snap?.description && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-semibold text-slate-550 leading-relaxed whitespace-pre-line font-mono">
                      <span className="font-black text-slate-700 block mb-1">📋 归档质量说明备录 :</span>
                      {snap.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
