/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Folder,
  GitBranch,
  Search,
  X,
  Check
} from "lucide-react";
import { TestCase, Folder as FolderType, Issue } from "../types";
import { formatCaseId } from "../lib/idUtils";

interface MoveCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseIds: string[];
  testCases: TestCase[];
  folders: FolderType[];
  requirements: Issue[];
  onConfirmMove: (caseIds: string[], folderId: string | undefined, linkedRequirementId?: string) => void;
}

export default function MoveCaseModal({
  isOpen,
  onClose,
  caseIds,
  testCases,
  folders,
  requirements,
  onConfirmMove
}: MoveCaseModalProps) {
  const [searchValue, setSearchValue] = useState("");

  // Selection can be of type { type: 'folder', id: string | undefined } or { type: 'requirement', id: string }
  const [selectedTarget, setSelectedTarget] = useState<{
    type: "folder" | "requirement";
    id: string | undefined;
  } | null>(null);

  const selectedCases = useMemo(() => {
    return testCases.filter(tc => caseIds.includes(tc.id));
  }, [testCases, caseIds]);

  // Combined search and target generation
  const listOptions = useMemo(() => {
    const options: Array<{
      type: "folder" | "requirement";
      id: string | undefined;
      label: string;
      isRoot?: boolean;
    }> = [];

    // 1. Add "Unplanned" / "Root" Folder
    options.push({
      type: "folder",
      id: undefined,
      label: "未规划 (根目录)",
      isRoot: true
    });

    // Helper to build full path for folders
    const getFolderPath = (folder: FolderType): string => {
      const parent = folders.find(f => f.id === folder.parentId);
      if (parent) {
        return `${getFolderPath(parent)} / ${folder.name}`;
      }
      return folder.name;
    };

    // 2. Add normal folders
    folders.forEach(f => {
      options.push({
        type: "folder",
        id: f.id,
        label: getFolderPath(f)
      });
    });

    // 3. Add requirements
    requirements.forEach(r => {
      options.push({
        type: "requirement",
        id: r.id,
        label: r.title
      });
    });

    // Apply filter
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      return options.filter(opt => opt.label.toLowerCase().includes(query));
    }

    return options;
  }, [folders, requirements, searchValue]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!selectedTarget) return;

    if (selectedTarget.type === "folder") {
      onConfirmMove(caseIds, selectedTarget.id, undefined);
    } else {
      onConfirmMove(caseIds, undefined, selectedTarget.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span>🔀</span>
              <h3 className="text-sm font-black text-slate-800">移动测试用例与归属管理</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              请检查左侧拟移动的测试用例列表，并在右侧指定新的目标目录或关联需求：
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Split Dual-Column Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-150">

          {/* Left Panel - Source Case List Preview */}
          <div className="flex flex-col p-5 overflow-hidden">
            <div className="mb-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-indigo-650"></div>
                <span className="text-xs font-black text-slate-700">1. 拟移动的源测试用例列表</span>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-md border border-indigo-100 select-none">
                共 {selectedCases.length} 个用例
              </span>
            </div>

            {/* List container */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 bg-slate-50/30 rounded-xl p-3 border border-slate-100/50 min-h-[220px]">
              {selectedCases.map((tc) => {
                // Find current parent location label
                let locationLabel = "未规划 (根目录)";
                if (tc.folderId) {
                  const folder = folders.find(f => f.id === tc.folderId);
                  if (folder) locationLabel = `📁 目录: ${folder.name}`;
                } else if (tc.linkedRequirementId) {
                  const req = requirements.find(r => r.id === tc.linkedRequirementId);
                  if (req) locationLabel = `🔀 需求: ${req.title}`;
                }

                return (
                  <div
                    key={`source-preview-${tc.id}`}
                    className="p-3 bg-white border border-slate-150 rounded-xl space-y-1.5 shadow-3xs"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9.5px] font-mono font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {formatCaseId(tc.id)}
                      </span>
                      <span className={`text-[8.5px] font-bold px-1 rounded ${
                        tc.grade === "P0"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : tc.grade === "P1"
                          ? "bg-orange-50 text-orange-600 border border-orange-100"
                          : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                      }`}>
                        {tc.grade}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-medium">
                        当前位于: {locationLabel}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-750 truncate">
                      {tc.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Target Selector */}
          <div className="flex flex-col p-5 overflow-hidden">
            <div className="mb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-black text-slate-700">2. 选择新的归属存放位置</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold select-none">
                必选
              </span>
            </div>

            {/* Target Search Box */}
            <div className="relative mb-3 shrink-0">
              <input
                type="text"
                placeholder="搜索目录名称或需求标题..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium placeholder:text-slate-400"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Destination options list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 bg-slate-50/30 rounded-xl p-2 border border-slate-100/50 min-h-[220px]">
              {listOptions.length === 0 ? (
                <div className="text-center py-16 text-slate-400 italic text-xs">没有找到相符的存放位置</div>
              ) : (
                listOptions.map((opt, idx) => {
                  const isSelected = selectedTarget?.type === opt.type && selectedTarget.id === opt.id;
                  return (
                    <button
                      key={`${opt.type}-${opt.id || "root"}-${idx}`}
                      type="button"
                      onClick={() => setSelectedTarget({ type: opt.type, id: opt.id })}
                      className={`w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between border transition-all text-xs cursor-pointer outline-none focus:outline-none focus:ring-0 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-200 text-indigo-850 font-bold"
                          : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {opt.type === "requirement" ? (
                          <GitBranch className={`h-4 w-4 shrink-0 ${isSelected ? "text-indigo-600" : "text-indigo-400"}`} />
                        ) : (
                          <Folder className={`h-4 w-4 shrink-0 ${opt.isRoot ? "text-amber-500" : isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                        )}
                        <span className="truncate">
                          {opt.type === "requirement" ? `[需求] ${opt.label}` : opt.label}
                        </span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-xs transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedTarget}
            className={`px-5 py-2 font-black rounded-xl text-xs transition-all cursor-pointer ${
              selectedTarget
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            确定移动
          </button>
        </div>
      </div>
    </div>
  );
}
