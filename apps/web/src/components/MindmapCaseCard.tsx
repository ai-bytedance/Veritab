/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { TestCase, TestCaseStatus, TestCaseGrade } from "../types";
import { Plus, Check, X, AlertTriangle, Trash2, Edit3 } from "lucide-react";
import MindmapStepItem from "./MindmapStepItem";
import { formatCaseId } from "../lib/idUtils";

interface MindmapCaseCardProps {
  tc: TestCase;
  tcState?: {
    stepResults: Record<number, "pass" | "fail" | "blocked" | "untested">;
    stepNotes: Record<number, string>;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStepStatusChange: (caseId: string, idx: number, status: "pass" | "fail" | "blocked" | "untested") => void;
  onStepNoteChange: (caseId: string, idx: number, noteStr: string) => void;
  onUpdateTestCase: (tc: TestCase) => void;
  isActive?: boolean;
  onSelect?: () => void;
  onAddStep?: (caseId: string) => void;
  onDeleteStep?: (caseId: string, idx: number) => void;
  isCompact?: boolean;
  onDeleteTestCase?: (id: string) => void;
}

export default function MindmapCaseCard({
  tc,
  tcState,
  isExpanded,
  onToggleExpand,
  onStepStatusChange,
  onStepNoteChange,
  onUpdateTestCase,
  isActive = false,
  onSelect,
  onAddStep,
  onDeleteStep,
  isCompact = false,
  onDeleteTestCase
}: MindmapCaseCardProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [shouldEditNewStepOnAdd, setShouldEditNewStepOnAdd] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<"top" | "bottom" | null>(null);

  const getNormalizedGrade = (grade: any): TestCaseGrade => {
    if (!grade) return TestCaseGrade.P1;
    const str = String(grade);
    if (str.includes("P0")) return TestCaseGrade.P0;
    if (str.includes("P2")) return TestCaseGrade.P2;
    if (str.includes("P3")) return TestCaseGrade.P3;
    return TestCaseGrade.P1;
  };

  const handleStartEdit = (key: string, initialVal: string) => {
    setEditingKey(key);
    setEditValue(initialVal);
  };

  const handleSaveInline = (key: string, caseId?: string) => {
    setEditingKey(null);
    let updatedCase = { ...tc, updatedAt: new Date().toISOString() };

    if (key.startsWith("name-")) {
      updatedCase.name = editValue.trim() || tc.name;
    } else if (key.startsWith("precondition-")) {
      updatedCase.precondition = editValue.trim();
    } else if (key.startsWith("step-")) {
      const parts = key.split("-");
      const idx = Number(parts[parts.length - 1]);
      const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      const stepsCopy = [...tcSteps];
      stepsCopy[idx] = editValue.trim() || stepsCopy[idx];
      updatedCase.steps = stepsCopy.join("\n");
    } else if (key.startsWith("expected-")) {
      const parts = key.split("-");
      const idx = Number(parts[parts.length - 1]);
      const tcExpected = tc.expectedResult ? tc.expectedResult.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      const expectedCopy = [...tcExpected];
      expectedCopy[idx] = editValue.trim() || expectedCopy[idx];
      updatedCase.expectedResult = expectedCopy.join("\n");
    }

    onUpdateTestCase(updatedCase);
  };

  const computedState = tcState || { stepResults: {}, stepNotes: {} };
  const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
  const tcExpected = tc.expectedResult ? tc.expectedResult.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
  const testedCountTc = Object.values(computedState.stepResults).filter(v => v !== "untested").length;

  useEffect(() => {
    if (shouldEditNewStepOnAdd && tcSteps.length > 0) {
      const newIdx = tcSteps.length - 1;
      handleStartEdit(`step-${tc.id}-${newIdx}`, tcSteps[newIdx]);
      setShouldEditNewStepOnAdd(false);
    }
  }, [tcSteps.length, shouldEditNewStepOnAdd]);

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    key: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveInline(key);
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleSaveInline(key);
      if (onAddStep) {
        setShouldEditNewStepOnAdd(true);
        onAddStep(tc.id);
      }
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.hasAttribute("contenteditable")) {
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        onAddStep?.(tc.id);
      } else if (e.key === "/") {
        e.preventDefault();
        onToggleExpand();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        onDeleteTestCase?.(tc.id);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isActive, tc.id, tc.name, isExpanded, onAddStep, onToggleExpand, onDeleteTestCase]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <div id={`mindmap-case-${tc.id}`} className="relative flex flex-row items-center select-text text-left">
      {isCompact ? (
        /* --- Extremely Compact Mindmap Node Mode (matching user uploaded image style) --- */
        <div className="relative flex flex-row items-center select-text text-left shrink-0">
          <div
            onClick={handleCardClick}
            className={`group/case rounded-md border-2 shadow-3xs shrink-0 flex items-center justify-between select-none cursor-pointer transition-all ${
              isActive
                ? "bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                : !isExpanded
                ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
            } p-1 px-2.5 h-[36px] w-[280px]`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Priority Grade badge custom dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === "top" ? null : "top");
                  }}
                  className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase font-mono border leading-none outline-none cursor-pointer hover:shadow-2xs transition-all flex items-center gap-0.5 ${
                    getNormalizedGrade(tc.grade) === TestCaseGrade.P0 ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" :
                    getNormalizedGrade(tc.grade) === TestCaseGrade.P2 ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" :
                    getNormalizedGrade(tc.grade) === TestCaseGrade.P3 ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100" :
                    "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  }`}
                  title="修改用例优先级"
                >
                  <span>{getNormalizedGrade(tc.grade)}</span>
                  <span className="text-[6px] opacity-70 scale-75 origin-center">▼</span>
                </button>

                {activeDropdown === "top" && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(null);
                      }}
                    />
                    <div
                      className="absolute left-0 mt-1 z-50 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1 min-w-[64px] flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[TestCaseGrade.P0, TestCaseGrade.P1, TestCaseGrade.P2, TestCaseGrade.P3].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            onUpdateTestCase({ ...tc, grade: g, updatedAt: new Date().toISOString() });
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left text-[9px] font-black px-1.5 py-1 rounded font-mono transition-colors flex items-center justify-between ${
                            getNormalizedGrade(tc.grade) === g
                              ? "bg-indigo-50 text-indigo-600"
                              : "hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span>{g}</span>
                          {getNormalizedGrade(tc.grade) === g && <Check className="h-2.5 w-2.5 text-indigo-600 stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Case Name (inline editable) */}
              {editingKey === `name-${tc.id}` ? (
                <input
                  className="border border-indigo-250 border-indigo-300 rounded px-1 text-[10px] font-bold bg-white outline-none flex-1 py-0.5 text-slate-800"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveInline(`name-${tc.id}`)}
                  onKeyDown={(e) => handleInputKeyDown(e, `name-${tc.id}`)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(`name-${tc.id}`, tc.name);
                  }}
                  className="text-[10px] font-bold text-slate-800 truncate cursor-pointer hover:text-indigo-600 flex-1 leading-snug"
                  title={tc.name}
                >
                  {tc.name}
                </span>
              )}

