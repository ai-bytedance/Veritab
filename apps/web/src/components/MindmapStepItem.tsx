/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Edit3, Trash2 } from "lucide-react";

interface MindmapStepItemProps {
  key?: React.Key;
  caseId: string;
  stepIdx: number;
  stepText: string;
  expectedText: string;
  status: "pass" | "fail" | "blocked" | "untested";
  note: string;
  editingKey: string | null;
  editValue: string;
  setEditValue: (val: string) => void;
  onStatusChange: (status: "pass" | "fail" | "blocked" | "untested") => void;
  onNoteChange: (note: string) => void;
  onStartEdit: (key: string, initialVal: string) => void;
  onSaveInline: (key: string) => void;
  onDelete?: () => void;
  isCompact?: boolean;
}

export default function MindmapStepItem({
  caseId,
  stepIdx,
  stepText,
  expectedText,
  status,
  note,
  editingKey,
  editValue,
  setEditValue,
  onStatusChange,
  onNoteChange,
  onStartEdit,
  onSaveInline,
  onDelete,
  isCompact = false
}: MindmapStepItemProps) {
  const isStepEditing = editingKey === `step-${caseId}-${stepIdx}`;
  const isExpectedEditing = editingKey === `expected-${caseId}-${stepIdx}`;
  const isNoteEditing = editingKey === `note-${caseId}-${stepIdx}`;

  return (
    <div
      className={`border transition-all shadow-3xs relative max-w-none w-full ${
        isCompact ? "rounded-lg p-2 py-1.5 space-y-1.5" : "rounded-xl p-3.5 py-3 space-y-2"
      } ${
        status === "pass" ? "bg-emerald-50/20 border-emerald-200" :
        status === "fail" ? "bg-rose-50/20 border-rose-200 animate-pulse" :
        status === "blocked" ? "bg-amber-50/20 border-amber-200" :
        "bg-white border-slate-200 hover:border-indigo-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 text-left">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <span className={`rounded-md text-[9px] font-mono font-black flex items-center justify-center shrink-0 border mt-0.5 ${
            isCompact ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[9px]"
          } ${
            status === "pass" ? "bg-emerald-500 text-white border-emerald-600" :
            status === "fail" ? "bg-rose-500 text-white border-rose-600" :
            status === "blocked" ? "bg-amber-500 text-white border-amber-600" :
            "bg-slate-100 text-slate-500 border-slate-200"
          }`}>
            {stepIdx + 1}
          </span>

          {isStepEditing ? (
            <textarea
              className={`border border-indigo-200 rounded p-1 font-bold bg-white select-text outline-none flex-1 w-full resize-y text-slate-800 ${
                isCompact ? "text-[8.5px] min-h-[32px]" : "text-[9.5px] min-h-[44px]"
              }`}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => onSaveInline(`step-${caseId}-${stepIdx}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSaveInline(`step-${caseId}-${stepIdx}`);
                }
              }}
              autoFocus
            />
          ) : (
            <div
              onClick={() => onStartEdit(`step-${caseId}-${stepIdx}`, stepText)}
              className={`font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 flex items-start gap-1 w-full break-words whitespace-normal ${
                isCompact ? "text-[9px]" : "text-[10px]"
              }`}
              title="点击可编辑修改步骤描述"
            >
              <span className="font-semibold text-slate-800 break-words whitespace-normal leading-relaxed flex-1">{stepText}</span>
              <Edit3 className="h-3 w-3 text-slate-400 shrink-0 mt-0.5 opacity-40 hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Interactive status checkoff - Compact button group */}
        <div className={`flex items-center gap-1 shrink-0 self-start sm:self-auto ${
          isCompact ? "ml-5" : "ml-7 sm:ml-0"
        }`}>
          <div className="flex bg-slate-105 border border-slate-200 rounded p-0.5 scale-95 select-none font-sans">
            <button
              onClick={() => onStatusChange("pass")}
              className={`rounded text-[8px] font-black transition-all cursor-pointer ${
                isCompact ? "px-1.5 py-0.2" : "px-2 py-0.5"
              } ${status === "pass" ? "bg-emerald-500 text-white shadow-3xs" : "text-slate-600 hover:bg-white"}`}
              title="通过"
            >
              {isCompact ? "✓" : "✓ 通过"}
            </button>
            <button
              onClick={() => onStatusChange("fail")}
              className={`rounded text-[8px] font-black transition-all cursor-pointer ${
                isCompact ? "px-1.5 py-0.2" : "px-2 py-0.5"
              } ${status === "fail" ? "bg-rose-500 text-white shadow-3xs" : "text-slate-600 hover:bg-white"}`}
              title="失败"
            >
              {isCompact ? "✗" : "✗ 失败"}
            </button>
            <button
              onClick={() => onStatusChange("blocked")}
              className={`rounded text-[8px] font-black transition-all cursor-pointer ${
                isCompact ? "px-1.5 py-0.2" : "px-2 py-0.5"
              } ${status === "blocked" ? "bg-amber-500 text-white shadow-3xs" : "text-slate-600 hover:bg-white"}`}
              title="阻断"
            >
              {isCompact ? "⚠️" : "⚠️ 阻断"}
            </button>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 rounded transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-3xs"
              title="删除此步骤"
            >
              <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Expected outcomes - Expanded wrapped layout */}
      <div className={`text-slate-600 font-medium flex items-start gap-1 select-none text-left ${
        isCompact ? "pl-5 text-[9px]" : "pl-7 text-[10px]"
      }`}>
        <span className="text-[8px] font-black text-indigo-650 shrink-0 mt-0.5 font-mono bg-indigo-50 border border-indigo-100 px-1 rounded uppercase tracking-wide">
          {isCompact ? "↳ 预期:" : "[预期]:"}
        </span>
        {isExpectedEditing ? (
          <textarea
            className={`border border-indigo-200 rounded p-1 bg-white outline-none select-text flex-1 resize-y text-slate-800 ${
              isCompact ? "text-[8.5px] min-h-[30px]" : "text-[9px] min-h-[40px]"
            }`}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onSaveInline(`expected-${caseId}-${stepIdx}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSaveInline(`expected-${caseId}-${stepIdx}`);
              }
            }}
            autoFocus
          />
        ) : (
          <div
            onClick={() => onStartEdit(`expected-${caseId}-${stepIdx}`, expectedText)}
            className="cursor-pointer hover:underline text-slate-600 font-medium break-words whitespace-normal flex-1 flex items-start gap-1 pr-1"
            title="点击可编辑修改预期结果"
          >
            <span className="font-semibold text-slate-600 font-sans leading-relaxed break-words whitespace-normal">{expectedText}</span>
            <Edit3 className="h-2.5 w-2.5 text-indigo-400 shrink-0 mt-0.5 opacity-40" />
          </div>
        )}
      </div>

      {/* Defect note inline layout - Wrapped to prevent truncation */}
      {(status === "fail" || status === "blocked") && (
        <div className={`animate-fade-in space-y-0.5 text-left ${
          isCompact ? "pl-5 text-[8.5px]" : "pl-7 text-[9px]"
        }`}>
          <span className={`text-[8px] font-black uppercase block ${status === "fail" ? "text-rose-600" : "text-amber-600"}`}>
            {status === "fail" ? "🚨 " : "⚠️ "}_偏差说明：
          </span>
          {isNoteEditing ? (
            <textarea
              className={`w-full bg-white border border-slate-205 rounded p-1 outline-none resize-y font-semibold font-mono text-slate-800 ${
                isCompact ? "text-[8.5px] min-h-[32px]" : "text-[9px] min-h-[44px]"
              }`}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                onNoteChange(editValue);
                onSaveInline(`note-${caseId}-${stepIdx}`);
              }}
              autoFocus
            />
          ) : (
            <div
              onClick={() => onStartEdit(`note-${caseId}-${stepIdx}`, note)}
              className="p-1 px-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded text-[8.5px] font-semibold text-slate-600 cursor-pointer flex items-start justify-between gap-1 break-words whitespace-normal"
            >
              <span className="font-mono text-slate-600 break-words whitespace-normal leading-relaxed flex-1">{note || "暂无说明，点击添加偏差 / 阻断详情..."}</span>
              <Edit3 className="h-2.5 w-2.5 text-slate-400 shrink-0 mt-0.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
