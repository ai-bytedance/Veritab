import React from "react";
import { Eye, Edit3, User as UserIcon, Tag, FolderOpen, GitBranch } from "lucide-react";
import {
  TestCase,
  User,
  Folder as FolderType,
  TestCaseStatus,
  TestCaseGrade,
  Issue,
} from "../types";
import { formatCaseId } from "../lib/idUtils";

interface TestCaseHeaderViewProps {
  activeCase: TestCase;
  activeUsers: User[];
  folders: FolderType[];
  requirements: Issue[];
}

export default function TestCaseHeaderView({
  activeCase,
  activeUsers,
  folders,
  requirements,
}: TestCaseHeaderViewProps) {
  return (
    <>
      {/* Header Preview bar with breadcrumb-like hierarchy at the very top */}
      <div className="flex flex-col justify-between items-start gap-3.5 border-b border-slate-150 pb-4">
        <div className="w-full space-y-2">
          {/* Top Hierarchical Breadcrumb context */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] select-none text-slate-400 font-semibold">
            <span className="text-[10px] font-black text-indigo-650 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100 font-mono shrink-0">
              {formatCaseId(activeCase.id)}
            </span>

            {/* Priority Grade Badge */}
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 shadow-3xs ${
              activeCase.grade === TestCaseGrade.P0
                ? "bg-rose-50 text-rose-750 border-rose-200"
                : activeCase.grade === TestCaseGrade.P1
                ? "bg-orange-50 text-orange-750 border-orange-200"
                : activeCase.grade === TestCaseGrade.P2
                ? "bg-indigo-50 text-indigo-750 border-indigo-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}>
              <Tag className="h-2.5 w-2.5" />
              {activeCase.grade}
            </span>

            {activeCase.version && (
              <>
                <span className="text-slate-300 font-normal">/</span>
                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-lg font-bold font-mono">
                  版本：{activeCase.version}
                </span>
              </>
            )}

            <span className="text-slate-300 font-normal">/</span>
            <span className="flex items-center gap-1 bg-amber-55/10 text-amber-800 px-2.5 py-0.5 rounded-lg font-bold">
              <FolderOpen className="h-3 w-3 text-amber-500" />
              {folders.find((f) => f.id === activeCase.folderId)?.name || "根目录"}
            </span>
            <span className="text-slate-300 font-normal">/</span>
            <span className="flex items-center gap-1 bg-indigo-55/10 text-indigo-850 px-2.5 py-0.5 rounded-lg font-bold">
              <GitBranch className="h-3 w-3 text-indigo-550" />
              主干需求：{requirements.find((r) => r.id === activeCase.linkedRequirementId)?.title || "无关联需求"}
            </span>
          </div>

          <h3
            className="text-sm font-black text-slate-800 leading-relaxed font-sans"
            title={activeCase.name}
          >
            {activeCase.name}
          </h3>
        </div>
      </div>

      {/* Specs single-row horizontal layout for high efficiency */}
      {activeCase.tags && (
        <div className="flex items-center flex-wrap gap-4.5 pt-3 pb-1 select-none">
          {/* Tags */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-650">
            <span className="text-slate-400 font-medium shrink-0">标签:</span>
            <div className="flex flex-wrap gap-1">
              {activeCase.tags.split(/[,，\s]+/).filter(Boolean).map((tag) => (
                <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
