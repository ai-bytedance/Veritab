import React from "react";
import { AlertTriangle, Sparkles, CheckCircle2, Layers, Save, RefreshCw, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { TestCase, TestCaseStatus, User } from "../types";

interface TestCaseExecutionWorkspaceProps {
  activeCase: TestCase;
  parsedSteps: string[];
  stepResults: Record<number, "pass" | "fail" | "blocked" | "untested">;
  stepNotes: Record<number, string>;
  aiGeneratingDefect: boolean;
  onStepStatusChange: (idx: number, status: "pass" | "fail" | "blocked") => void;
  onStepNoteChange: (idx: number, note: string) => void;
  onAIGenerateDefect: () => void;
  onResetExecutionDraft: () => void;
  onCommitExecutionHistory: () => void;
  activeUsers?: User[];
  onAssigneeChange?: (userId: string) => void;
}

export default function TestCaseExecutionWorkspace({
  activeCase,
  parsedSteps,
  stepResults,
  stepNotes,
  aiGeneratingDefect,
  onStepStatusChange,
  onStepNoteChange,
  onAIGenerateDefect,
  onResetExecutionDraft,
  onCommitExecutionHistory,
  activeUsers = [],
  onAssigneeChange = () => {},
}: TestCaseExecutionWorkspaceProps) {
  const [isStepsCollapsed, setIsStepsCollapsed] = React.useState<boolean>(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = React.useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = React.useState<string>("");

  const testedCount = Object.values(stepResults).filter((v) => v !== "untested").length;
  const isCompleted = parsedSteps.length > 0 && testedCount === parsedSteps.length;

  const hasFailures = Object.values(stepResults).some((res) => res === "fail");
  const hasBlocked = Object.values(stepResults).some((res) => res === "blocked");
  const allPassed = isCompleted && !hasFailures && !hasBlocked;

  const currentAssignee = activeUsers.find((u) => u.id === activeCase.assigneeId) || activeUsers[0];

  return (
    <div className="space-y-5 animate-fade-in text-left font-sans">
      {/* Preconditions */}
      {activeCase.precondition && (
        <div className="bg-amber-50/10 border border-amber-100/50 rounded-2xl p-4 text-left animate-fade-in">
          <span className="text-[9.5px] font-black text-amber-600 uppercase tracking-wider block mb-1 select-none">
            🚩 用例运行前置条件
          </span>
          <p className="text-xs text-slate-600 font-semibold leading-relaxed">
            {activeCase.precondition}
          </p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="space-y-2 select-none animate-fade-in">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            用例执行状态记录进度
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
              {testedCount} / {parsedSteps.length} 已测
            </span>
            {testedCount > 0 && (
              <button
                type="button"
                onClick={onResetExecutionDraft}
                className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-0.5 font-bold cursor-pointer outline-none"
                title="重置测试步骤状态"
              >
                <RefreshCw className="h-3 w-3" />
                <span>重置</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
          {parsedSteps.length > 0 &&
            parsedSteps.map((_, idx) => {
              const res = stepResults[idx] || "untested";
              return (
                <div
                  key={idx}
                  className={`h-full flex-1 border-r border-white last:border-0 transition-all duration-300 ${
                    res === "pass"
                      ? "bg-emerald-500"
                      : res === "fail"
                      ? "bg-rose-500 animate-pulse"
                      : res === "blocked"
                      ? "bg-amber-500"
                      : "bg-slate-200"
                  }`}
                />
              );
            })}
        </div>
      </div>

      {/* Steps Interactive list section with Collapse/Expand */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="text-[10px] font-black text-slate-700 tracking-wider block select-none">
            🧪 测试步骤验证
          </span>
          {parsedSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setIsStepsCollapsed(!isStepsCollapsed)}
              className="text-[10px] text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer select-none outline-none"
            >
              <span>{isStepsCollapsed ? "展开步骤" : "收起步骤"}</span>
              {isStepsCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-indigo-600" />
              )}
            </button>
          )}
        </div>

        {parsedSteps.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic text-xs font-semibold leading-relaxed">
            此用例无具体的执行步骤描述，无法为您生成交互式检验链。请先在“编辑属性页”中录入执行步骤。
          </div>
        ) : (
          !isStepsCollapsed && (
            <div className="space-y-3 font-sans animate-fade-in">
              {parsedSteps.map((stepText, idx) => {
                const sRes = stepResults[idx] || "untested";
                const expectedArr = activeCase.expectedResult
                  ? activeCase.expectedResult
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [];
                const stepExpected =
                  expectedArr[idx] ||
                  expectedArr[expectedArr.length - 1] ||
                  expectedArr[0] ||
                  "通过验证且运行符合逻辑标准";

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-4 transition-all space-y-3 shadow-sm ${
                      sRes === "pass"
                        ? "bg-emerald-55/10 bg-emerald-50/10 border-emerald-200"
                        : sRes === "fail"
                        ? "bg-rose-55/10 bg-rose-50/10 border-rose-200"
                        : sRes === "blocked"
                        ? "bg-amber-55/10 bg-amber-50/10 border-amber-200"
                        : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/30"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center text-[10px] font-mono font-black shrink-0 select-none ${
                            sRes === "pass"
                              ? "bg-emerald-500 text-white border-emerald-600"
                              : sRes === "fail"
                              ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                              : sRes === "blocked"
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="space-y-1 min-w-0 flex-1 text-left">
                          <p className="text-[11.5px] font-bold text-slate-800 leading-snug break-words">
                            {stepText}
                          </p>
                          {/* Beautiful high-contrast expected value block */}
                          <div className="mt-2 bg-indigo-50/45 border-l-2 border-indigo-550/80 px-2.5 py-1.5 rounded-r-xl text-left shadow-3xs">
                            <span className="text-[10px] font-black text-indigo-700 block mb-0.5 select-none">💡 预期结果</span>
                            <p className="text-[11px] text-slate-700 font-semibold leading-relaxed break-words">
                              {stepExpected}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Interactive testing actions */}
                      <div className="flex items-center gap-1 shrink-0 select-none self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => onStepStatusChange(idx, "pass")}
                          className={`px-2.5 py-1 rounded-lg font-black text-[9.5px] transition-all cursor-pointer flex items-center gap-0.5 outline-none ${
                            sRes === "pass"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-550 border border-slate-200/50"
                          }`}
                        >
                          <span>✔️ 通过</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onStepStatusChange(idx, "fail")}
                          className={`px-2.5 py-1 rounded-lg font-black text-[9.5px] transition-all cursor-pointer flex items-center gap-0.5 outline-none ${
                            sRes === "fail"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-550 border border-slate-200/50"
                          }`}
                        >
                          <span>❌ 失败</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onStepStatusChange(idx, "blocked")}
                          className={`px-2.5 py-1 rounded-lg font-black text-[9.5px] transition-all cursor-pointer flex items-center gap-0.5 outline-none ${
                            sRes === "blocked"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-550 border border-slate-200/50"
                          }`}
                        >
                          <span>⚠️ 阻断</span>
                        </button>
                      </div>
                    </div>

                    {/* Fail or Blocked input field for deviation writing */}
                    {(sRes === "fail" || sRes === "blocked") && (
                      <div className="space-y-1.5 pl-7.5 animate-fade-in text-left">
                        <label className="block text-[9px] font-black uppercase tracking-wider select-none">
                          {sRes === "fail" ? (
                            <span className="text-rose-600 font-extrabold">🚨 请观测并记录该步骤的真实异常值/偏差情况（将同步存储并在缺陷中展现）：</span>
                          ) : (
                            <span className="text-amber-600 font-extrabold">⚠️ 请输入该步骤遭遇的阻断情况/外部故障原因：</span>
                          )}
                        </label>
                        <textarea
                          className={`w-full bg-white border rounded-xl p-2.5 text-xs outline-none focus:ring-4 h-16 resize-none font-medium ${
                            sRes === "fail"
                              ? "border-rose-200 text-rose-700 focus:border-rose-350 focus:ring-rose-50"
                              : "border-amber-200 text-amber-700 focus:border-amber-50"
                          }`}
                          value={stepNotes[idx] || ""}
                          onChange={(e) => onStepNoteChange(idx, e.target.value)}
                          placeholder={
                            sRes === "fail"
                              ? "如: 点击登录无响应，控制台抛出 CORS error 跨域拒绝..."
                              : "如: 三方短信网关不可用，无法接收验证码，导致测试流阻断..."
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Verification execution alert & AI defect generation integrated workflow */}
      <div className="border-t border-slate-100 pt-4">
        {/* Case A: All passed successfully */}
        {allPassed && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-5 shadow-3xs text-left flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 select-none shadow-xs">
                <CheckCircle2 className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-black text-slate-800">用例所有测试步骤已通过质量回归</h5>
                <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">
                  🎉 恭喜！当前所有 <span className="font-mono font-black text-emerald-700">{parsedSteps.length}</span> 个步骤均已顺利通过验证，用例结论已同步置为「通过」，请提交结果归档！
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 select-none shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={onResetExecutionDraft}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1 active:scale-95 outline-none"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                <span>重新测试</span>
              </button>
              <button
                type="button"
                onClick={onCommitExecutionHistory}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-md shadow-emerald-100 flex items-center gap-1 active:scale-[0.98] outline-none"
              >
                <Save className="h-3.5 w-3.5" />
                <span>提交结果</span>
              </button>
            </div>
          </div>
        )}

        {/* Case B: There are failed steps */}
        {hasFailures && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/20 p-5 shadow-3xs text-left animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 select-none shadow-xs">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-rose-800">用例执行异常，建议生成缺陷工单</h5>
                  <p className="text-[11px] text-rose-750 font-semibold leading-relaxed">
                    系统检测到该用例有执行失败的步骤。建议一键生成缺陷并分配给开发人员，随后点击提交结果进行归档。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 select-none shrink-0 self-end md:self-center flex-wrap">
                {/* AI Defect Generation button */}
                {!activeCase.linkedDefectId ? (
                  <button
                    type="button"
                    onClick={onAIGenerateDefect}
                    disabled={aiGeneratingDefect}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] px-3.5 py-1.5 transition-all cursor-pointer shadow-md shadow-rose-100 hover:scale-[1.01] active:scale-95 outline-none"
                  >
                    {aiGeneratingDefect && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    <span>一键生成缺陷</span>
                  </button>
                ) : (
                  <div className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>已派生缺陷</span>
                  </div>
                )}

                {(isCompleted || testedCount > 0) && (
                  <>
                    <button
                      type="button"
                      onClick={onResetExecutionDraft}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1 active:scale-95 outline-none"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                      <span>重新测试</span>
                    </button>
                    <button
                      type="button"
                      onClick={onCommitExecutionHistory}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center gap-1 active:scale-[0.98] outline-none"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>提交结果</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Case C: There are blocked steps but no failure */}
        {hasBlocked && !hasFailures && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/15 p-5 shadow-3xs text-left flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 select-none shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-black text-amber-800">用例执行受阻，存在阻断步骤</h5>
                <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                  系统检测到有测试步骤遭遇阻断，请记录外部故障原因，随后点击提交结果进行归档。
                </p>
              </div>
            </div>

            {(isCompleted || testedCount > 0) && (
              <div className="flex items-center gap-2 select-none shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={onResetExecutionDraft}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1 active:scale-95 outline-none"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  <span>重置进度</span>
                </button>
                <button
                  type="button"
                  onClick={onCommitExecutionHistory}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center gap-1 active:scale-[0.98] outline-none"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>提交并归档</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
