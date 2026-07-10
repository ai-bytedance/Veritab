/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  FileText,
  Trash2,
  Plus,
  GitBranch,
  Pencil,
  MoreVertical,
  Layers
} from "lucide-react";
import { TestCase, Folder as FolderType, TestCaseStatus, Issue } from "../types";

interface TestCaseTreeProps {
  folders: FolderType[];
  testCases: TestCase[];
  activeCaseId: string | null;
  activeFolderId?: string | null;
  activeRequirementId?: string | null;
  expandedNodes: Record<string, boolean>;
  onToggleNode: (id: string) => void;
  onSelectCase: (id: string) => void;
  onSelectFolder?: (folderId: string | null) => void;
  onSelectReqFolder?: (reqId: string | null) => void;
  onDeleteCase: (id: string) => void;
  onAddCaseToFolder: (folderId: string | undefined) => void;
  onAddFolder: (parentId?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onMoveCase?: (caseId: string, folderId: string | undefined, linkedRequirementId?: string) => void;
  onMoveFolder?: (folderId: string, targetParentId: string | undefined) => void;
  onOpenFolderMovePicker?: (folderId: string) => void;
  requirements?: Issue[];
  onAddCaseToReq?: (reqId: string) => void;

  // 批量与快捷操作配置
  onOpenMovePicker?: (caseId: string) => void;
}

const TestCaseTree: React.FC<TestCaseTreeProps> = ({
  folders,
  testCases,
  activeCaseId,
  activeFolderId = null,
  activeRequirementId = null,
  expandedNodes,
  onToggleNode,
  onSelectCase,
  onSelectFolder,
  onSelectReqFolder,
  onDeleteCase,
  onAddCaseToFolder,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveCase,
  onMoveFolder,
  onOpenFolderMovePicker,
  requirements = [],
  onAddCaseToReq,
  onOpenMovePicker,
}) => {
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderValue, setEditFolderValue] = useState<string>("");
  const [openMenuFolderId, setOpenMenuFolderId] = useState<string | null>(null);



  const handleStartRenameFolder = (folderId: string, name: string) => {
    setEditingFolderId(folderId);
    setEditFolderValue(name);
  };

  const handleSaveRenameFolder = (folderId: string) => {
    if (editingFolderId !== folderId) return;
    if (editFolderValue.trim() && onRenameFolder) {
      onRenameFolder(folderId, editFolderValue.trim());
    }
    setEditingFolderId(null);
  };

  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    e.dataTransfer.setData("caseId", caseId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | undefined) => {
    e.preventDefault();
    setDragOverFolder(folderId || "root");
  };

