/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Activity,
  ClipboardList,
  Maximize2,
  Minimize2,
  Network,
  CheckCircle2
} from "lucide-react";
import { TestCase, TestCaseStatus, TestCaseGrade, Issue, Folder as FolderType, ProjectTab } from "../types";
import { checkPermission } from "../lib/permission";
import MindmapCaseCard from "./MindmapCaseCard";
import MindmapController from "./MindmapController";
import MindmapActionBar from "./MindmapActionBar";
import ConfirmDialog from "./ConfirmDialog";
import { generateCaseId } from "../lib/idUtils";

interface TestCaseXMindMindmapProps {
  projectId: string;
  activeCase?: TestCase;
  requirements: Issue[];
  folders: FolderType[];
  onUpdateTestCase: (tc: TestCase) => void;
  activeFolderId?: string | null;
  activeRequirementId?: string | null;
  testCases?: TestCase[];
  activeUsers?: any[];
  onSelectTestCase?: (id: string) => void;
  onSelectFolder?: (id: string | null) => void;
  onSelectReqFolder?: (id: string | null) => void;
  onAddTestCase?: (tc: TestCase) => void;
  onDeleteTestCase?: (id: string) => void;
  onUpdateFolders?: (folders: FolderType[]) => void;
  onTriggerWebhook?: (provider: string, payload: any) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  userGroups?: any[];
}

