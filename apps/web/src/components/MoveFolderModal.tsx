/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Folder,
  Search,
  X,
  Check,
  FileText,
  CheckSquare,
  Square,
  HelpCircle,
  FolderTree
} from "lucide-react";
import { Folder as FolderType, TestCase, TestCaseGrade } from "../types";
import { formatCaseId } from "../lib/idUtils";

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folders: FolderType[];
  testCases: TestCase[];
  onConfirmMove: (
    folderId: string,
    targetParentId: string | undefined,
    moveType: "both" | "cases_only",
    selectedCaseIds?: string[]
  ) => void;
}

export default function MoveFolderModal({
  isOpen,
  onClose,
  folderId,
  folders,
  testCases,
  onConfirmMove
}: MoveFolderModalProps) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined | null>(null);
  const [moveType, setMoveType] = useState<"both" | "cases_only">("both");

  const currentFolder = useMemo(() => {
    return folders.find(f => f.id === folderId);
  }, [folders, folderId]);

  // Find all test cases directly under this folder
  const directCases = useMemo(() => {
    return testCases.filter(tc => tc.folderId === folderId);
  }, [testCases, folderId]);

  // Maintain local state of selected test case IDs
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(() => {
    return testCases.filter(tc => tc.folderId === folderId).map(tc => tc.id);
  });

  // Helper to obtain all descendant folder IDs for cycle prevention
  const getDescendantIds = useMemo(() => {
    const ids: string[] = [];
    const getChildren = (fid: string) => {
      folders.forEach(f => {
        if (f.parentId === fid) {
          ids.push(f.id);
          getChildren(f.id);
        }
      });
    };
    if (folderId) {
      getChildren(folderId);
    }
    return new Set(ids);
  }, [folders, folderId]);

  // Check if a folder can be a valid destination
  const isTargetValid = (fId: string | undefined) => {
    if (fId === folderId) return false;     // Cannot move to self
    if (fId && getDescendantIds.has(fId)) return false; // Cannot move to subfolders
    return true;
  };

  // Helper to build folder path
  const getFolderPath = (folder: FolderType): string => {
    const parent = folders.find(f => f.id === folder.parentId);
    if (parent) {
      return `${getFolderPath(parent)} / ${folder.name}`;
    }
    return folder.name;
  };

  // Generate target directory list
  const destinationOptions = useMemo(() => {
    const options: Array<{
      id: string | undefined;
      label: string;
      isRoot?: boolean;
    }> = [];

    // 1. Root level option
    options.push({
      id: undefined,
      label: "设为一级顶层根目录",
      isRoot: true
    });

    // 2. Add valid folders
    folders.forEach(f => {
      if (isTargetValid(f.id)) {
        options.push({
          id: f.id,
          label: getFolderPath(f)
        });
      }
    });

    // Apply search filter
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      return options.filter(opt => opt.label.toLowerCase().includes(query));
    }

    return options;
  }, [folders, searchValue, folderId, getDescendantIds]);

  if (!isOpen || !currentFolder) return null;

  const handleToggleCase = (caseId: string) => {
    setSelectedCaseIds(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const handleSelectAllCases = () => {
    setSelectedCaseIds(directCases.map(tc => tc.id));
  };

  const handleClearCaseSelection = () => {
    setSelectedCaseIds([]);
  };

  const handleSave = () => {
    if (selectedTargetId === null) return;
    onConfirmMove(folderId, selectedTargetId ?? undefined, moveType, selectedCaseIds);
    onClose();
  };

  const allSelected = directCases.length > 0 && selectedCaseIds.length === directCases.length;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-black text-slate-800">移动目录与用例管理</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              准备移动目录 <span className="text-indigo-600 font-bold bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100">「{currentFolder.name}」</span>，请在下方自由勾选该目录下的用例，并指定目标存放位置：
            </p>
          </div>
          <button
            id="move-folder-close-btn"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Dynamic Split Layout Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-150">

          {/* Left Panel - Case Selection list (Source) */}
          <div className="flex flex-col p-5 overflow-hidden">
            <div className="mb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-indigo-650"></div>
                <span className="text-xs font-black text-slate-700">1. 自定义要移动的测试用例</span>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md border border-indigo-100 select-none animate-pulse">
                已选中 {selectedCaseIds.length} / {directCases.length} 个用例
              </span>
            </div>

            {/* Selection Toolbar Controls */}
            {directCases.length > 0 && (
              <div className="flex items-center justify-between gap-2 mb-3 bg-slate-50/70 rounded-xl p-2.5 border border-slate-150/80 shrink-0">
                <span className="text-[10.5px] text-slate-450 font-bold">快捷勾选：</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCases}
                    className="text-[10px] font-black text-indigo-650 hover:text-indigo-700 bg-white border border-slate-150 rounded-md px-2.5 py-1 hover:bg-indigo-50/25 cursor-pointer select-none transition-colors"
                  >
                    全选所有
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCaseSelection}
                    className="text-[10px] font-black text-slate-500 hover:text-slate-600 bg-white border border-slate-150 rounded-md px-2.5 py-1 hover:bg-slate-50 cursor-pointer select-none transition-colors"
                  >
                    清空选择
                  </button>
                </div>
              </div>
            )}

            {/* Case list container */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 bg-slate-50/30 rounded-xl p-2 border border-slate-100/50 min-h-[220px]">
              {directCases.length === 0 ? (
                <div className="text-center py-16 text-slate-450 italic text-xs">
                  当前目录下无直接隶属的用例文件
                </div>
              ) : (
                directCases.map((tc) => {
                  const isChecked = selectedCaseIds.includes(tc.id);
                  return (
                    <button
                      key={`case-item-${tc.id}`}
                      type="button"
                      onClick={() => handleToggleCase(tc.id)}
                      className={`w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between border transition-all text-xs cursor-pointer outline-none focus:outline-none focus:ring-0 ${
                        isChecked
                          ? "bg-indigo-50/40 border-indigo-200 text-indigo-800 shadow-3xs"
                          : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-650"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="shrink-0 text-slate-450 hover:text-indigo-600 transition-colors">
                          {isChecked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-300" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                          {formatCaseId(tc.id)}
                        </span>

                        {/* Priority Badge */}
                        <span className={`text-[9px] font-bold px-1 rounded shrink-0 ${
                          tc.grade === TestCaseGrade.P0
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : tc.grade === TestCaseGrade.P1
                            ? "bg-orange-50 text-orange-600 border border-orange-100"
                            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        }`}>
                          {tc.grade}
                        </span>

                        <span className="truncate font-semibold text-slate-750">
                          {tc.name}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Destination Selection (Target) */}
          <div className="flex flex-col p-5 overflow-hidden">
            <div className="mb-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-black text-slate-700">2. 选择目标存放目录</span>
              </div>
              <span className="text-[10px] text-slate-405 font-bold select-none">
                必选
              </span>
            </div>

            {/* Target Folder Search */}
            <div className="relative mb-3 shrink-0">
              <input
                id="move-folder-search-input"
                type="text"
                placeholder="搜索目标存放目录..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-medium placeholder:text-slate-400"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Target Folder List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 bg-slate-50/30 rounded-xl p-2 border border-slate-100/50 min-h-[220px]">
              {destinationOptions.length === 0 ? (
                <div className="text-center py-16 text-slate-400 italic text-xs">没有找到相符的目标目录</div>
              ) : (
                destinationOptions.map((opt, idx) => {
                  const isSelected = selectedTargetId === opt.id;
                  return (
                    <button
                      key={`dest-${opt.id || "root"}-${idx}`}
                      type="button"
                      onClick={() => setSelectedTargetId(opt.id)}
                      className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between border transition-all text-xs cursor-pointer outline-none focus:outline-none focus:ring-0 ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-200 text-emerald-850 font-bold shadow-xs"
                          : "bg-white border-slate-100/60 hover:border-slate-200 hover:bg-slate-50 text-slate-650"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Folder className={`h-4.5 w-4.5 shrink-0 ${opt.isRoot ? "text-amber-500" : isSelected ? "text-emerald-600" : "text-slate-450"}`} />
                        <span className="truncate font-semibold text-slate-705">
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md font-black shrink-0 animate-fade-in">
                          <Check className="h-3 w-3" />
                          已选
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Action Mode Controls Section */}
        <div className="px-6 py-3.5 bg-indigo-50/20 border-t border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 select-none shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-black text-slate-700">移动策略方式：</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-bold select-none">
                <input
                  type="radio"
                  name="folderMoveType"
                  checked={moveType === "both"}
                  onChange={() => setMoveType("both")}
                  className="accent-indigo-600 cursor-pointer h-4 w-4"
                />
                整包移动整个目录 (包含子目录和选中的用例)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-bold select-none">
                <input
                  type="radio"
                  name="folderMoveType"
                  checked={moveType === "cases_only"}
                  onChange={() => setMoveType("cases_only")}
                  className="accent-indigo-600 cursor-pointer h-4 w-4"
                />
                仅移出选中的用例至目标目录 (原目录不移动)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-semibold max-w-sm">
            <HelpCircle className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>提示：整包移动时，未勾选的用例将被移出至旧父目录。</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            id="move-folder-cancel-btn"
            onClick={onClose}
            className="px-5 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-xs transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            id="move-folder-confirm-btn"
            onClick={handleSave}
            disabled={selectedTargetId === null || (moveType === "cases_only" && selectedCaseIds.length === 0)}
            className={`px-6 py-2.5 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTargetId !== null && (moveType !== "cases_only" || selectedCaseIds.length > 0)
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Check className="h-4 w-4" />
            确定移动
          </button>
        </div>
      </div>
    </div>
  );
}