  const handleDrop = (e: React.DragEvent, folderId: string | undefined) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData("caseId");
    const draggedFolderId = e.dataTransfer.getData("folderId");
    setDragOverFolder(null);
    if (caseId) {
      const tc = testCases.find(t => t.id === caseId);
      if (tc) {
        onSelectCase(caseId);
        onMoveCase?.(caseId, folderId, folderId === undefined ? "" : undefined);
      }
    } else if (draggedFolderId) {
      if (draggedFolderId === folderId) {
        alert("目录不能移动到自身内部！");
        return;
      }
      onMoveFolder?.(draggedFolderId, folderId);
    }
  };

  const renderFolderContent = (folderId: string | undefined, level: number = 0) => {
    const currentFolders = folders.filter(f => f.parentId === folderId);
    const currentCases = testCases.filter(tc => tc.folderId === folderId);

    return (
      <div className="space-y-1">
        {/* Root Level Special: 1. 未规划 Folder */}
        {folderId === undefined && (
          <div className="mb-1.5" id="unplanned-view-root">
             <div
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors duration-150 ${
                  dragOverFolder === "unplanned"
                    ? "bg-amber-50 border-amber-200 ring-2 ring-amber-200"
                    : activeFolderId === "unplanned"
                    ? "bg-amber-50/80 border-amber-200 text-amber-900 shadow-xs font-bold"
                    : "border-transparent bg-slate-5/40 hover:bg-slate-50 text-slate-750"
                }`}
                style={{ paddingLeft: "8px" }}
                onClick={() => onSelectFolder?.("unplanned")}
                onDragOver={(e) => handleDragOver(e, "unplanned")}
                onDrop={(e) => {
                  e.preventDefault();
                  const caseId = e.dataTransfer.getData("caseId");
                  setDragOverFolder(null);
                  if (caseId) {
                    onMoveCase?.(caseId, undefined, "");
                  }
                }}
             >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-5 shrink-0" />
                  <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-black text-slate-700">未规划</span>
                  <span className="text-[9px] font-bold bg-slate-200/50 text-slate-500 px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs shrink-0">
                    {testCases.filter(t => !t.folderId && !t.linkedRequirementId).length}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCaseToFolder("unplanned");
                    }}
                    className="p-1 hover:bg-white rounded hover:shadow-sm border border-transparent hover:border-slate-100 text-amber-600 transition-all"
                    title="新建未规划用例"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Root Level Special: 2. 按需求 Folder */}
        {folderId === undefined && (
          <div className="mb-1.5" id="requirement-view-root">
             <div
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors duration-150 ${
                  dragOverFolder === "requirement-view"
                    ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-200"
                    : activeFolderId === "req-root" || expandedNodes["requirement-view-node"]
                    ? "bg-indigo-50/40 border-transparent text-indigo-900 font-bold"
                    : "border-transparent bg-slate-5/40 hover:bg-slate-50 text-slate-700"
                }`}
                style={{ paddingLeft: "8px" }}
                onClick={() => {
                  onSelectFolder?.("req-root");
                  onToggleNode("requirement-view-node");
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverFolder("requirement-view"); }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const caseId = e.dataTransfer.getData("caseId");
                  setDragOverFolder(null);
                  if (caseId) {
                    onMoveCase?.(caseId, undefined, undefined);
                  }
                }}
             >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    onClick={(e) => { e.stopPropagation(); onToggleNode("requirement-view-node"); }}
                    className="p-1 hover:bg-slate-200/65 rounded transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                  >
                    {expandedNodes["requirement-view-node"] ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </span>
                  <Folder className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-black text-slate-700">按需求</span>
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs shrink-0">
                    {testCases.filter(t => !t.folderId && t.linkedRequirementId).length}
                  </span>
                </div>
             </div>
             {expandedNodes["requirement-view-node"] && (
                <div className="space-y-2 mt-1 pl-2">
                   {/* Category 1: Requirement Folders */}
                   {requirements.map(req => {
                     const reqFolderKey = `req-folder-${req.id}`;
                     const reqCases = testCases.filter(tc => !tc.folderId && tc.linkedRequirementId === req.id);
                     const isReqDragOver = dragOverFolder === reqFolderKey;
                     const isReqActive = activeRequirementId === req.id;

                     return (
                       <div key={req.id} className="ml-2 pl-2 border-l border-slate-100">
                         <div
                           className={`group flex items-center justify-between p-1.5 rounded-lg cursor-pointer border transition-colors duration-150 ${
                             isReqDragOver
                               ? "bg-indigo-50 ring-2 ring-indigo-250"
                               : isReqActive
                               ? "bg-indigo-50/70 border-indigo-100 font-bold text-indigo-700 shadow-xs"
                               : "border-transparent hover:bg-slate-50 text-slate-700"
                           }`}
                           onClick={() => onSelectReqFolder?.(req.id)}
                           onDragOver={(e) => { e.preventDefault(); setDragOverFolder(reqFolderKey); }}
                           onDragLeave={() => setDragOverFolder(null)}
                           onDrop={(e) => {
                             e.preventDefault();
                             const caseId = e.dataTransfer.getData("caseId");
                             setDragOverFolder(null);
                             if (caseId) {
                               onMoveCase?.(caseId, undefined, req.id);
                             }
                           }}
                         >
                           <div className="flex items-center gap-1.5 min-w-0 flex-1">
                             <div className="w-5 shrink-0" />
                             <GitBranch className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                             <span className="text-[11px] font-bold text-slate-700 truncate" title={req.title}>
                               {req.title}
                             </span>
                             <span className="text-[9px] font-bold bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full min-w-[15px] text-center shrink-0">
                               {reqCases.length}
                             </span>
                           </div>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onAddCaseToReq?.(req.id);
                               }}
                               className="p-1 hover:bg-white rounded hover:shadow-sm border border-transparent hover:border-slate-100 text-indigo-600 transition-all"
                               title="新建需求关联用例"
                             >
                               <Plus className="h-3 w-3" />
                             </button>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                </div>
             )}
          </div>
        )}

        {/* Regular Folders */}
        {currentFolders.map(folder => {
          const isFolderDragOver = dragOverFolder === folder.id;
          const isExpanded = !!expandedNodes[folder.id];
          const isFolderActive = activeFolderId === folder.id;
          const hasSubfolders = folders.some(f => f.parentId === folder.id);
          const hasCases = testCases.some(tc => tc.folderId === folder.id);
          const hasChildren = hasSubfolders;

          return (
            <div key={folder.id} className="space-y-1">
              <div
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData("folderId", folder.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors duration-150 ${
                  isFolderDragOver
                    ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-200"
                    : isFolderActive
                    ? "bg-indigo-50 border-indigo-150 text-indigo-700 shadow-xs font-bold"
                    : isExpanded
                    ? "bg-slate-5/40 border-transparent text-slate-700"
                    : "border-transparent hover:bg-slate-50 text-slate-700"
                }`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onSelectFolder?.(folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => handleDrop(e, folder.id)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {hasChildren ? (
                    <span
                      onClick={(e) => { e.stopPropagation(); onToggleNode(folder.id); }}
                      className="p-1 hover:bg-slate-200/65 rounded transition-all cursor-pointer inline-flex items-center justify-center shrink-0 animate-fade-in"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </span>
                  ) : (
                    <div className="w-6 shrink-0" />
                  )}
                  <Folder className={`h-4 w-4 shrink-0 ${isFolderActive ? "text-indigo-600" : isExpanded ? "text-indigo-500" : "text-slate-400 group-hover:text-indigo-300 transition-colors"}`} />
                  {editingFolderId === folder.id ? (
                    <input
                      type="text"
                      className="text-[11px] font-black bg-white border border-indigo-400 rounded px-1.5 py-0.5 outline-none max-w-[120px]"
                      value={editFolderValue}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditFolderValue(""); // Clear value to cancel saving during blur
                          setEditingFolderId(null);
                        }
                      }}
                      onBlur={() => handleSaveRenameFolder(folder.id)}
                      onChange={(e) => setEditFolderValue(e.target.value)}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { e.stopPropagation(); handleStartRenameFolder(folder.id, folder.name); }}
                      className={`text-[11px] font-black truncate transition-colors ${isFolderActive ? "text-indigo-850" : isExpanded ? "text-indigo-700" : "text-slate-700"}`}
                      title="双击可以重命名目录"
                    >
                      {folder.name}
                    </span>
                  )}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center transition-all ${isExpanded ? "bg-indigo-100 text-indigo-600 shadow-sm" : "bg-indigo-50 text-indigo-400"}`}>
                    {(() => {
                      const getRecursiveCount = (fid: string): number => {
                        const direct = testCases.filter(t => t.folderId === fid).length;
                        const subFolders = folders.filter(f => f.parentId === fid);
                        if (subFolders.length === 0) return direct;
                        return direct + subFolders.reduce((acc, f) => acc + getRecursiveCount(f.id), 0);
                      };
                      return getRecursiveCount(folder.id);
                    })()}
                  </span>
                </div>
                <div className="relative flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuFolderId(openMenuFolderId === folder.id ? null : folder.id);
                    }}
                    className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-indigo-650 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95 outline-none focus:outline-none focus:ring-0 cursor-pointer shrink-0"
                    title="更多操作"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>

                  {openMenuFolderId === folder.id && (
                    <>
                      {/* Intercept Backdrop */}
                      <div
                        className="fixed inset-0 z-[100] bg-transparent cursor-default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuFolderId(null);
                        }}
                      />
                      {/* Menu Body */}
                      <div
                        className="absolute right-0 top-6 w-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-[101] text-left text-[11px] font-bold text-slate-650 animate-fade-in divide-y divide-slate-100 outline-none focus:outline-none focus:ring-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuFolderId(null);
                              handleStartRenameFolder(folder.id, folder.name);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/45 hover:text-indigo-750 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>修改目录名称</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuFolderId(null);
                              onAddFolder(folder.id);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/45 hover:text-indigo-750 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FolderPlus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>新建子目录</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuFolderId(null);
                              onAddCaseToFolder(folder.id);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/45 hover:text-indigo-750 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>新建测试用例</span>
                          </button>
                        </div>

                        {onOpenFolderMovePicker && (
                          <div className="py-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFolderId(null);
                                onOpenFolderMovePicker(folder.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/45 hover:text-indigo-750 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              <span>移动目录及用例</span>
                            </button>
                          </div>
                        )}

                        <div className="py-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuFolderId(null);
                              onDeleteFolder(folder.id);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-rose-50 hover:text-rose-700 text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            <span>删除目录</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

               {/* Child Contents */}
               {isExpanded && (
                 <div className="space-y-1">
                   {/* Recursive Folders */}
                   {renderFolderContent(folder.id, level + 1)}
                 </div>
               )}
            </div>
          );
        })}

        {/* Custom folder's topCases list if level=0 but that is covered by recursively drawing folder isExpanded */}
        {level === 0 && folderId === undefined && (
           <div className="space-y-1" style={{ paddingLeft: "8px" }}>
              {/* We don't render currentCases here since level 0 are root-folders and special un-planneds */}
           </div>
        )}
      </div>
    );
  };

  const renderFolder = (folderId: string | undefined, level: number = 0) => {
    if (folderId === undefined) {
      const isAllCasesExpanded = expandedNodes["all-cases-root-node"] !== false;
      const isAllActive = (activeFolderId === null || activeFolderId === "all") && activeRequirementId === null;

      return (
        <div className="space-y-1 font-sans">
          {/* Root Level Special: 0. 全部用例 Folder */}
          <div className="mb-1" id="all-cases-view-root">
            <div
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors duration-150 ${
                dragOverFolder === "all-cases-root"
                  ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-200"
                  : isAllActive
                  ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-xs font-black"
                  : "border-transparent bg-slate-5/40 hover:bg-slate-50 text-slate-800"
              }`}
              style={{ paddingLeft: "4px" }}
              onClick={() => onSelectFolder?.(null)}
              onDragOver={(e) => handleDragOver(e, "all-cases-root")}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolder(null);
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  onClick={(e) => { e.stopPropagation(); onToggleNode("all-cases-root-node"); }}
                  className="p-1 hover:bg-slate-200/65 rounded transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                >
                  {isAllCasesExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                </span>
                <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-[12px] font-black tracking-tight">全部用例</span>
                <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-2xs shrink-0">
                  {testCases.length}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFolder(undefined);
                  }}
                  className="p-1 hover:bg-white rounded hover:shadow-sm border border-transparent hover:border-slate-100 text-indigo-600 transition-all"
                  title="新建一级目录"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddCaseToFolder(undefined);
                  }}
                  className="p-1 hover:bg-white rounded hover:shadow-sm border border-transparent hover:border-slate-100 text-indigo-600 transition-all"
                  title="新建根目录测试用例"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Root Children: 未规划, 按需求, and Root Custom Folders */}
          {isAllCasesExpanded && (
            <div className="space-y-1.5 mt-1 pl-2 border-l border-slate-200/80 ml-2.5">
               {renderFolderContent(undefined, 0)}
            </div>
          )}
        </div>
      );
    }
    return renderFolderContent(folderId, level);
  };

  return (
    <div className="space-y-1 font-sans">
      {renderFolder(undefined)}
    </div>
  );
};

export default TestCaseTree;