              {/* Cyan [用例] badge */}
              <span className="bg-sky-150 bg-sky-200/60 text-sky-800 text-[8px] px-1.5 py-0.5 rounded font-black shrink-0 select-none">
                用例
              </span>
            </div>

            {/* Overall status and collapse icon */}
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                tc.status === TestCaseStatus.PASS ? "bg-emerald-500" :
                tc.status === TestCaseStatus.FAIL ? "bg-rose-500 animate-pulse" :
                tc.status === TestCaseStatus.BLOCKED ? "bg-amber-500" :
                "bg-slate-300"
              }`} title={`状态: ${tc.status}`} />
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="text-[10px] font-black text-slate-400 p-1 hover:text-indigo-650 hover:bg-slate-200 rounded-md transition-all cursor-pointer"
                title={isExpanded ? "收起用例步骤" : "展开用例步骤"}
              >
                {isExpanded ? "⊖" : "⊕"}
              </span>
            </div>
          </div>


        </div>
      ) : (
        /* --- Standard Comfortable Box Layout Mode --- */
        <div
          onClick={handleCardClick}
          className={`group/case rounded-xl border shadow-3xs shrink-0 text-left transition-all select-none cursor-pointer p-3.5 w-[320px] ${
            isActive
              ? "bg-indigo-50/20 border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 shadow-xs"
              : !isExpanded
              ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
              : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between select-none mb-2">
            <span className="text-[8px] font-black tracking-wider font-mono flex items-center gap-1 text-slate-400">
              {isActive && <span className="inline-block w-1 h-1 bg-indigo-600 rounded-full animate-ping" />}
              <span>[{formatCaseId(tc.id)}]</span>
              {isActive && <span className="text-[7.5px] font-bold text-indigo-600 bg-indigo-100/80 rounded px-1 scale-90 origin-left">当前选定</span>}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="text-[8.5px] font-extrabold text-slate-450 hover:text-indigo-600 hover:bg-slate-100 rounded px-1.5 py-0.5 transition-all cursor-pointer"
              title={isExpanded ? "收起用例步骤" : "展开用例步骤"}
            >
              {isExpanded ? "收起 -" : "展开 +"}
            </span>
          </div>

          {editingKey === `name-${tc.id}` ? (
            <textarea
              className="border border-indigo-200 rounded p-1.5 text-[10.5px] font-bold bg-white outline-none w-full min-h-[40px] resize-y text-slate-800"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleSaveInline(`name-${tc.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveInline(`name-${tc.id}`);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(`name-${tc.id}`, tc.name);
              }}
              className="text-[10.5px] font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded p-1.5 leading-normal truncate whitespace-nowrap overflow-hidden text-ellipsis block w-full hover:text-indigo-600 transition-colors"
              title={tc.name}
            >
              {tc.name}
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2 border-t border-slate-100 pt-2.5 justify-between shrink-0 select-none">
            {/* Priority Grade badge custom dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === "bottom" ? null : "bottom");
                }}
                className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase font-mono border leading-none outline-none cursor-pointer hover:shadow-2xs transition-all flex items-center gap-0.5 ${
                  getNormalizedGrade(tc.grade) === TestCaseGrade.P0 ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" :
                  getNormalizedGrade(tc.grade) === TestCaseGrade.P2 ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" :
                  getNormalizedGrade(tc.grade) === TestCaseGrade.P3 ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100" :
                  "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                }`}
                title="修改用例优先级"
              >
                <span>{getNormalizedGrade(tc.grade)}</span>
                <span className="text-[6px] opacity-70 scale-75 origin-center">▼</span>
              </button>

              {activeDropdown === "bottom" && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(null);
                    }}
                  />
                  <div
                    className="absolute left-0 mt-1 z-50 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1 min-w-[64px] flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[TestCaseGrade.P0, TestCaseGrade.P1, TestCaseGrade.P2, TestCaseGrade.P3].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          onUpdateTestCase({ ...tc, grade: g, updatedAt: new Date().toISOString() });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left text-[9px] font-black px-1.5 py-1 rounded font-mono transition-colors flex items-center justify-between ${
                          getNormalizedGrade(tc.grade) === g
                            ? "bg-indigo-50 text-indigo-600"
                            : "hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span>{g}</span>
                        {getNormalizedGrade(tc.grade) === g && <Check className="h-2.5 w-2.5 text-indigo-600 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className={`text-[8px] font-extrabold rounded px-1.5 py-0.5 uppercase font-mono border ${
              tc.status === TestCaseStatus.PASS ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-3xs" :
              tc.status === TestCaseStatus.FAIL ? "bg-rose-50 text-rose-500 border-rose-200 animate-pulse shadow-3xs" :
              tc.status === TestCaseStatus.BLOCKED ? "bg-amber-50 text-amber-600 border-amber-200 shadow-3xs" :
              "bg-slate-50 border-slate-200 text-slate-500"
            }`}>
              {tc.status}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[8px] font-black text-slate-400 select-none">
            <span className="font-mono scale-95 origin-left text-slate-500">
              回归进度: {testedCountTc}/{tcSteps.length}
            </span>
          </div>
        </div>
      )}

      {/* Step details next to case - dynamically optimized depending on isCompact flag */}
      {isExpanded && (
        isCompact ? (
          /* --- Horizontal branches of step nodes (perfectly matching the user's mockup image!) --- */
          <>
            {/* Horizontal connecting line from case node */}
            <div className="flex items-center justify-center shrink-0 w-6 select-none mx-0.5">
              <svg width="24" height="16" viewBox="0 0 24 16" fill="none" className="text-slate-400">
                <path d="M0 8H24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Vertical fork list of steps, joined by standard XMind-style left border-l */}
            <div className="relative pl-4 border-l-2 border-slate-300 py-1 space-y-3.5 flex flex-col justify-center select-text">
              {tcSteps.length === 0 ? (
                <div className="relative flex items-center gap-1.5">
                  <span className="absolute -left-4 w-4 h-[1px] bg-slate-300" />
                  <div className="bg-white border-2 border-indigo-200 rounded-md p-1.5 px-3 text-[9.5px] text-slate-400 italic shadow-3xs">
                    暂无回归步骤。
                    {onAddStep && (
                      <button
                        onClick={() => onAddStep(tc.id)}
                        className="text-indigo-650 hover:underline ml-1 font-black cursor-pointer"
                      >
                        + 快速添加
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {tcSteps.map((stepText, idx) => {
                    const sRes = computedState.stepResults[idx] || "untested";
                    const expText = tcExpected[idx] || tcExpected[tcExpected.length - 1] || tcExpected[0] || "通过验证并运行符合逻辑与预期";
                    const stepNote = computedState.stepNotes[idx] || "";

                    return (
                      <div key={idx} className="relative flex flex-row items-center gap-1.5 animate-fade-in">
                        {/* 1. Step Description Node (green-yellow styled tag matching the mockup) */}
                        <div className={`rounded-md border-2 min-h-[36px] h-auto py-1.5 px-3 flex items-center gap-2 w-[320px] shrink-0 transition-all ${
                          sRes === "pass" ? "bg-[#f4fbf7] border-emerald-500 text-emerald-800" :
                          sRes === "fail" ? "bg-[#fff5f5] border-rose-500 animate-pulse text-rose-800" :
                          sRes === "blocked" ? "bg-[#fffbeb] border-amber-500 text-amber-800" :
                          "bg-white border-indigo-200 text-slate-700 hover:border-indigo-400 shadow-3xs"
                        }`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            sRes === "pass" ? "bg-emerald-500" :
                            sRes === "fail" ? "bg-rose-500 animate-ping" :
                            sRes === "blocked" ? "bg-amber-500" :
                            "bg-slate-300"
                          }`} />

                          <span className="text-[10px] font-extrabold text-slate-500 shrink-0 select-none">
                            {idx + 1}.
                          </span>

                          {editingKey === `step-${tc.id}-${idx}` ? (
                            <input
                              className="border border-indigo-300 rounded px-1 text-[10px] font-bold bg-white outline-none py-0.5 text-slate-800 w-full flex-1 min-w-0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveInline(`step-${tc.id}-${idx}`)}
                              onKeyDown={(e) => handleInputKeyDown(e, `step-${tc.id}-${idx}`)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(`step-${tc.id}-${idx}`, stepText);
                              }}
                              className="text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:text-indigo-650 leading-relaxed py-0.5 flex-1 min-w-0 text-left"
                              title={stepText}
                            >
                              {stepText}
                            </span>
                          )}

                          <span className="bg-lime-200/50 text-lime-800 text-[8px] px-1.5 py-0.5 rounded font-black shrink-0 select-none ml-auto">
                            步骤描述
                          </span>
                        </div>

                        {/* Connector to Expected Result */}
                        <div className="w-4 h-[1.5px] bg-slate-300 shrink-0" />

                        {/* 2. Expected Result Node (pink styled tag matching the mockup) */}
                        <div className={`rounded-md border-2 min-h-[36px] h-auto py-1.5 px-3 flex items-center gap-2 w-[260px] shrink-0 transition-all ${
                          sRes === "pass" ? "bg-[#f4fbf7] border-emerald-500 text-emerald-800" :
                          sRes === "fail" ? "bg-[#fff5f5] border-rose-500 text-rose-800" :
                          sRes === "blocked" ? "bg-[#fffbeb] border-amber-500 text-amber-800" :
                          "bg-white border-indigo-200 text-slate-700 hover:border-indigo-400 shadow-3xs"
                        }`}>
                          {editingKey === `expected-${tc.id}-${idx}` ? (
                            <input
                              className="border border-indigo-300 rounded px-1 text-[10px] font-bold bg-white outline-none py-0.5 text-slate-800 w-full flex-1 min-w-0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveInline(`expected-${tc.id}-${idx}`)}
                              onKeyDown={(e) => handleInputKeyDown(e, `expected-${tc.id}-${idx}`)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(`expected-${tc.id}-${idx}`, expText);
                              }}
                              className="text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:text-indigo-650 leading-relaxed py-0.5 flex-1 min-w-0 text-left"
                              title={expText}
                            >
                              {expText}
                            </span>
                          )}

                          <span className="bg-pink-100 text-pink-700 text-[8px] px-1.5 py-0.5 rounded font-black shrink-0 select-none ml-auto">
                            预期结果
                          </span>
                        </div>

                        {/* Connector to status/action pills */}
                        <div className="w-3.5 h-[1.5px] bg-slate-300 shrink-0" />

                        {/* Status select buttons (Mini inline checkoff matching mockup layout exactly) */}
                        <div className="flex bg-white border-2 border-indigo-200 hover:border-indigo-300 rounded-md p-0.5 shrink-0 select-none items-center h-[36px] gap-1 shadow-3xs">
                          <button
                            onClick={() => onStepStatusChange(tc.id, idx, "pass")}
                            className={`rounded text-[10px] font-black transition-all cursor-pointer w-[24px] h-[24px] flex items-center justify-center ${
                              sRes === "pass" ? "bg-emerald-500 text-white shadow-3xs" : "text-slate-500 hover:bg-slate-100"
                            }`}
                            title="验证通过 (✔️)"
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => onStepStatusChange(tc.id, idx, "fail")}
                            className={`rounded text-[10px] font-black transition-all cursor-pointer w-[24px] h-[24px] flex items-center justify-center ${
                              sRes === "fail" ? "bg-rose-500 text-white shadow-3xs" : "text-slate-500 hover:bg-slate-100"
                            }`}
                            title="标记失败 (✖️)"
                          >
                            <X className="h-3 w-3 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => onStepStatusChange(tc.id, idx, "blocked")}
                            className={`rounded text-[10px] font-black transition-all cursor-pointer w-[24px] h-[24px] flex items-center justify-center ${
                              sRes === "blocked" ? "bg-amber-500 text-white shadow-3xs" : "text-slate-500 hover:bg-slate-100"
                            }`}
                            title="标记阻断 (⚠️)"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>
                          {onDeleteStep && (
                            <>
                              <div className="w-[1.5px] h-4 bg-slate-200" />
                              <button
                                onClick={() => onDeleteStep(tc.id, idx)}
                                className="w-[24px] h-[24px] flex items-center justify-center bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 rounded cursor-pointer transition-all shadow-3xs"
                                title="删除此步骤"
                              >
                                <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Deviation Details (direct inline node branching on fail/blocked!) */}
                        {(sRes === "fail" || sRes === "blocked") && (
                          <>
                            <div className="w-3.5 h-[1.5px] bg-slate-400 shrink-0" />
                            <div className="flex items-center shrink-0">
                              {editingKey === `note-${tc.id}-${idx}` ? (
                                <input
                                  className="border border-rose-300 bg-white rounded p-1 px-2.5 text-[10px] outline-none w-[150px] h-[36px] font-bold"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => {
                                    onStepNoteChange(tc.id, idx, editValue);
                                    setEditingKey(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      onStepNoteChange(tc.id, idx, editValue);
                                      setEditingKey(null);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(`note-${tc.id}-${idx}`, stepNote);
                                  }}
                                  className="px-3 py-1.5 border-[2px] border-red-300 bg-red-50 text-[10px] text-red-700 font-extrabold rounded-md cursor-pointer hover:bg-red-100/80 max-w-[185px] truncate h-[36px] flex items-center gap-1"
                                  title={stepNote || "点击输入具体回归偏差..."}
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-red-500" />
                                  <span>{stepNote || "填写偏差说明"}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Sibling '+ 添加测试步骤' Node to allow seamless mouse adding right inside the mindmap branches! */}
                  {onAddStep && (
                    <div className="relative flex flex-row items-center gap-1.5 animate-fade-in group/add">
                      {/* Branch connector from the vertical line */}
                      <span className="absolute -left-4 w-4 h-[1px] bg-slate-300" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddStep(tc.id);
                        }}
                        className="rounded-md border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 p-1 px-4.5 h-[36px] flex items-center text-indigo-700 hover:text-indigo-900 font-black text-[10px] shadow-3xs cursor-pointer transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <span>添加测试步骤</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* --- Standard Comfortable Box Layout Mode Step list panel --- */
          <>
            <div className="flex items-center justify-center shrink-0 select-none mx-0.5 animate-fade-in w-6 h-4">
              <svg width="100%" height="100%" viewBox="0 0 24 16" fill="none" className="text-slate-300">
                <path d="M0 8H24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <div
              className="flex flex-col bg-slate-100/10 border border-indigo-100/40 rounded-xl text-left animate-fade-in shadow-3xs w-full max-w-[680px] min-w-0 md:min-w-[520px] p-2.5 gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {tc.precondition && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/10 p-2 text-[9.5px]">
                  <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest block mb-0.5 font-mono">
                    [前置条件 PRECONDITION]
                  </span>
                  <span className="font-semibold text-slate-700 leading-relaxed break-words whitespace-normal block">{tc.precondition}</span>
                </div>
              )}

              <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[380px]">
                {tcSteps.length === 0 ? (
                  <div className="text-center py-3 text-slate-400 italic text-[9px] font-semibold">暂无回归步骤。</div>
                ) : (
                  tcSteps.map((stepText, idx) => {
                    const sRes = computedState.stepResults[idx] || "untested";
                    const expText = tcExpected[idx] || tcExpected[tcExpected.length - 1] || tcExpected[0] || "通过验证并运行符合逻辑与预期";

                    return (
                      <MindmapStepItem
                        key={idx}
                        caseId={tc.id}
                        stepIdx={idx}
                        stepText={stepText}
                        expectedText={expText}
                        status={sRes}
                        note={computedState.stepNotes[idx] || ""}
                        editingKey={editingKey}
                        editValue={editValue}
                        setEditValue={setEditValue}
                        onStatusChange={(status) => onStepStatusChange(tc.id, idx, status)}
                        onNoteChange={(noteStr) => onStepNoteChange(tc.id, idx, noteStr)}
                        onStartEdit={handleStartEdit}
                        onSaveInline={(key) => handleSaveInline(key, tc.id)}
                        onDelete={onDeleteStep ? () => onDeleteStep(tc.id, idx) : undefined}
                        isCompact={isCompact}
                      />
                    );
                  })
                )}
              </div>

              {onAddStep && (
                <div className="mt-1 pt-1.5 border-t border-slate-100 flex justify-end shrink-0 select-none">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddStep(tc.id);
                    }}
                    className="w-full flex items-center justify-center gap-1 py-1 px-3 rounded-lg border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/10 hover:bg-indigo-50/45 text-indigo-650 hover:text-indigo-700 transition-all cursor-pointer shadow-3xs font-black text-[9.5px]"
                    title="为当前用例添加一个全新的测试步骤"
                  >
                    <Plus className="h-3 w-3" />
                    <span>添加步骤</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
