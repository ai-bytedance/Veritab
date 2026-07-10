import React from "react";
import { ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";
import { TestCase, Issue, ProjectTab } from "../types";
import { formatDefectId } from "../lib/idUtils";

interface TestCaseTraceabilityPanelProps {
  activeCase: TestCase;
  requirements: Issue[];
  linkedDefects: Issue[];
  isTraceSectionOpen: boolean;
  setIsTraceSectionOpen: (v: boolean) => void;
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusIssue?: (id: string) => void;
}

export default function TestCaseTraceabilityPanel({
  activeCase,
  requirements,
  linkedDefects,
  isTraceSectionOpen,
  setIsTraceSectionOpen,
  onNavigateToTab,
  onFocusIssue,
}: TestCaseTraceabilityPanelProps) {
  return (
    <div className="border-t border-slate-100 pt-4 space-y-3 font-sans">
      <button
        type="button"
        onClick={() => setIsTraceSectionOpen(!isTraceSectionOpen)}
        className="w-full flex items-center justify-between text-left py-1 hover:text-slate-800 transition-colors cursor-pointer select-none"
      >
        <h4 className="text-xs font-black text-slate-700 flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-indigo-650 animate-pulse" />
          <span>双向追溯关联</span>
        </h4>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
          <span>{isTraceSectionOpen ? "收起面板" : "展开模块"}</span>
          {isTraceSectionOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isTraceSectionOpen && (
        <div className="animate-fade-in text-left">
          <div className="bg-slate-50/45 border border-slate-200/60 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans select-none">
                  关联引发故障缺陷列表
                </span>
                <p className="text-[10px] text-slate-450">
                  当前用例在执行流或历史回归中派生、关联的所有故障缺陷清单 ({linkedDefects.length} 个)
                </p>
              </div>
              <span className="font-sans text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100/50">
                缺陷总数: {linkedDefects.length}
              </span>
            </div>

            {linkedDefects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                {linkedDefects.map((defect) => (
                  <div
                    key={defect.id}
                    onClick={() => {
                      if (onNavigateToTab && onFocusIssue) {
                        onFocusIssue(defect.id);
                        onNavigateToTab(ProjectTab.DEFECT);
                      }
                    }}
                    className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm cursor-pointer p-4 rounded-xl flex flex-col justify-between gap-3 transition-all active:scale-[0.98] group relative overflow-hidden text-left"
                  >
                    {/* Corner accent for severity */}
                    <span className={`absolute top-0 left-0 w-1 h-full ${
                      defect.severity === "致命" ? "bg-red-500" :
                      defect.severity === "严重" ? "bg-orange-500" :
                      defect.severity === "提示" ? "bg-blue-400" :
                      "bg-amber-500"
                    }`} />

                    <div className="space-y-2 pl-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400">
                          {formatDefectId(defect.id)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Severity */}
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${
                            defect.severity === "致命" ? "bg-red-50 text-red-600 border border-red-150" :
                            defect.severity === "严重" ? "bg-orange-50 text-orange-600 border border-orange-150" :
                            defect.severity === "提示" ? "bg-blue-50 text-blue-650 border border-blue-150" :
                            "bg-amber-50 text-amber-600 border border-amber-150"
                          }`}>
                            {defect.severity || "一般"}
                          </span>
                          {/* Status */}
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${
                            defect.defectStatus === "新建" ? "bg-rose-100 text-rose-700" :
                            defect.defectStatus === "处理中" ? "bg-indigo-100 text-indigo-700" :
                            defect.defectStatus === "已解决" ? "bg-emerald-150 bg-emerald-100 text-emerald-800" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {defect.defectStatus || "新建"}
                          </span>
                        </div>
                      </div>

                      <h5 className="text-[11.5px] font-extrabold text-slate-800 leading-snug group-hover:text-indigo-650 transition-colors line-clamp-2" title={defect.title}>
                        🐞 {defect.title}
                      </h5>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-2.5 select-none pl-1.5">
                      <span>更新于 {new Date(defect.updatedAt || defect.createdAt).toLocaleDateString()}</span>
                      <span className="text-indigo-600 font-extrabold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                        定位缺陷 &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-2 select-none">
                <span className="text-xl">🛡️</span>
                <span className="text-[11px] italic font-semibold">目前此用例处于安全运行状态，未发现或关联任何故障缺陷。</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
