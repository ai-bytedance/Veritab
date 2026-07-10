import React from "react";
import {
  ShieldAlert,
  Code,
  Terminal,
  Check,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Copy
} from "lucide-react";
import { AIStructuredReport } from "./CodeChangesData.types";

interface CodeChangesReportProps {
  structuredReport: AIStructuredReport;
  reportActiveTab: "report" | "code" | "test";
  setReportActiveTab: (tab: "report" | "code" | "test") => void;
  expandedDefectIndex: number | null;
  setExpandedDefectIndex: (idx: number | null) => void;
  handleSyncDefectToIssues: (defect: any) => void;
  handleCopyToClipboard: (text: string, label: string) => void;
  handleSyncTestCaseToLibrary: () => void;
}

export const CodeChangesReport: React.FC<CodeChangesReportProps> = ({
  structuredReport,
  reportActiveTab,
  setReportActiveTab,
  expandedDefectIndex,
  setExpandedDefectIndex,
  handleSyncDefectToIssues,
  handleCopyToClipboard,
  handleSyncTestCaseToLibrary,
}) => {
  return (
    <div className="shrink-0 bg-slate-50 border-b border-slate-100 flex flex-col max-h-[360px] md:max-h-[400px] overflow-hidden">
      {/* Report Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 gap-2 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setReportActiveTab("report")}
            className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              reportActiveTab === "report"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> 1. 质量缺陷报告
          </button>
          <button
            onClick={() => setReportActiveTab("code")}
            className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              reportActiveTab === "code"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Code className="h-3.5 w-3.5" /> 2. 推荐重构代码
          </button>
          {structuredReport.testCase && (
            <button
              onClick={() => setReportActiveTab("test")}
              className={`pb-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                reportActiveTab === "test"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" /> 3. 自动化测试生成
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="text-[10px] text-slate-400 font-mono font-bold hidden xs:inline">智能质控防线</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
            structuredReport.severity === "HIGH"
              ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
              : structuredReport.severity === "MEDIUM"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {structuredReport.severity === "HIGH" ? "🚨 致命/高风险隐患" : structuredReport.severity === "MEDIUM" ? "⚠️ 中度风险漏洞" : "✅ 低风险/推荐重构"}
          </span>
        </div>
      </div>

      {/* Report Detail Panel */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {reportActiveTab === "report" && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-slate-100/60 p-3.5 rounded-xl border border-slate-200/40 text-xs text-slate-600 leading-relaxed font-sans">
              <span className="font-bold text-slate-800 block mb-1">🔍 前沿上下文分析纲要:</span>
              {structuredReport.summary}
            </div>

            {/* Identified Defects List */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">检测到的缺陷明细 ({structuredReport.defects.length})</div>
              {structuredReport.defects.length === 0 ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>未见逻辑缺陷。代码符合当前配置的质控基线！</span>
                </div>
              ) : (
                structuredReport.defects.map((defect, dIdx) => {
                  const isExpanded = expandedDefectIndex === dIdx;
                  return (
                    <div key={dIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-sm">
                      <button
                        onClick={() => setExpandedDefectIndex(isExpanded ? null : dIdx)}
                        className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mr-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                            defect.severity === "致命"
                              ? "bg-rose-100 text-rose-700"
                              : defect.severity === "严重"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {defect.severity}
                          </span>
                          <span className="text-xs font-black text-slate-800 truncate">{defect.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncDefectToIssues(defect);
                            }}
                            className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[9px] font-black transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <PlusCircle className="h-2.5 w-2.5" />
                            <span className="hidden xs:inline">一键提报缺陷单</span>
                            <span className="xs:hidden">提报</span>
                          </button>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3.5 text-xs text-slate-600 leading-relaxed font-sans">
                          <div>
                            <span className="font-extrabold text-slate-700 block mb-1">【缺陷上下文成因分析】</span>
                            <p className="text-slate-600">{defect.description}</p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200/60">
                            <span className="font-extrabold text-indigo-700 block mb-1">【重构与对齐方案】</span>
                            <p className="text-slate-700">{defect.fix}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {reportActiveTab === "code" && structuredReport.suggestedCode && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 gap-2 shrink-0">
              <span className="text-[11px] font-mono text-slate-600 truncate">重构修复参考：</span>
              <button
                onClick={() => handleCopyToClipboard(structuredReport.suggestedCode || "", "重构修复代码")}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 rounded text-[10px] font-bold transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Copy className="h-3 w-3" />
                <span>复制代码</span>
              </button>
            </div>
            <UnifiedCodeViewer code={structuredReport.suggestedCode} maxHeightClass="max-h-[220px]" />
          </div>
        )}

        {reportActiveTab === "test" && structuredReport.testCase && (
          <div className="space-y-4 font-sans">
            {/* Test Case Metadata Description */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                <h5 className="text-xs font-black text-indigo-950 flex items-center gap-1.5 min-w-0">
                  <PlusCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="truncate">回归验证：{structuredReport.testCase.name}</span>
                </h5>
                <button
                  onClick={handleSyncTestCaseToLibrary}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-colors flex items-center gap-1 cursor-pointer shadow-sm shrink-0 self-start sm:self-center"
                >
                  <Check className="h-3 w-3" />
                  <span>一键同步到测试用例库</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-600">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="font-black text-slate-700 block mb-0.5">【前置验证依赖】:</span>
                  {structuredReport.testCase.precondition}
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="font-black text-slate-700 block mb-0.5">【预期卡控机制】:</span>
                  {structuredReport.testCase.expectedResult}
                </div>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-150 text-xs">
                <span className="font-black text-slate-700 block mb-1">【测试执行步骤】:</span>
                <div className="whitespace-pre-line text-slate-600 leading-relaxed">{structuredReport.testCase.steps.replace(/\\n/g, '\n')}</div>
              </div>
            </div>

            {structuredReport.testCase.unitTestCode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-600 truncate">自动生成的自动化测试脚本:</span>
                  <button
                    onClick={() => handleCopyToClipboard(structuredReport.testCase?.unitTestCode || "", "自动化单元测试代码")}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 rounded text-[10px] font-bold transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                    <span>复制测试脚本</span>
                  </button>
                </div>
                <UnifiedCodeViewer code={structuredReport.testCase.unitTestCode} maxHeightClass="max-h-[180px]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const UnifiedCodeViewer: React.FC<{ code: string; maxHeightClass?: string }> = ({ code, maxHeightClass = "max-h-[200px]" }) => {
  const lines = code.split('\n');
  return (
    <div className="font-mono text-[11px] sm:text-[12px] leading-5 w-full text-slate-300 rounded-xl overflow-hidden select-text bg-[#0d1117] border border-slate-800">
      <div className={`py-3 overflow-y-auto ${maxHeightClass}`}>
        {lines.map((line, idx) => (
          <div key={idx} className="flex px-4 hover:bg-slate-800/40">
            <span className="opacity-40 select-none inline-block w-8 text-right pr-3 border-r border-slate-700/50 mr-3 tabular-nums text-[10px]">
              {idx + 1}
            </span>
            <span className="whitespace-pre flex-1">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
