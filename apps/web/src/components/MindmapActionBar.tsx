/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Maximize2 as MaximizeIcon,
  Minimize2 as MinimizeIcon,
  Trash2 as TrashIcon,
  Check as CheckIcon,
  Lock as LockIcon
} from "lucide-react";

interface MindmapActionBarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onResetProgress: () => void;
  onCommitArchive: () => void;
  totalCompletedCount: number;
  totalStepsCount: number;
  hasExecutePerm?: boolean;
  hasResetPerm?: boolean;
}

export default function MindmapActionBar({
  isFullscreen,
  onToggleFullscreen,
  onResetProgress,
  onCommitArchive,
  totalCompletedCount,
  totalStepsCount,
  hasExecutePerm = true,
  hasResetPerm = true
}: MindmapActionBarProps) {
  return (
    <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-md p-1.5 px-3 rounded-2xl border border-slate-200/80 shadow-md pointer-events-auto select-none font-sans">

      {/* Real-time progress metric indicator */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-2.5 py-1.5 font-mono text-[10px] font-black text-indigo-700 flex items-center gap-1 shrink-0">
        <span>进度:</span>
        <span className="text-slate-800 font-extrabold">{totalCompletedCount}/{totalStepsCount}</span>
      </div>

      <div className="w-[1px] h-4 bg-slate-200 shrink-0" />

      {/* Reset Progress */}
      <div className="relative group inline-block">
        <button
          type="button"
          onClick={hasResetPerm ? onResetProgress : undefined}
          disabled={!hasResetPerm}
          className={`p-1.5 px-3 text-[10px] font-black rounded-lg transition-colors shrink-0 ${
            hasResetPerm
              ? "bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 cursor-pointer"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
          }`}
          title={hasResetPerm ? "清空检验勾选草稿，全部标为未测试" : "无重置权限"}
        >
          重置进度
        </button>
        {!hasResetPerm && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            ⚠️ 您所属的工作群组无权进行此操作
          </div>
        )}
      </div>

      {/* Commit Archive */}
      <div className="relative group inline-block">
        <button
          type="button"
          onClick={hasExecutePerm ? onCommitArchive : undefined}
          disabled={!hasExecutePerm}
          className={`p-1.5 px-3.5 text-[10px] font-black rounded-lg transition-all shrink-0 shadow-xs flex items-center gap-1 ${
            hasExecutePerm
              ? "bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 text-white cursor-pointer active:scale-95"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
          }`}
          title={hasExecutePerm ? "将测试结果物理写入归盘库并创建审计日志" : "无执行权限"}
        >
          {hasExecutePerm ? (
            <CheckIcon className="h-3 w-3 shrink-0 stroke-[2.5]" />
          ) : (
            <LockIcon className="h-3 w-3 shrink-0 stroke-[2.5]" />
          )}
          <span>提交结果</span>
        </button>
        {!hasExecutePerm && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            ⚠️ 您所属的工作群组无权进行此操作
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-slate-200 shrink-0" />

      {/* Fullscreen / exit fullscreen */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className={`p-1.5 px-3 text-[10px] font-black rounded-lg transition-colors cursor-pointer border shrink-0 flex items-center gap-1 ${
          isFullscreen
            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
            : "bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700"
        }`}
      >
        {isFullscreen ? (
          <>
            <MinimizeIcon className="h-3 w-3 shrink-0 stroke-[2.5]" />
            <span>退出全屏</span>
          </>
        ) : (
          <>
            <MaximizeIcon className="h-3 w-3 shrink-0 stroke-[2.5]" />
            <span>全屏视图</span>
          </>
        )}
      </button>
    </div>
  );
}