export default function TestCaseXMindMindmap({
  projectId,
  activeCase,
  requirements,
  folders,
  onUpdateTestCase,
  activeFolderId = null,
  activeRequirementId = null,
  testCases = [],
  activeUsers = [],
  onSelectTestCase,
  onSelectFolder,
  onSelectReqFolder,
  onAddTestCase,
  onDeleteTestCase,
  onUpdateFolders,
  onTriggerWebhook,
  onFullscreenChange,
  userGroups = []
}: TestCaseXMindMindmapProps) {
  const currentUser = activeUsers && activeUsers[0] ? activeUsers[0] : null;
  const checkActionPermission = (action: string) => {
    return checkPermission(currentUser, userGroups, ProjectTab.TESTCASE, action);
  };
  const [projectName, setProjectName] = useState<string>("默认项目空间");
  const [deleteCaseToConfirm, setDeleteCaseToConfirm] = useState<TestCase | null>(null);
  const [deleteFolderToConfirm, setDeleteFolderToConfirm] = useState<FolderType | null>(null);

  // States for folder editing and interactive choice dialog
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>("");
  const [showFolderChoiceModal, setShowFolderChoiceModal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("veritab_projects");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const found = parsed.find((p: any) => p.id === projectId);
          if (found && found.name) {
            setProjectName(found.name);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load project name", e);
    }
  }, [projectId]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);

  useEffect(() => {
    if (onFullscreenChange) {
      onFullscreenChange(isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);
  const [scale, setScale] = useState<number>(100);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem("veritab_xmind_compact") === "true";
    } catch {
      return false;
    }
  });

  const handleToggleCompact = () => {
    setIsCompact(prev => {
      const next = !prev;
      try {
        localStorage.setItem("veritab_xmind_compact", String(next));
      } catch (e) {}
      return next;
    });
  };

  // Action helper: Add a new sibling test case under the currently active case's folder or requirement
  const handleAddNewSiblingCase = () => {
    if (!checkActionPermission("mindmap")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
      return;
    }
    if (!activeCase) return;
    const newCase: TestCase = {
      id: generateCaseId(),
      projectId: projectId,
      name: "新建未命名用例",
      grade: TestCaseGrade.P1,
      status: TestCaseStatus.UNTESTED,
      precondition: activeCase.precondition || "",
      steps: "步骤 1: 请点击编辑此步骤",
      expectedResult: "预期运行完全符合逻辑",
      folderId: activeCase.folderId,
      linkedRequirementId: activeCase.linkedRequirementId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      historyLogs: []
    };
    if (onAddTestCase) {
      onAddTestCase(newCase);
      triggerToast("已通过 [Enter/C] 快捷键成功新增同级测试用例！", "success");
    }
  };

  // Action helper: Add a new directory (sibling or child folder)
  const handleAddNewFolder = (parentId?: string | null) => {
    if (!checkActionPermission("mindmap")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
      return;
    }
    const newFolder: FolderType = {
      id: `folder-${Date.now()}`,
      projectId: projectId,
      name: parentId ? "新建子目录" : "新建同级目录",
      parentId: parentId || undefined,
      createdAt: new Date().toISOString(),
    };
    if (onUpdateFolders) {
      onUpdateFolders([...folders, newFolder]);
      if (onSelectFolder) {
        if (parentId) {
          setTimeout(() => onSelectFolder(parentId), 120);
        } else {
          setTimeout(() => onSelectFolder(newFolder.id), 120);
        }
      }
      triggerToast(parentId ? "已通过 [Shift+M] 快捷键成功新增子目录！" : "已通过 [M] 快捷键成功新增同级目录！", "success");
    }
  };

  // Action helper: Start editing folder name
  const handleStartEditFolder = (id: string, currentName: string) => {
    if (!checkActionPermission("mindmap")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
      return;
    }
    setEditingFolderId(id);
    setEditingFolderName(currentName);
  };

  // Action helper: Save folder name
  const handleSaveFolder = (id: string) => {
    if (!checkActionPermission("mindmap")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
      return;
    }
    setEditingFolderId(null);
    const trimmedName = editingFolderName.trim();
    if (trimmedName && onUpdateFolders) {
      const updated = folders.map(f => f.id === id ? { ...f, name: trimmedName } : f);
      onUpdateFolders(updated);
      triggerToast("已保存目录重命名！", "success");
    }
  };

  // Action helper: Add a new test case directly under a folder
  const handleAddTestCaseUnderFolder = (fId: string) => {
    if (!checkActionPermission("mindmap")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
      return;
    }
    const newCase: TestCase = {
      id: generateCaseId(),
      projectId: projectId,
      name: "新建未命名用例",
      grade: TestCaseGrade.P1,
      status: TestCaseStatus.UNTESTED,
      precondition: "",
      steps: "步骤 1: 请点击编辑此步骤",
      expectedResult: "预期运行完全符合逻辑",
      folderId: fId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      historyLogs: []
    };
    if (onAddTestCase) {
      onAddTestCase(newCase);
      triggerToast("已在选定目录下成功新增测试用例！", "success");
    }
  };

  // Action helper: Add a new test case directly under a requirement
  const handleAddTestCaseUnderRequirement = (rId: string) => {
    if (!checkActionPermission("mindmap")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
      return;
    }
    const newCase: TestCase = {
      id: generateCaseId(),
      projectId: projectId,
      name: "新建未命名用例",
      grade: TestCaseGrade.P1,
      status: TestCaseStatus.UNTESTED,
      precondition: "",
      steps: "步骤 1: 请点击编辑此步骤",
      expectedResult: "预期运行完全符合逻辑",
      linkedRequirementId: rId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      historyLogs: []
    };
    if (onAddTestCase) {
      onAddTestCase(newCase);
      triggerToast("已在选定需求下成功新增测试用例！", "success");
    }
  };

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // 0. Active Choice Modal keyboard selection handling
      if (showFolderChoiceModal) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowFolderChoiceModal(null);
          return;
        }
        if (e.key === "1" || e.key === "m" || e.key === "M") {
          e.preventDefault();
          handleAddNewFolder(showFolderChoiceModal);
          setShowFolderChoiceModal(null);
          return;
        }
        if (e.key === "2" || e.key === "Enter" || e.key === "c" || e.key === "C") {
          e.preventDefault();
          handleAddTestCaseUnderFolder(showFolderChoiceModal);
          setShowFolderChoiceModal(null);
          return;
        }
        return; // Suppress other shortcuts when choice dialog is active
      }

      // Ignore shortcut handling if user is focusing an input or textarea
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.hasAttribute("contenteditable")) {
        return;
      }

      // Check mindmap action permission for mutation keys
      if (["Enter", "c", "C", "m", "M", "Tab", "Delete", "Backspace"].includes(e.key)) {
        if (!checkActionPermission("mindmap")) {
          e.preventDefault();
          triggerToast("⚠️ 您所属的工作群组无权进行“脑图视图关联与结构修改”操作！", "warning");
          return;
        }
      }

      // 1. Sibling/Subnode Creation (Enter, C, Tab, M)
      if (e.key === "Enter" || e.key === "c" || e.key === "C") {
        if (activeCase) {
          e.preventDefault();
          handleAddNewSiblingCase();
        } else if (activeFolderId) {
          e.preventDefault();
          handleAddTestCaseUnderFolder(activeFolderId);
        } else if (activeRequirementId) {
          e.preventDefault();
          handleAddTestCaseUnderRequirement(activeRequirementId);
        }
      }

      // 2. Folder or sub-module creation
      if (e.key === "m" || e.key === "M") {
        if (activeFolderId) {
          e.preventDefault();
          if (e.shiftKey) {
            // "增加目录" child under custom folder: triggers option dialog
            setShowFolderChoiceModal(activeFolderId);
          } else {
            // Sibling folder
            const activeFolderObj = folders.find(f => f.id === activeFolderId);
            handleAddNewFolder(activeFolderObj?.parentId || null);
          }
        } else if (activeRequirementId) {
          // "当选择基于需求节点 增加目录应该是增加新的用例节点"
          e.preventDefault();
          handleAddTestCaseUnderRequirement(activeRequirementId);
        } else if (activeCase) {
          e.preventDefault();
          if (activeCase.folderId) {
            const parentId = folders.find(f => f.id === activeCase.folderId)?.parentId || null;
            handleAddNewFolder(parentId);
          }
        }
      }

      // 3. Tab (Child creation or Step creation)
      if (e.key === "Tab") {
        if (activeCase) {
          e.preventDefault();
          handleAddStep(activeCase.id);
        } else if (activeFolderId) {
          e.preventDefault();
          // Adding subnode on a folder shows selection dialog
          setShowFolderChoiceModal(activeFolderId);
        } else if (activeRequirementId) {
          // Under requirement, can only add TestCase children
          e.preventDefault();
          handleAddTestCaseUnderRequirement(activeRequirementId);
        }
      }

      // 4. Space shortcut removed in compliance with user request to remove edit selected title shortcut

      // 5. / (展开/收起)
      if (e.key === "/") {
        if (activeCase) {
          e.preventDefault();
          toggleCaseExpansion(activeCase.id);
        } else if (activeFolderId) {
          e.preventDefault();
          toggleFolderCollapse(activeFolderId);
        } else if (activeRequirementId) {
          e.preventDefault();
          setUnplannedRootCollapsed(prev => !prev);
        }
      }

      // 6. Delete / Backspace (Delete selected item)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (activeCase) {
          e.preventDefault();
          setDeleteCaseToConfirm(activeCase);
        } else if (activeFolderId) {
          e.preventDefault();
          const folderObj = folders.find(f => f.id === activeFolderId);
          if (folderObj) {
            setDeleteFolderToConfirm(folderObj);
          }
        }
      }

      // 7. Arrow Up and Down Navigation
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const selector = '[id^="mindmap-case-"], [id^="mindmap-folder-"], [id^="mindmap-requirement-"]';
        const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
        if (elements.length === 0) return;

        let activeIndex = -1;
        if (activeCase?.id) {
          activeIndex = elements.findIndex(el => el.id === `mindmap-case-${activeCase.id}`);
        } else if (activeFolderId) {
          activeIndex = elements.findIndex(el => el.id === `mindmap-folder-${activeFolderId}`);
        } else if (activeRequirementId) {
          activeIndex = elements.findIndex(el => el.id === `mindmap-requirement-${activeRequirementId}`);
        }

        let targetIndex = activeIndex;
        if (e.key === "ArrowUp") {
          targetIndex = activeIndex <= 0 ? elements.length - 1 : activeIndex - 1;
        } else {
          targetIndex = activeIndex === -1 || activeIndex === elements.length - 1 ? 0 : activeIndex + 1;
        }

        const targetEl = elements[targetIndex];
        if (targetEl) {
          const isCaseNode = targetEl.id.startsWith("mindmap-case-");
          const isFolderNode = targetEl.id.startsWith("mindmap-folder-");
          const isReqNode = targetEl.id.startsWith("mindmap-requirement-");
          const nodeId = targetEl.id.replace("mindmap-case-", "").replace("mindmap-folder-", "").replace("mindmap-requirement-", "");

          if (isCaseNode) {
            if (onSelectTestCase) onSelectTestCase(nodeId);
          } else if (isFolderNode) {
            if (onSelectFolder) onSelectFolder(nodeId);
          } else if (isReqNode) {
            if (onSelectReqFolder) onSelectReqFolder(nodeId);
          }
          targetEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
      }

      // 8. Escape Fullscreen
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [activeCase, activeFolderId, activeRequirementId, folders, isFullscreen, projectId, showFolderChoiceModal]);

  // Unified real-time execution states map: caseId -> { stepResults, stepNotes }
  const [executionStates, setExecutionStates] = useState<Record<string, {
    stepResults: Record<number, "pass" | "fail" | "blocked" | "untested">;
    stepNotes: Record<number, string>;
  }>>({});

  // 1. Fold/Unfold state controllers
  const [unplannedRootCollapsed, setUnplannedRootCollapsed] = useState<boolean>(false);
  const [unplannedVirtualCollapsed, setUnplannedVirtualCollapsed] = useState<boolean>(false);
  const [reqRootVirtualCollapsed, setReqRootVirtualCollapsed] = useState<boolean>(false);
  const [collapsedRequirementIds, setCollapsedRequirementIds] = useState<Set<string>>(new Set<string>());
  const [allCasesRootCollapsed, setAllCasesRootCollapsed] = useState<boolean>(false);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set<string>());

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Find effective Folder or Requirement ID to group by
  const effectiveFolderId = useMemo(() => {
    if (activeFolderId === "unplanned" || activeFolderId === "req-root") {
      return null;
    }
    return activeFolderId || (activeCase ? activeCase.folderId : null);
  }, [activeFolderId, activeCase]);

  const effectiveRequirementId = useMemo(() => {
    return activeRequirementId || (activeCase && !activeCase.folderId ? activeCase.linkedRequirementId : null);
  }, [activeRequirementId, activeCase]);

  const isAllCasesRoot = useMemo(() => {
    return !activeFolderId && !effectiveRequirementId && !activeCase;
  }, [activeFolderId, effectiveRequirementId, activeCase]);

  // Recursively gather all descendant folder IDs under the effective folder
  const targetFolderIds = useMemo(() => {
    if (!effectiveFolderId) return new Set<string>();
    const ids = new Set<string>([effectiveFolderId]);
    const queue = [effectiveFolderId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const subFolders = folders.filter(f => f.parentId === currentId);
      subFolders.forEach(sf => {
        if (!ids.has(sf.id)) {
          ids.add(sf.id);
          queue.push(sf.id);
        }
      });
    }
    return ids;
  }, [effectiveFolderId, folders]);

  // Resolve target cases that align with the selected scope or group under the active parent (inclusive of descendants)
  const targetCases = useMemo(() => {
    if (activeFolderId === "req-root") {
      return testCases.filter(tc => !tc.folderId && tc.linkedRequirementId);
    }
    if (activeFolderId === "unplanned") {
      return testCases.filter(tc => !tc.folderId && !tc.linkedRequirementId);
    }
    if (effectiveFolderId) {
      return testCases.filter(tc => tc.folderId && targetFolderIds.has(tc.folderId));
    }
    if (effectiveRequirementId) {
      return testCases.filter(tc => !tc.folderId && tc.linkedRequirementId === effectiveRequirementId);
    }
    if (activeCase) {
      // If it is a raw unplanned case (no folder and no requirement), let's render ALL raw unplanned cases
      if (!activeCase.folderId && !activeCase.linkedRequirementId) {
        return testCases.filter(tc => !tc.folderId && !tc.linkedRequirementId);
      }
      return [activeCase];
    }
    return testCases;
  }, [activeFolderId, effectiveFolderId, targetFolderIds, effectiveRequirementId, activeCase, testCases]);

  // Set of folders to include in our hierarchical tree view
  const allowedFolderIds = useMemo(() => {
    if (effectiveRequirementId || (activeCase && !activeCase.folderId)) {
      return new Set<string>();
    }

    if (!effectiveFolderId) {
      return new Set<string>(folders.map(f => f.id));
    }
    const allowed = new Set<string>();

    // 1. Add ancestors of effectiveFolderId
    let curr = folders.find(f => f.id === effectiveFolderId);
    while (curr) {
      allowed.add(curr.id);
      curr = curr.parentId ? folders.find(f => f.id === curr.parentId) : undefined;
    }

    // 2. Add descendants of effectiveFolderId
    const queue = [effectiveFolderId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const sub = folders.filter(f => f.parentId === currentId);
      sub.forEach(sf => {
        if (!allowed.has(sf.id)) {
          allowed.add(sf.id);
          queue.push(sf.id);
        }
      });
    }

    return allowed;
  }, [effectiveFolderId, effectiveRequirementId, activeCase, folders]);

  // Root folder(s) of the current tree
  const rootTreeFolders = useMemo(() => {
    const roots = folders.filter(f => allowedFolderIds.has(f.id) && (!f.parentId || !allowedFolderIds.has(f.parentId)));
    return roots;
  }, [folders, allowedFolderIds]);

  // Interactive breadcrumb trail for full-screen and standard views
  const mindmapBreadcrumbs = useMemo(() => {
    const list: { label: string; action?: () => void }[] = [];

    // Base/Root
    list.push({
      label: "全部用例",
      action: () => {
        if (onSelectFolder) onSelectFolder(null);
        if (onSelectReqFolder) onSelectReqFolder(null);
      }
    });

    if (activeFolderId === "unplanned") {
      list.push({
        label: "未规划",
        action: () => {
          if (onSelectFolder) onSelectFolder("unplanned");
        }
      });
    } else if (activeFolderId === "req-root") {
      list.push({
        label: "按需求",
        action: () => {
          if (onSelectFolder) onSelectFolder("req-root");
        }
      });
    } else if (effectiveFolderId) {
      const activeFolder = folders.find(f => f.id === effectiveFolderId);
      if (activeFolder) {
        const pathNodes: FolderType[] = [];
        let current: FolderType | undefined = activeFolder;
        while (current) {
          pathNodes.unshift(current);
          current = current.parentId ? folders.find(f => f.id === current.parentId) : undefined;
        }
        pathNodes.forEach((node) => {
          list.push({
            label: node.name,
            action: () => {
              if (onSelectFolder) onSelectFolder(node.id);
            }
          });
        });
      }
    } else if (effectiveRequirementId) {
      list.push({
        label: "按需求",
        action: () => {
          if (onSelectFolder) onSelectFolder("req-root");
        }
      });
      const activeReq = requirements.find(r => r.id === effectiveRequirementId);
      if (activeReq) {
        list.push({
          label: activeReq.title,
          action: () => {
            if (onSelectReqFolder) onSelectReqFolder(activeReq.id);
          }
        });
      }
    }

    if (activeCase) {
      list.push({
        label: activeCase.name
      });
    }

    return list;
  }, [activeFolderId, effectiveFolderId, folders, effectiveRequirementId, requirements, activeCase, onSelectFolder, onSelectReqFolder]);

  const isMultiMode = targetCases.length > 1;
  const targetCasesKey = targetCases.map(c => c.id).join(",");

  // Tracking expanded case node step cards
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(new Set());

  // Expand test cases by default for visual ease and productivity
  useEffect(() => {
    const next = new Set<string>();
    targetCases.forEach(tc => next.add(tc.id));
    setExpandedCaseIds(next);
  }, [targetCasesKey]);

  // Helper to ensure ancestors of a folder are expanded inside the mindmap
  const ensureAncestorsExpanded = (folderId: string) => {
    let currentId = folderId;
    const parentsToUncollapse: string[] = [];
    while (currentId) {
      const folderObj = folders.find(f => f.id === currentId);
      const parentId = folderObj?.parentId;
      if (parentId) {
        parentsToUncollapse.push(parentId);
        currentId = parentId;
      } else {
        break;
      }
    }
    if (parentsToUncollapse.length > 0) {
      setCollapsedFolderIds(prev => {
        let hasCollapsedParent = false;
        for (const p of parentsToUncollapse) {
          if (prev.has(p)) {
            hasCollapsedParent = true;
            break;
          }
        }
        if (!hasCollapsedParent) return prev;
        const next = new Set(prev);
        parentsToUncollapse.forEach(p => next.delete(p));
        return next;
      });
    }
  };

  // Center activeCase node inside mindmap container smoothly
  useEffect(() => {
    if (activeCase?.id) {
      if (activeCase.folderId) {
        ensureAncestorsExpanded(activeCase.folderId);
      }

      setExpandedCaseIds(prev => {
        if (!prev.has(activeCase.id)) {
          const next = new Set(prev);
          next.add(activeCase.id);
          return next;
        }
        return prev;
      });

      const timer = setTimeout(() => {
        const cardElement = document.getElementById(`mindmap-case-${activeCase.id}`);
        const mindmapContainer = document.getElementById("mindmap-container");
        if (cardElement && mindmapContainer) {
          cardElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
          });
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [activeCase?.id]);

  // Center activeFolderId node inside mindmap container smoothly
  useEffect(() => {
    if (activeFolderId) {
      ensureAncestorsExpanded(activeFolderId);

      const timer = setTimeout(() => {
        const cardElement = document.getElementById(`mindmap-folder-${activeFolderId}`);
        const mindmapContainer = document.getElementById("mindmap-container");
        if (cardElement && mindmapContainer) {
          cardElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
          });
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [activeFolderId]);

  // Center activeRequirementId node inside mindmap container smoothly
  useEffect(() => {
    if (activeRequirementId) {
      setUnplannedRootCollapsed(false);

      const timer = setTimeout(() => {
        const cardElement = document.getElementById(`mindmap-requirement-${activeRequirementId}`);
        const mindmapContainer = document.getElementById("mindmap-container");
        if (cardElement && mindmapContainer) {
          cardElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
          });
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [activeRequirementId]);

  // Sync execution states when scoped targetCases list shifts or test case data updates
  useEffect(() => {
    const nextStates = { ...executionStates };
    let changed = false;

    targetCases.forEach(tc => {
      const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      const current = nextStates[tc.id];

      let initResults: Record<number, "pass" | "fail" | "blocked" | "untested"> = {};
      let initNotes: Record<number, string> = {};

      if (tc.stepResults && Object.keys(tc.stepResults).length > 0) {
        initResults = { ...tc.stepResults };
        initNotes = tc.stepNotes ? { ...tc.stepNotes } : {};
        tcSteps.forEach((_, idx) => {
          if (!initResults[idx]) initResults[idx] = "untested";
        });
      } else {
        tcSteps.forEach((_, idx) => {
          initResults[idx] = "untested";
        });

        if (tc.status === TestCaseStatus.PASS) {
          tcSteps.forEach((_, idx) => {
            initResults[idx] = "pass";
          });
        }

        if (tc.actualResult) {
          tcSteps.forEach((_, idx) => {
            const failMatch = new RegExp(`步骤 #${idx + 1} 异常值: (.*)`);
            const foundFail = tc.actualResult?.match(failMatch);
            if (foundFail && foundFail[1]) {
              initNotes[idx] = foundFail[1].trim();
              initResults[idx] = "fail";
              return;
            }

            const blockMatch = new RegExp(`步骤 #${idx + 1} 阻断原因: (.*)`);
            const foundBlock = tc.actualResult?.match(blockMatch);
            if (foundBlock && foundBlock[1]) {
              initNotes[idx] = foundBlock[1].trim();
              initResults[idx] = "blocked";
            }
          });
        }
      }

      if (!current || JSON.stringify(current.stepResults) !== JSON.stringify(initResults) || JSON.stringify(current.stepNotes) !== JSON.stringify(initNotes)) {
        nextStates[tc.id] = {
          stepResults: initResults,
          stepNotes: initNotes
        };
        changed = true;
      }
    });

    if (changed) {
      setExecutionStates(nextStates);
    }
  }, [targetCases, targetCasesKey]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmCommit, setShowConfirmCommit] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["feishu", "system"]);
  const [notifyContent, setNotifyContent] = useState<string>("");

  const triggerToast = (msg: string, type: "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const resetView = () => {
    setUnplannedRootCollapsed(false);
    setCollapsedFolderIds(new Set());

    const container = document.getElementById("mindmap-container");
    if (container) {
      container.scrollLeft = 0;
      container.scrollTop = 0;
    }
    triggerToast("已成功还原并重设视图所有层级！", "success");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        resetView();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync completion metrics
  const totalCompletedCount = useMemo(() => {
    let count = 0;
    targetCases.forEach(tc => {
      const tcState = executionStates[tc.id];
      if (tcState) {
        count += Object.values(tcState.stepResults).filter(v => v !== "untested").length;
      }
    });
    return count;
  }, [targetCases, executionStates]);

  const totalStepsCount = useMemo(() => {
    let count = 0;
    targetCases.forEach(tc => {
      const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      count += tcSteps.length;
    });
    return count;
  }, [targetCases]);

  const calculateOverallStatus = (results: Record<number, string>, stepsText: string) => {
    const steps = stepsText.split("\n").map(s => s.trim()).filter(s => s.length > 0);
    const stepStatuses = steps.map((_, i) => results[i] || "untested");
    if (stepStatuses.some(v => v === "fail")) return TestCaseStatus.FAIL;
    if (stepStatuses.some(v => v === "blocked")) return TestCaseStatus.BLOCKED;
    if (stepStatuses.every(v => v === "pass")) return TestCaseStatus.PASS;
    return TestCaseStatus.UNTESTED;
  };

  const syncActualResult = (results: Record<number, string>, notes: Record<number, string>) => {
    const activeDeviations = Object.entries(results)
      .filter(([_, status]) => status === "fail" || status === "blocked")
      .map(([idx]) => {
        const indexNum = Number(idx);
        const note = (notes[indexNum] || "").trim();
        const label = results[indexNum] === "blocked" ? "阻断原因" : "异常值";
        return `步骤 #${indexNum + 1} ${label}: ${note || "未填写记录详情"}`;
      });

    const isAnyFail = Object.values(results).some(s => s === "fail");
    const isAnyBlocked = Object.values(results).some(s => s === "blocked");

    if (activeDeviations.length > 0) return activeDeviations.join("\n");
    if (isAnyFail) return "步骤运行与预期偏离";
    if (isAnyBlocked) return "步骤回归遭遇阻断";
    return "";
  };

  const handleStepStatusChange = (caseId: string, idx: number, status: "pass" | "fail" | "blocked" | "untested") => {
    const tcState = executionStates[caseId] || { stepResults: {}, stepNotes: {} };
    const nextResults = { ...tcState.stepResults, [idx]: status };
    const nextNotes = { ...tcState.stepNotes };
    if (status === "pass" && nextNotes[idx]) {
      delete nextNotes[idx];
    }

    setExecutionStates(prev => ({
      ...prev,
      [caseId]: { stepResults: nextResults, stepNotes: nextNotes }
    }));

    const matchedCase = targetCases.find(c => c.id === caseId);
    if (matchedCase) {
      const nextOverallStatus = calculateOverallStatus(nextResults, matchedCase.steps || "");
      const nextActualResult = syncActualResult(nextResults, nextNotes);

      onUpdateTestCase({
        ...matchedCase,
        status: nextOverallStatus,
        actualResult: nextActualResult,
        stepResults: nextResults,
        stepNotes: nextNotes,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleStepNoteChange = (caseId: string, idx: number, noteText: string) => {
    const tcState = executionStates[caseId] || { stepResults: {}, stepNotes: {} };
    const nextNotes = { ...tcState.stepNotes, [idx]: noteText };

    setExecutionStates(prev => ({
      ...prev,
      [caseId]: { ...tcState, stepNotes: nextNotes }
    }));

    const matchedCase = targetCases.find(c => c.id === caseId);
    if (matchedCase) {
      const nextOverallStatus = calculateOverallStatus(tcState.stepResults, matchedCase.steps || "");
      const nextActualResult = syncActualResult(tcState.stepResults, nextNotes);

      onUpdateTestCase({
        ...matchedCase,
        status: nextOverallStatus,
        actualResult: nextActualResult,
        stepResults: tcState.stepResults,
        stepNotes: nextNotes,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleAddStep = (caseId: string) => {
    const matchedCase = targetCases.find(c => c.id === caseId);
    if (!matchedCase) return;

    const tcSteps = matchedCase.steps ? matchedCase.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
    const tcExpected = matchedCase.expectedResult ? matchedCase.expectedResult.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];

    const newSteps = [...tcSteps, `步骤 ${tcSteps.length + 1}: 请点击编辑此步骤`].join("\n");
    const newExpected = [...tcExpected, "预期运行完全符合逻辑"].join("\n");

    const tcState = executionStates[caseId] || { stepResults: {}, stepNotes: {} };
    const nextResults = { ...tcState.stepResults, [tcSteps.length]: "untested" as const };
    const nextNotes = { ...tcState.stepNotes };

    setExecutionStates(prev => ({
      ...prev,
      [caseId]: { stepResults: nextResults, stepNotes: nextNotes }
    }));

    onUpdateTestCase({
      ...matchedCase,
      steps: newSteps,
      expectedResult: newExpected,
      stepResults: nextResults,
      stepNotes: nextNotes,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteStep = (caseId: string, idx: number) => {
    const matchedCase = targetCases.find(c => c.id === caseId);
    if (!matchedCase) return;

    const tcSteps = matchedCase.steps ? matchedCase.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
    const tcExpected = matchedCase.expectedResult ? matchedCase.expectedResult.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];

    const newSteps = tcSteps.filter((_, i) => i !== idx).join("\n");
    const newExpected = tcExpected.filter((_, i) => i !== idx).join("\n");

    const tcState = executionStates[caseId] || { stepResults: {}, stepNotes: {} };
    const nextResults: Record<number, "pass" | "fail" | "blocked" | "untested"> = {};
    const nextNotes: Record<number, string> = {};

    Object.keys(tcState.stepResults).forEach(keyStr => {
      const k = Number(keyStr);
      if (k < idx) {
        nextResults[k] = tcState.stepResults[k];
      } else if (k > idx) {
        nextResults[k - 1] = tcState.stepResults[k];
      }
    });

    Object.keys(tcState.stepNotes).forEach(keyStr => {
      const k = Number(keyStr);
      if (k < idx) {
        nextNotes[k] = tcState.stepNotes[k];
      } else if (k > idx) {
        nextNotes[k - 1] = tcState.stepNotes[k];
      }
    });

    setExecutionStates(prev => ({
      ...prev,
      [caseId]: {
        stepResults: nextResults,
        stepNotes: nextNotes
      }
    }));

    const nextOverallStatus = calculateOverallStatus(nextResults, newSteps);
    const nextActualResult = syncActualResult(nextResults, nextNotes);

    onUpdateTestCase({
      ...matchedCase,
      steps: newSteps,
      expectedResult: newExpected,
      status: nextOverallStatus,
      actualResult: nextActualResult,
      stepResults: nextResults,
      stepNotes: nextNotes,
      updatedAt: new Date().toISOString()
    });
  };

  const commitMindmapRegression = () => {
    if (targetCases.length === 0) {
      triggerToast("没有可提交归档的用例", "warning");
      return;
    }

    if (targetCases.length === 1) {
      const tc = targetCases[0];
      const tcState = executionStates[tc.id] || { stepResults: {}, stepNotes: {} };
      const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      const { stepResults, stepNotes } = tcState;
      const passedCount = tcSteps.filter((_, idx) => stepResults[idx] === "pass").length;
      const failedCount = tcSteps.filter((_, idx) => stepResults[idx] === "fail").length;
      const blockedCount = tcSteps.filter((_, idx) => stepResults[idx] === "blocked").length;
      const nextOverallStatus = calculateOverallStatus(stepResults, tc.steps || "");

      let emoji = "🟢";
      if (nextOverallStatus === TestCaseStatus.FAIL) emoji = "🔴";
      if (nextOverallStatus === TestCaseStatus.BLOCKED) emoji = "🟡";

      const details = tcSteps.map((_, idx) => {
        const res = stepResults[idx] || "untested";
        let resLabel = "未测试";
        if (res === "pass") resLabel = "通过";
        if (res === "fail") resLabel = "失败";
        if (res === "blocked") resLabel = "阻断";
        const note = stepNotes[idx] ? ` (异常说明: ${stepNotes[idx].trim()})` : "";
        return `步骤 #${idx + 1}: ${resLabel}${note}`;
      });

      const defaultMsg = `📢【测试用例脑图回归执行结果】
用例名称: ${tc.name}
测试人员: ${currentUser?.nickname || "管理员"}
回归结论: ${emoji} [${nextOverallStatus}]
完成进度: 共 ${tcSteps.length} 个步骤 (${passedCount} 通过, ${failedCount} 失败, ${blockedCount} 阻断)

📋 执行清单:
${details.join("\n")}`;

      setNotifyContent(defaultMsg);
    } else {
      let totalPass = 0;
      let totalFail = 0;
      let totalBlocked = 0;
      let totalUntested = 0;

      const caseSummaries: string[] = [];

      targetCases.forEach(tc => {
        const tcState = executionStates[tc.id] || { stepResults: {}, stepNotes: {} };
        const nextOverallStatus = calculateOverallStatus(tcState.stepResults, tc.steps || "");
        if (nextOverallStatus === TestCaseStatus.PASS) totalPass++;
        else if (nextOverallStatus === TestCaseStatus.FAIL) totalFail++;
        else if (nextOverallStatus === TestCaseStatus.BLOCKED) totalBlocked++;
        else totalUntested++;

        let statusEmoji = "⚪";
        if (nextOverallStatus === TestCaseStatus.PASS) statusEmoji = "🟢";
        if (nextOverallStatus === TestCaseStatus.FAIL) statusEmoji = "🔴";
        if (nextOverallStatus === TestCaseStatus.BLOCKED) statusEmoji = "🟡";

        caseSummaries.push(`- ${statusEmoji} [${nextOverallStatus}] ${tc.name}`);
      });

      const defaultMsg = `📢【批量测试用例脑图回归执行结果】
项目名称: ${projectName}
测试人员: ${currentUser?.nickname || "管理员"}
完成进度: 共 ${targetCases.length} 个用例 (通过: ${totalPass}, 失败: ${totalFail}, 阻断: ${totalBlocked}, 未测试: ${totalUntested})

📋 用例清单概要:
${caseSummaries.join("\n")}`;

      setNotifyContent(defaultMsg);
    }

    setShowConfirmCommit(true);
  };

  const executeCommitArchive = (sendNotification: boolean) => {
    const nextStates = { ...executionStates };
    targetCases.forEach(tc => {
      const tcState = executionStates[tc.id];
      if (!tcState) return;

      const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      const { stepResults, stepNotes } = tcState;

      const details = tcSteps.map((stepText, idx) => {
        const res = stepResults[idx] || "untested";
        let resLabel = "⚪ 未测试";
        if (res === "pass") resLabel = "🟢 通过";
        if (res === "fail") resLabel = "🔴 失败";
        if (res === "blocked") resLabel = "🟡 阻断";

        const note = stepNotes[idx] ? ` (异常原因: ${stepNotes[idx].trim()})` : "";
        return `步骤 #${idx + 1}: ${stepText}\n   ➔ 执行结论: ${resLabel}${note}`;
      });

      const nextOverallStatus = calculateOverallStatus(stepResults, tc.steps || "");

      const runSnapshot = {
        results: stepResults,
        notes: stepNotes,
        overallStatus: nextOverallStatus,
        description: details.join("\n"),
        timestamp: new Date().toISOString()
      };

      const newLog = {
        id: `exec-log-${Date.now()}-${tc.id}`,
        userId: currentUser?.id || "u-sys",
        userName: currentUser?.nickname || "管理员",
        action: `归档回归报告 [结论: ${nextOverallStatus}]`,
        oldValue: tc.status,
        newValue: JSON.stringify(runSnapshot),
        createdAt: new Date().toISOString()
      };

      const initResults: Record<number, "pass" | "fail" | "blocked" | "untested"> = {};
      const initNotes: Record<number, string> = {};
      tcSteps.forEach((_, idx) => {
        initResults[idx] = "untested";
      });

      nextStates[tc.id] = {
        stepResults: initResults,
        stepNotes: initNotes
      };

      onUpdateTestCase({
        ...tc,
        status: TestCaseStatus.UNTESTED,
        actualResult: "",
        stepResults: initResults,
        stepNotes: initNotes,
        historyLogs: [newLog, ...(tc.historyLogs || [])],
        updatedAt: new Date().toISOString()
      });
    });

    setExecutionStates(nextStates);

    if (sendNotification && selectedChannels.length > 0 && onTriggerWebhook) {
      selectedChannels.forEach(channel => {
        const payload = {
          title: `📊 XMind 用例回归完毕通知`,
          type: "TestCaseStatusChange",
          content: notifyContent,
          assignee: currentUser?.nickname || "管理员",
          link: window.location.href,
          isAutoTrigger: false
        };
        onTriggerWebhook(channel, payload);
      });
      triggerToast(`🎉 结果已成功归档，并同步向 [${selectedChannels.map(c => c === 'feishu' ? '飞书' : c === 'email' ? '邮件' : '系统站内信').join(', ')}] 发送通知提示！`, "success");
    } else {
      triggerToast(`🎉 当前层级目录下 ${targetCases.length} 个用例回归检验已全部成功归档！`, "success");
    }

    setShowConfirmCommit(false);
  };

  const executeResetDraft = () => {
    if (!checkActionPermission("reset_progress")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“重置用例回归状态进度”操作！", "warning");
      return;
    }
    const nextStates = { ...executionStates };
    targetCases.forEach(tc => {
      const tcSteps = tc.steps ? tc.steps.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
      const initResults: Record<number, "pass" | "fail" | "blocked" | "untested"> = {};
      const initNotes: Record<number, string> = {};
      tcSteps.forEach((_, idx) => {
        initResults[idx] = "untested";
      });
      nextStates[tc.id] = {
        stepResults: initResults,
        stepNotes: initNotes
      };
      onUpdateTestCase({
        ...tc,
        status: TestCaseStatus.UNTESTED,
        actualResult: "",
        stepResults: initResults,
        stepNotes: initNotes,
        updatedAt: new Date().toISOString()
      });
    });
    setExecutionStates(nextStates);
    setShowConfirmReset(false);
    triggerToast("回归进度已清空并重设！", "warning");
  };

  const toggleCaseExpansion = (caseId: string) => {
    setExpandedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const renderArrow = (key: string) => (
    <div key={key} className="flex items-center justify-center shrink-0 w-8 h-4 self-center select-none mx-1.5">
      <svg width="32" height="16" viewBox="0 0 32 16" fill="none" className="text-slate-300">
        <path d="M0 8H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 5L31 8L26 11V5Z" fill="currentColor" />
      </svg>
    </div>
  );

  // Simplified Recursive folder node tree generator leveraging collapsible folder status
  const renderFolderNode = (f: FolderType) => {
    const childFolders = folders.filter(sf => sf.parentId === f.id && allowedFolderIds.has(sf.id));
    const directCases = testCases.filter(tc => tc.folderId === f.id && targetFolderIds.has(tc.folderId));
    const hasChildren = childFolders.length > 0 || directCases.length > 0;
    const isFolderCollapsed = collapsedFolderIds.has(f.id);
    const isFolderActive = f.id === activeFolderId;

    return (
      <div className="flex flex-row items-center">
        {/* Folder Node Box with Interactive click to collapse/expand */}
        <div
          id={`mindmap-folder-${f.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectFolder) {
              onSelectFolder(f.id);
            }
            if (isFolderActive) {
              toggleFolderCollapse(f.id);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleStartEditFolder(f.id, f.name);
          }}
          className={`group/folder shadow-3xs shrink-0 text-left transition-all select-none cursor-pointer ${
            isCompact
              ? "rounded-md p-1.5 px-3 w-[180px] h-[36px] flex items-center justify-between"
              : "rounded-xl p-2.5 px-3.5 w-[180px] flex flex-col"
          } border-2 ${
            isFolderActive
              ? "bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
              : isFolderCollapsed
              ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
              : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
          }`}
        >
          {isCompact ? (
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] shrink-0">📁</span>
                {editingFolderId === f.id ? (
                  <input
                    className="border border-indigo-300 rounded px-1 text-[10px] font-bold bg-white outline-none flex-1 py-0.5 text-slate-800"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onBlur={() => handleSaveFolder(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveFolder(f.id);
                      } else if (e.key === "Escape") {
                        setEditingFolderId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="text-[10px] font-bold text-slate-800 truncate flex-1" title={f.name}>
                    {f.name}
                  </span>
                )}
              </div>
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolderCollapse(f.id);
                  }}
                  className="text-[10px] font-black text-slate-400 ml-1 shrink-0 p-1 hover:text-indigo-650 hover:bg-slate-200 rounded transition-all"
                  title={isFolderCollapsed ? "展开目录" : "收起目录"}
                >
                  {isFolderCollapsed ? "⊕" : "⊖"}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7.5px] font-extrabold uppercase tracking-widest block font-sans text-slate-400">
                  📁 目录
                </span>
                {hasChildren && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolderCollapse(f.id);
                    }}
                    className="text-[8px] font-bold text-slate-400 group-hover/folder:text-indigo-600 transition-colors p-0.5 px-1.5 hover:bg-slate-100 rounded cursor-pointer select-none"
                    title={isFolderCollapsed ? "展开" : "收起"}
                  >
                    {isFolderCollapsed ? "展开 +" : "收起 -"}
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 truncate flex items-center gap-1 text-[9.5px] mt-0.5 w-full" title={f.name}>
                <span>📁</span>
                {editingFolderId === f.id ? (
                  <input
                    className="border border-indigo-300 rounded px-1 text-[9.5px] font-bold bg-white outline-none flex-1 py-0.5 text-slate-800 w-full"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onBlur={() => handleSaveFolder(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveFolder(f.id);
                      } else if (e.key === "Escape") {
                        setEditingFolderId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="truncate">{f.name}</span>
                )}
              </div>
            </>
          )}
        </div>

        {hasChildren && !isFolderCollapsed && (
          <>
            {/* Connection line to child list */}
            <div className="flex items-center justify-center shrink-0 w-4 h-4 select-none mx-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-200/50">
                <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Vertical fork stack for children - dynamically compact or comfortable spacing */}
            <div className={`relative pl-4 border-l border-indigo-200/40 py-1 flex flex-col justify-center ${
              isCompact ? "space-y-3.5" : "space-y-6"
            }`}>
              {/* 1. Sub-folders */}
              {childFolders.map(childF => (
                <div key={childF.id} className="relative flex flex-row items-center">
                  <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />
                  {renderFolderNode(childF)}
                </div>
              ))}

              {/* 2. Direct test cases */}
              {directCases.map(tc => {
                const tcState = executionStates[tc.id];
                const isExpanded = expandedCaseIds.has(tc.id);

                return (
                  <div key={tc.id} className="relative flex flex-row items-center gap-2">
                    <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />
                    <MindmapCaseCard
                      tc={tc}
                      tcState={tcState}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleCaseExpansion(tc.id)}
                      onStepStatusChange={handleStepStatusChange}
                      onStepNoteChange={handleStepNoteChange}
                      onUpdateTestCase={onUpdateTestCase}
                      isActive={tc.id === activeCase?.id}
                      onSelect={() => onSelectTestCase?.(tc.id)}
                      onAddStep={handleAddStep}
                      onDeleteStep={handleDeleteStep}
                      isCompact={isCompact}
                      onDeleteTestCase={onDeleteTestCase}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  // Helper to render virtual unplanned folder node
  const renderUnplannedVirtualFolder = () => {
    const unplannedCases = testCases.filter(tc => !tc.folderId && !tc.linkedRequirementId);
    if (unplannedCases.length === 0) return null;

    const isCollapsed = unplannedVirtualCollapsed;
    const hasChildren = unplannedCases.length > 0;

    return (
      <div className="flex flex-row items-center">
        <div
          id="mindmap-folder-unplanned"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectFolder) {
              onSelectFolder("unplanned");
            }
            setUnplannedVirtualCollapsed(prev => !prev);
          }}
          className={`group/folder shadow-3xs shrink-0 text-left transition-all select-none cursor-pointer ${
            isCompact
              ? "rounded-md p-1.5 px-3 w-[180px] h-[36px] flex items-center justify-between"
              : "rounded-xl p-2.5 px-3.5 w-[180px] flex flex-col"
          } border-2 ${
            activeFolderId === "unplanned"
              ? "bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
              : isCollapsed
              ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
              : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
          }`}
        >
          {isCompact ? (
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] shrink-0">📁</span>
                <span className="text-[10px] font-bold text-slate-800 truncate flex-1">
                  未规划
                </span>
                <span className="bg-slate-100 text-slate-600 text-[8px] px-1 py-0.5 rounded-sm font-black shrink-0">
                  {unplannedCases.length}
                </span>
              </div>
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setUnplannedVirtualCollapsed(prev => !prev);
                  }}
                  className="text-[10px] font-black text-slate-400 ml-1 shrink-0 p-1 hover:text-indigo-650 hover:bg-slate-200 rounded transition-all"
                >
                  {isCollapsed ? "⊕" : "⊖"}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7.5px] font-extrabold uppercase tracking-widest block font-sans text-slate-400">
                  📁 暂存
                </span>
                {hasChildren && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnplannedVirtualCollapsed(prev => !prev);
                    }}
                    className="text-[8px] font-bold text-slate-400 group-hover/folder:text-indigo-600 transition-colors p-0.5 px-1.5 hover:bg-slate-100 rounded"
                  >
                    {isCollapsed ? "展开 +" : "收起 -"}
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 truncate flex items-center gap-1.5 text-[9.5px] mt-0.5 w-full">
                <span>📁</span>
                <span className="truncate">未规划</span>
                <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-black ml-auto">
                  {unplannedCases.length}
                </span>
              </div>
            </>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <>
            <div className="flex items-center justify-center shrink-0 w-4 h-4 select-none mx-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-200/50">
                <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <div className={`relative pl-4 border-l border-indigo-200/40 py-1 flex flex-col justify-center ${
              isCompact ? "space-y-3.5" : "space-y-6"
            }`}>
              {unplannedCases.map(tc => {
                const tcState = executionStates[tc.id];
                const isExpanded = expandedCaseIds.has(tc.id);

                return (
                  <div key={tc.id} className="relative flex flex-row items-center gap-2">
                    <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />
                    <MindmapCaseCard
                      tc={tc}
                      tcState={tcState}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleCaseExpansion(tc.id)}
                      onStepStatusChange={handleStepStatusChange}
                      onStepNoteChange={handleStepNoteChange}
                      onUpdateTestCase={onUpdateTestCase}
                      isActive={tc.id === activeCase?.id}
                      onSelect={() => onSelectTestCase?.(tc.id)}
                      onAddStep={handleAddStep}
                      onDeleteStep={handleDeleteStep}
                      isCompact={isCompact}
                      onDeleteTestCase={onDeleteTestCase}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  // Helper to render virtual req-root folder node and its child requirement nodes
  const renderReqRootVirtualFolder = () => {
    const reqsWithCases = requirements.filter(req =>
      testCases.some(tc => tc.linkedRequirementId === req.id)
    );
    const reqRootCases = testCases.filter(tc => !tc.folderId && tc.linkedRequirementId);
    if (reqsWithCases.length === 0 && reqRootCases.length === 0) return null;

    const isCollapsed = reqRootVirtualCollapsed;
    const hasChildren = reqsWithCases.length > 0;

    return (
      <div className="flex flex-row items-center">
        <div
          id="mindmap-folder-req-root"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectFolder) {
              onSelectFolder("req-root");
            }
            setReqRootVirtualCollapsed(prev => !prev);
          }}
          className={`group/folder shadow-3xs shrink-0 text-left transition-all select-none cursor-pointer ${
            isCompact
              ? "rounded-md p-1.5 px-3 w-[180px] h-[36px] flex items-center justify-between"
              : "rounded-xl p-2.5 px-3.5 w-[180px] flex flex-col"
          } border-2 ${
            activeFolderId === "req-root"
              ? "bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
              : isCollapsed
              ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
              : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
          }`}
        >
          {isCompact ? (
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] shrink-0">📁</span>
                <span className="text-[10px] font-bold text-slate-800 truncate flex-1">
                  按需求
                </span>
                <span className="bg-slate-100 text-slate-600 text-[8px] px-1 py-0.5 rounded-sm font-black shrink-0">
                  {reqRootCases.length}
                </span>
              </div>
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setReqRootVirtualCollapsed(prev => !prev);
                  }}
                  className="text-[10px] font-black text-slate-400 ml-1 shrink-0 p-1 hover:text-indigo-650 hover:bg-slate-200 rounded transition-all"
                >
                  {isCollapsed ? "⊕" : "⊖"}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7.5px] font-extrabold uppercase tracking-widest block font-sans text-slate-400">
                  🧬 需求
                </span>
                {hasChildren && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setReqRootVirtualCollapsed(prev => !prev);
                    }}
                    className="text-[8px] font-bold text-slate-400 group-hover/folder:text-indigo-600 transition-colors p-0.5 px-1.5 hover:bg-slate-100 rounded"
                  >
                    {isCollapsed ? "展开 +" : "收起 -"}
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 truncate flex items-center gap-1.5 text-[9.5px] mt-0.5 w-full">
                <span>📁</span>
                <span className="truncate">按需求</span>
                <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-black ml-auto">
                  {reqRootCases.length}
                </span>
              </div>
            </>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <>
            <div className="flex items-center justify-center shrink-0 w-4 h-4 select-none mx-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-200/50">
                <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <div className={`relative pl-4 border-l border-indigo-200/40 py-1 flex flex-col justify-center ${
              isCompact ? "space-y-3.5" : "space-y-6"
            }`}>
              {reqsWithCases.map(req => {
                const reqCases = testCases.filter(tc => tc.linkedRequirementId === req.id);
                const isReqCollapsed = collapsedRequirementIds.has(req.id);
                const isReqActive = req.id === activeRequirementId;

                const toggleReqCollapse = (rId: string) => {
                  setCollapsedRequirementIds(prev => {
                    const next = new Set(prev);
                    if (next.has(rId)) next.delete(rId);
                    else next.add(rId);
                    return next;
                  });
                };

                return (
                  <div key={req.id} className="relative flex flex-row items-center">
                    <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />

                    <div
                      id={`mindmap-requirement-${req.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectReqFolder) {
                          onSelectReqFolder(req.id);
                        }
                        if (isReqActive) {
                          toggleReqCollapse(req.id);
                        }
                      }}
                      className={`group/folder shadow-3xs shrink-0 text-left transition-all select-none cursor-pointer ${
                        isCompact
                          ? "rounded-md p-1.5 px-3 w-[180px] h-[36px] flex items-center justify-between"
                          : "rounded-xl p-2.5 px-3.5 w-[180px] flex flex-col"
                      } border-2 ${
                        isReqActive
                          ? "bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                          : isReqCollapsed
                          ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                          : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
                      }`}
                    >
                      {isCompact ? (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-[10px] shrink-0">🧬</span>
                            <span className="text-[10px] font-bold text-slate-800 truncate flex-1" title={req.title}>
                              {req.title}
                            </span>
                            <span className="bg-slate-100 text-slate-600 text-[8px] px-1 py-0.5 rounded-sm font-black shrink-0">
                              {reqCases.length}
                            </span>
                          </div>
                          {reqCases.length > 0 && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReqCollapse(req.id);
                              }}
                              className="text-[10px] font-black text-slate-400 ml-1 shrink-0 p-1 hover:text-indigo-650 hover:bg-slate-200 rounded transition-all"
                            >
                              {isReqCollapsed ? "⊕" : "⊖"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-black tracking-widest block font-sans ${isReqActive ? "text-indigo-600 font-bold" : "text-slate-400"}`}>
                              {isReqActive ? "🧬 当前需求" : "关联需求"}
                            </span>
                            {reqCases.length > 0 && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReqCollapse(req.id);
                                }}
                                className="text-[8px] font-bold text-slate-400 group-hover/folder:text-indigo-600 transition-colors p-1 hover:bg-slate-100 rounded"
                              >
                                {isReqCollapsed ? "+" : "-"}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-800 truncate flex items-center gap-1.5 text-[9.5px] mt-1 w-full" title={req.title}>
                            <span>🧬</span>
                            <span className="truncate">{req.title}</span>
                            <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-black ml-auto">
                              {reqCases.length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {reqCases.length > 0 && !isReqCollapsed && (
                      <>
                        <div className="flex items-center justify-center shrink-0 w-4 h-4 select-none mx-0.5">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-200/50">
                            <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>

                        <div className={`relative pl-4 border-l border-indigo-200/40 py-1 flex flex-col justify-center ${
                          isCompact ? "space-y-3.5" : "space-y-6"
                        }`}>
                          {reqCases.map(tc => {
                            const tcState = executionStates[tc.id];
                            const isExpanded = expandedCaseIds.has(tc.id);

                            return (
                              <div key={tc.id} className="relative flex flex-row items-center gap-2">
                                <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />
                                <MindmapCaseCard
                                  tc={tc}
                                  tcState={tcState}
                                  isExpanded={isExpanded}
                                  onToggleExpand={() => toggleCaseExpansion(tc.id)}
                                  onStepStatusChange={handleStepStatusChange}
                                  onStepNoteChange={handleStepNoteChange}
                                  onUpdateTestCase={onUpdateTestCase}
                                  isActive={tc.id === activeCase?.id}
                                  onSelect={() => onSelectTestCase?.(tc.id)}
                                  onAddStep={handleAddStep}
                                  onDeleteStep={handleDeleteStep}
                                  isCompact={isCompact}
                                  onDeleteTestCase={onDeleteTestCase}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const rootLabel = activeCase
    ? activeCase.name
    : activeFolderId === "req-root"
    ? "按需求"
    : activeFolderId === "unplanned"
    ? "未规划"
    : effectiveFolderId
    ? folders.find(f => f.id === effectiveFolderId)?.name || "当前目录"
    : effectiveRequirementId
    ? requirements.find(r => r.id === effectiveRequirementId)?.title || "当前需求"
    : "全部用例";

  const rootTypeLabel = activeFolderId === "req-root"
    ? "📁 按需求目录"
    : activeFolderId === "unplanned"
    ? "📁 未规划目录"
    : effectiveFolderId
    ? "📂 关联目录"
    : effectiveRequirementId
    ? "🧬 关联需求"
    : "📁 全部用例集";

  const displayedCrumbs = useMemo(() => {
    return mindmapBreadcrumbs.length > 1 ? mindmapBreadcrumbs.slice(0, -1) : [];
  }, [mindmapBreadcrumbs]);

  return (
    <div
      className={`font-sans select-none flex flex-col outline-none focus:outline-none focus-visible:outline-none ${
        isFullscreen
          ? "fixed inset-0 z-[500] bg-slate-100 flex flex-col h-screen w-screen overflow-hidden p-6 gap-4"
          : "relative space-y-4 w-full max-w-full overflow-hidden"
      }`}
      id="xmind-workspace-root"
    >

      {/* 1. Header Row (Breadcrumbs / Title on left, Action bar on right) - Never blocks content! */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-3.5 px-5 rounded-2xl shadow-3xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs shrink-0">
            <Network className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            {displayedCrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 flex-wrap select-none leading-none mb-1">
                {displayedCrumbs.map((crumb, idx) => {
                  const isClickable = !!crumb.action;
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-350 mx-0.5 font-normal">/</span>}
                      {isClickable ? (
                        <button
                          type="button"
                          onClick={crumb.action}
                          className="text-slate-400 hover:text-indigo-600 hover:underline transition-colors cursor-pointer font-bold outline-none focus:outline-none"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="text-slate-400">
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            <h3 className="text-xs font-black text-slate-800 leading-none">
              {rootLabel}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MindmapActionBar
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            onResetProgress={() => setShowConfirmReset(true)}
            onCommitArchive={commitMindmapRegression}
            totalCompletedCount={totalCompletedCount}
            totalStepsCount={totalStepsCount}
            hasExecutePerm={checkActionPermission("execute")}
            hasResetPerm={checkActionPermission("reset_progress")}
          />
        </div>
      </div>

      {/* 2. Scrollable Canvas space - fully outline-fixed to prevent browser black box wireframes */}
      <div className="relative w-full flex-1 flex flex-col min-h-0">
        <div
          id="mindmap-container"
          className={`relative border rounded-2xl p-6.5 transition-all outline-none focus:outline-none focus-visible:outline-none flex-1 ${
            isFullscreen
              ? "overflow-auto border-indigo-100 bg-white shadow-lg"
              : "overflow-auto border-slate-200/80 bg-slate-50/50 min-h-[440px] max-w-full"
          }`}
        >
        {targetCases.length === 0 && !effectiveFolderId && !effectiveRequirementId && !activeCase ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <ClipboardList className="h-12 w-12 text-slate-300 animate-bounce" />
            <h4 className="text-xs font-black text-slate-700">该目录下暂无用例数据</h4>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1">您可以点击左侧目录树，或者增加当前选定层级下的测试资产以再度回归！</p>
          </div>
        ) : (
          <div
            className="flex flex-row items-center justify-start space-x-2 min-w-max pb-4"
            style={{
              transform: `scale(${scale / 100})`,
              transformOrigin: "left center",
              transition: "transform 0.15s ease-out",
            }}
          >

            {rootTreeFolders.length > 0 && !isAllCasesRoot && activeFolderId !== "req-root" && activeFolderId !== "unplanned" ? (
              <>
                {/* Recursive Folder trees nested stack */}
                <div className="relative space-y-4 flex flex-col justify-center select-text">
                  {rootTreeFolders.map(rootF => (
                    <div key={rootF.id} className="relative flex flex-row items-center">
                      {renderFolderNode(rootF)}
                    </div>
                  ))}

                  {/* Render any target cases that are NOT in folders */}
                  {targetCases.filter(tc => !tc.folderId).map(tc => {
                    const tcState = executionStates[tc.id];
                    const isExpanded = expandedCaseIds.has(tc.id);

                    return (
                      <div key={tc.id} className="relative flex flex-row items-center gap-2">
                        <MindmapCaseCard
                          tc={tc}
                          tcState={tcState}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleCaseExpansion(tc.id)}
                          onStepStatusChange={handleStepStatusChange}
                          onStepNoteChange={handleStepNoteChange}
                          onUpdateTestCase={onUpdateTestCase}
                          isActive={tc.id === activeCase?.id}
                          onSelect={() => onSelectTestCase?.(tc.id)}
                          onAddStep={handleAddStep}
                          onDeleteStep={handleDeleteStep}
                          isCompact={isCompact}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Focused Root Directory / Requirement Node representing the Aggregated Layer with Collapse/Expand! */}
                <div className="flex flex-col justify-center shrink-0 self-center animate-fade-in">
                  <div
                    id={isAllCasesRoot ? "mindmap-root-node" : effectiveFolderId ? `mindmap-folder-${effectiveFolderId}` : effectiveRequirementId ? `mindmap-requirement-${effectiveRequirementId}` : "mindmap-root-node"}
                    onClick={() => {
                      if (isAllCasesRoot) {
                        setAllCasesRootCollapsed(prev => !prev);
                      } else {
                        if (effectiveFolderId && onSelectFolder) {
                          onSelectFolder(effectiveFolderId);
                        } else if (effectiveRequirementId && onSelectReqFolder) {
                          onSelectReqFolder(effectiveRequirementId);
                        }
                        setUnplannedRootCollapsed(prev => !prev);
                      }
                    }}
                    className={`group/root shadow-md select-none cursor-pointer transition-all ${
                      isCompact
                        ? "rounded-md border-2 p-1.5 px-3.5 h-[36px] flex items-center justify-between w-[220px] shrink-0"
                        : "rounded-xl border-2 p-3 text-center w-[220px]"
                    } ${
                      (isAllCasesRoot ? allCasesRootCollapsed : unplannedRootCollapsed)
                        ? "bg-slate-50/90 border-indigo-200 text-slate-700 hover:border-indigo-400"
                        : "bg-indigo-50/40 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/10 hover:border-indigo-600"
                    }`}
                  >
                    {isCompact ? (
                      <div className="flex items-center justify-between w-full gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10px] shrink-0">
                            {isAllCasesRoot ? "📁" : effectiveFolderId ? "📂" : effectiveRequirementId ? "🧬" : "📁"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 truncate" title={rootLabel}>
                            {rootLabel}
                          </span>
                          <span className="bg-indigo-100 text-indigo-800 text-[8px] px-1.5 py-0.5 rounded font-black shrink-0">
                            {targetCases.length}用例
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 shrink-0 ml-1">
                          {(isAllCasesRoot ? allCasesRootCollapsed : unplannedRootCollapsed) ? "⊕" : "⊖"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className={`text-[7.5px] font-extrabold uppercase tracking-widest block font-mono ${(isAllCasesRoot ? allCasesRootCollapsed : unplannedRootCollapsed) ? "text-slate-400" : "text-indigo-600 animate-pulse"}`}>
                            {rootTypeLabel}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 group-hover/root:text-indigo-600 transition-colors">
                            {(isAllCasesRoot ? allCasesRootCollapsed : unplannedRootCollapsed) ? "展开 +" : "收起 -"}
                          </span>
                        </div>
                        <span className="font-black text-xs block leading-snug truncate max-w-[180px] mt-1 text-slate-800" title={rootLabel}>
                          {rootLabel}
                        </span>
                        <div className="mt-1.5 text-[8px] font-black font-mono text-indigo-600 font-extrabold">
                          共 {targetCases.length} 个测试用例
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!(isAllCasesRoot ? allCasesRootCollapsed : unplannedRootCollapsed) && (
                  <>
                    {renderArrow("arrow-folder-to-cases")}

                    {/* Aggregated branching Test Cases column connected by clear, stable, non-warping CSS timeline line & stubs - dynamically compact or comfortable spacing */}
                    <div className={`relative pl-4 border-l-2 border-indigo-200/50 py-1 flex flex-col justify-center select-text ${
                      isCompact ? "space-y-3.5" : "space-y-6"
                    }`}>
                      {isAllCasesRoot ? (
                        <>
                          {/* 1. Unplanned virtual folder */}
                          {renderUnplannedVirtualFolder()}

                          {/* 2. Requirement-root virtual folder */}
                          {renderReqRootVirtualFolder()}

                          {/* 3. Custom top-level folders */}
                          {rootTreeFolders.map(rootF => (
                            <div key={rootF.id} className="relative flex flex-row items-center">
                              <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />
                              {renderFolderNode(rootF)}
                            </div>
                          ))}
                        </>
                      ) : activeFolderId === "req-root" ? (
                        <>
                          {/* Render requirements directly as child nodes! */}
                          {requirements.map(req => {
                            const reqCases = testCases.filter(tc => tc.linkedRequirementId === req.id);
                            const isReqCollapsed = collapsedRequirementIds.has(req.id);
                            const isReqActive = req.id === activeRequirementId;

                            const toggleReqCollapse = (rId: string) => {
                              setCollapsedRequirementIds(prev => {
                                const next = new Set(prev);
                                if (next.has(rId)) next.delete(rId);
                                else next.add(rId);
                                return next;
                              });
                            };

                            return (
                              <div key={req.id} className="relative flex flex-row items-center">
                                <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />

                                <div
                                  id={`mindmap-requirement-${req.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectReqFolder) {
                                      onSelectReqFolder(req.id);
                                    }
                                    if (isReqActive) {
                                      toggleReqCollapse(req.id);
                                    }
                                  }}
                                  className={`group/folder shadow-3xs shrink-0 text-left transition-all select-none cursor-pointer ${
                                    isCompact
                                      ? "rounded-md p-1.5 px-3 w-[180px] h-[36px] flex items-center justify-between"
                                      : "rounded-xl p-2.5 px-3.5 w-[180px] flex flex-col"
                                  } border-2 ${
                                    isReqActive
                                      ? "bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                                      : isReqCollapsed
                                      ? "bg-slate-50/90 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                                      : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-slate-50/10 shadow-sm"
                                  }`}
                                >
                                  {isCompact ? (
                                    <div className="flex items-center justify-between w-full min-w-0">
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="text-[10px] shrink-0">🧬</span>
                                        <span className="text-[10px] font-bold text-slate-800 truncate flex-1" title={req.title}>
                                          {req.title}
                                        </span>
                                        <span className="bg-slate-100 text-slate-600 text-[8px] px-1 py-0.5 rounded-sm font-black shrink-0">
                                          {reqCases.length}
                                        </span>
                                      </div>
                                      {reqCases.length > 0 && (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleReqCollapse(req.id);
                                          }}
                                          className="text-[10px] font-black text-slate-400 ml-1 shrink-0 p-1 hover:text-indigo-650 hover:bg-slate-200 rounded transition-all"
                                        >
                                          {isReqCollapsed ? "⊕" : "⊖"}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[8px] font-black tracking-widest block font-sans ${isReqActive ? "text-indigo-600 font-bold" : "text-slate-400"}`}>
                                          {isReqActive ? "🧬 当前需求" : "关联需求"}
                                        </span>
                                        {reqCases.length > 0 && (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleReqCollapse(req.id);
                                            }}
                                            className="text-[8px] font-bold text-slate-400 group-hover/folder:text-indigo-600 transition-colors p-1 hover:bg-slate-100 rounded"
                                          >
                                            {isReqCollapsed ? "+" : "-"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-bold text-slate-800 truncate flex items-center gap-1.5 text-[9.5px] mt-1 w-full" title={req.title}>
                                        <span>🧬</span>
                                        <span className="truncate">{req.title}</span>
                                        <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-black ml-auto">
                                          {reqCases.length}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {reqCases.length > 0 && !isReqCollapsed && (
                                  <>
                                    <div className="flex items-center justify-center shrink-0 w-4 h-4 select-none mx-0.5">
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-200/50">
                                        <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                      </svg>
                                    </div>

                                    <div className={`relative pl-4 border-l border-indigo-200/40 py-1 flex flex-col justify-center ${
                                      isCompact ? "space-y-3.5" : "space-y-6"
                                    }`}>
                                      {reqCases.map(tc => {
                                        const tcState = executionStates[tc.id];
                                        const isExpanded = expandedCaseIds.has(tc.id);

                                        return (
                                          <div key={tc.id} className="relative flex flex-row items-center gap-2">
                                            <span className="absolute -left-4 w-4 h-[1px] bg-indigo-200/40" />
                                            <MindmapCaseCard
                                              tc={tc}
                                              tcState={tcState}
                                              isExpanded={isExpanded}
                                              onToggleExpand={() => toggleCaseExpansion(tc.id)}
                                              onStepStatusChange={handleStepStatusChange}
                                              onStepNoteChange={handleStepNoteChange}
                                              onUpdateTestCase={onUpdateTestCase}
                                              isActive={tc.id === activeCase?.id}
                                              onSelect={() => onSelectTestCase?.(tc.id)}
                                              onAddStep={handleAddStep}
                                              onDeleteStep={handleDeleteStep}
                                              isCompact={isCompact}
                                              onDeleteTestCase={onDeleteTestCase}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        targetCases.map(tc => {
                          const tcState = executionStates[tc.id];
                          const isExpanded = expandedCaseIds.has(tc.id);

                          return (
                            <div key={tc.id} className="relative flex flex-row items-center gap-2">
                              {/* Left horizontal connection stub line back to aggregate branch vertical line */}
                              <span className="absolute -left-4 w-4 h-[2px] bg-indigo-200/50" />
                              <MindmapCaseCard
                                tc={tc}
                                tcState={tcState}
                                isExpanded={isExpanded}
                                onToggleExpand={() => toggleCaseExpansion(tc.id)}
                                onStepStatusChange={handleStepStatusChange}
                                onStepNoteChange={handleStepNoteChange}
                                onUpdateTestCase={onUpdateTestCase}
                                isActive={tc.id === activeCase?.id}
                                onSelect={() => onSelectTestCase?.(tc.id)}
                                onAddStep={handleAddStep}
                                onDeleteStep={handleDeleteStep}
                                isCompact={isCompact}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Confirmation reset Modal Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl border border-indigo-50/50 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 leading-none">重置用例回归状态</h3>
                <p className="text-[9.5px] text-slate-400 mt-1.5 font-semibold">该操作将清零当前检验草稿</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
              您确定要将选定范围下的所有用例执行状态清零（标为未测试）并移除临时草稿异常说明吗？已进行物流归档的进度不受波及。
            </p>
            <div className="flex justify-end gap-2 text-[11px] pt-1">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 font-black text-slate-400 hover:text-slate-600 rounded-xl"
              >
                取消
              </button>
              <button
                onClick={executeResetDraft}
                className="px-4 py-2 font-black bg-slate-900 text-white rounded-xl shadow-sm"
              >
                确定重设
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.5. Confirmation Commit Modal */}
      {showConfirmCommit && (() => {
        const isSingle = targetCases.length === 1;
        let totalPass = 0;
        let totalFail = 0;
        let totalBlocked = 0;
        let totalUntested = 0;
        let singleStatus = TestCaseStatus.UNTESTED;
        let singleName = "";

        if (isSingle) {
          const tc = targetCases[0];
          singleName = tc.name;
          const tcState = executionStates[tc.id] || { stepResults: {}, stepNotes: {} };
          singleStatus = calculateOverallStatus(tcState.stepResults, tc.steps || "");
        } else {
          targetCases.forEach(tc => {
            const tcState = executionStates[tc.id] || { stepResults: {}, stepNotes: {} };
            const nextOverallStatus = calculateOverallStatus(tcState.stepResults, tc.steps || "");
            if (nextOverallStatus === TestCaseStatus.PASS) totalPass++;
            else if (nextOverallStatus === TestCaseStatus.FAIL) totalFail++;
            else if (nextOverallStatus === TestCaseStatus.BLOCKED) totalBlocked++;
            else totalUntested++;
          });
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in font-sans text-left">
            <div className="bg-white rounded-3xl border border-slate-150 p-6 max-w-xl w-full space-y-5 shadow-2xl text-left animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span>🔔 发送执行结果通知并归档</span>
                </h4>
                <button
                  onClick={() => {
                    setShowConfirmCommit(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-sm outline-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Outcome summary preview */}
                <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block select-none">
                    📊 回归分析概要
                  </span>
                  {isSingle ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2">
                        <span className="text-slate-400">用例名称:</span>
                        <span className="ml-1.5 font-bold text-slate-700 truncate inline-block max-w-[400px] align-bottom" title={singleName}>
                          {singleName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">用例结论:</span>
                        <span className={`ml-1.5 font-black ${
                          singleStatus === TestCaseStatus.PASS
                            ? "text-emerald-600"
                            : singleStatus === TestCaseStatus.FAIL
                            ? "text-rose-600 animate-pulse"
                            : "text-amber-600"
                        }`}>
                          {singleStatus}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">执行人员:</span>
                        <span className="ml-1.5 font-bold text-slate-700">{currentUser?.nickname || "管理员"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">用例总数:</span>
                        <span className="ml-1.5 font-bold text-slate-700">
                          {targetCases.length} 个
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">执行人员:</span>
                        <span className="ml-1.5 font-bold text-slate-700">{currentUser?.nickname || "管理员"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">用例结论:</span>
                        <span className="ml-1.5 font-black text-indigo-600">
                          通过 {totalPass} / 失败 {totalFail} / 阻断 {totalBlocked} {totalUntested > 0 ? `/ 未测试 ${totalUntested}` : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notification channels */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block select-none">
                    推送通知渠道配置
                  </span>
                  <div className="flex flex-wrap items-center gap-3 select-none">
                    {[
                      { id: "feishu", label: "💬 飞书协作机器人", color: "text-blue-600" },
                      { id: "email", label: "📧 团队群发邮件", color: "text-indigo-600" },
                      { id: "system", label: "🔔 系统消息中心", color: "text-amber-600" }
                    ].map(channel => {
                      const checked = selectedChannels.includes(channel.id);
                      return (
                        <label
                          key={channel.id}
                          className={`flex items-center gap-2 cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                            checked
                              ? "bg-slate-50 border-slate-300 text-slate-800 shadow-3xs"
                              : "bg-white border-slate-150 text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChannels([...selectedChannels, channel.id]);
                              } else {
                                setSelectedChannels(selectedChannels.filter(c => c !== channel.id));
                              }
                            }}
                            className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className={channel.color}>{channel.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Editable notification body */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
                    编辑通知消息文本
                  </label>
                  <textarea
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-300 font-medium h-44 resize-none leading-relaxed text-slate-750 focus:ring-2 focus:ring-indigo-50"
                    value={notifyContent}
                    onChange={(e) => setNotifyContent(e.target.value)}
                    placeholder="请输入通知文本内容..."
                  />
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex justify-between items-center pt-3 font-bold text-xs select-none border-t border-slate-100">
                <button
                  onClick={() => executeCommitArchive(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  仅归档不发送
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowConfirmCommit(false);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => executeCommitArchive(true)}
                    disabled={selectedChannels.length === 0}
                    className={`px-4.5 py-2 rounded-xl text-white font-black transition-all cursor-pointer shadow-md shadow-indigo-100 active:scale-95 ${
                      selectedChannels.length === 0
                        ? "bg-slate-300 cursor-not-allowed shadow-none"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    🚀 确认并发送通知
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Folder Child Choice Modal */}
      {showFolderChoiceModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-indigo-50/50 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <span>📂 目录节点添加选项</span>
              </h3>
              <button
                onClick={() => setShowFolderChoiceModal(null)}
                className="text-slate-400 hover:text-slate-650 text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11.5px] text-slate-500 font-bold">
              您希望在当前选定目录 <span className="text-indigo-600">"{folders.find(f => f.id === showFolderChoiceModal)?.name}"</span> 内添加什么测试资源？
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Option A: Folder */}
              <button
                onClick={() => {
                  handleAddNewFolder(showFolderChoiceModal);
                  setShowFolderChoiceModal(null);
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/20 text-center transition-all cursor-pointer group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📁</span>
                <span className="text-xs font-black text-slate-800">子模块目录</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1">快捷键: M / 1</span>
              </button>

              {/* Option B: TestCase */}
              <button
                onClick={() => {
                  handleAddTestCaseUnderFolder(showFolderChoiceModal);
                  setShowFolderChoiceModal(null);
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/20 text-center transition-all cursor-pointer group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📄</span>
                <span className="text-xs font-black text-slate-800">新测试用例</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1">快捷键: Enter / C / 2</span>
              </button>
            </div>

            <div className="text-[9.5px] text-slate-400 text-center font-semibold border-t border-slate-100 pt-3">
              提示: 直接按键盘上的 1 / 2 或字母键可快速选择，Esc 键取消
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Dynamic bottom-left controller deck for zoom, scale, fit, reset, and shortcuts popover */}
      <MindmapController
        scale={scale}
        onScaleChange={setScale}
        onFitScreen={() => setScale(85)}
        isCompact={isCompact}
        onToggleCompact={handleToggleCompact}
        totalCompletedCount={totalCompletedCount}
        totalStepsCount={totalStepsCount}
        isFullscreen={isFullscreen}
      />

      {/* Native mini toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-3 px-5 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg animate-fade-in text-[10.5px] font-bold leading-none select-none">
          <span className={`w-1.5 h-1.5 rounded-full ${toast.type === "success" ? "bg-emerald-400 animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span>{toast.message}</span>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteCaseToConfirm !== null}
        title="彻底删除测试用例"
        message={`您确定要彻底删除测试用例 "${deleteCaseToConfirm?.name}" 吗？此物理删除动作将不可恢复。`}
        confirmText="确认删除"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          if (deleteCaseToConfirm && onDeleteTestCase) {
            onDeleteTestCase(deleteCaseToConfirm.id);
            triggerToast("已成功删除测试用例！", "warning");
          }
        }}
        onCancel={() => setDeleteCaseToConfirm(null)}
      />

      <ConfirmDialog
        isOpen={deleteFolderToConfirm !== null}
        title="彻底删除目录"
        message={`您确定要彻底删除目录 "${deleteFolderToConfirm?.name}" 吗？目录下的子目录和所有测试用例都会被批量删除，此操作不可恢复。`}
        confirmText="确认删除"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          if (deleteFolderToConfirm) {
            const updated = folders.filter(f => f.id !== deleteFolderToConfirm.id);
            onUpdateFolders?.(updated);
            onSelectFolder?.("");
            triggerToast("已成功删除目录！", "warning");
          }
        }}
        onCancel={() => setDeleteFolderToConfirm(null)}
      />

    </div>
  );
}
