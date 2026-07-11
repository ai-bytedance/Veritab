/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  GitBranch,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
  Maximize2,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Bookmark,
  Share2,
  Workflow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Folder as FolderIcon,
  FileText,
  PlusCircle,
  PlayCircle,
  ShieldCheck,
  Activity,
  FolderPlus,
  Download,
  Upload,
  X,
  Edit3,
  Network,
  MoreHorizontal
} from "lucide-react";
import TestCaseTree from "./TestCaseTree";
import EditableStepsTable from "./EditableStepsTable";
import {
  TestCase,
  TestCaseGrade,
  TestCaseStatus,
  Issue,
  IssueType,
  User as SystemUser,
  DefectStatus,
  Folder as FolderType,
  ProjectTab,
  UserGroup
} from "../types";
import TestCaseDetailPanel from "./TestCaseDetailPanel";
import TestCaseCreateForm from "./TestCaseCreateForm";
import TestCaseDirectoryOverview from "./TestCaseDirectoryOverview";
import MoveCaseModal from "./MoveCaseModal";
import MoveFolderModal from "./MoveFolderModal";
import ExportDataModal from "./ExportDataModal";
import ImportTestCasesModal from "./ImportTestCasesModal";
import EditTestCaseModal from "./EditTestCaseModal";
import ConfirmDialog from "./ConfirmDialog";
import { generateCaseId } from "../lib/idUtils";
import { useTestCaseBridge } from "../features/test-cases/api/useTestCases";
import { TestCaseApiScope } from "../features/test-cases/api/types";
import ResourceAttachments from "./ResourceAttachments";
import { useDefectBridge } from "../features/defects/api/useDefects";

interface TestCaseWorkspaceProps {
  projectId: string;
  users: SystemUser[];
  currentUser?: SystemUser;
  onInvokeAI: (prompt: string) => Promise<string>;
  onTriggerWebhook: (provider: string, payload: any) => void;
  onCreateFeishuGroup?: (payload: any) => Promise<any>;
  focusedTestCaseId?: string | null;
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusIssue?: (id: string | null) => void;
  systemConfig?: any;
  onSetSidebarCollapsed?: (collapsed: boolean) => void;
  userGroups?: UserGroup[];
  apiScope: TestCaseApiScope;
}

export default function TestCaseWorkspace({
  projectId,
  users,
  currentUser,
  onInvokeAI,
  onTriggerWebhook,
  onCreateFeishuGroup,
  focusedTestCaseId,
  onNavigateToTab,
  onFocusIssue,
  systemConfig,
  onSetSidebarCollapsed,
  userGroups,
  apiScope,
}: TestCaseWorkspaceProps) {
  const remote = useTestCaseBridge(apiScope, projectId);
  const defectRemote = useDefectBridge(apiScope, projectId);
  const testCases = remote.testCases;
  const folders = remote.folders;
  const issues = [...remote.requirements, ...defectRemote.issues];
  const rawOnAddTestCase = remote.createTestCase;
  const rawOnUpdateTestCase = remote.updateTestCase;
  const rawOnDeleteTestCase = remote.deleteTestCase;
  const rawOnDeleteTestCaseBatch = remote.deleteTestCases;
  const rawOnUpdateFolders = remote.updateFolders;
  const onAddIssue = defectRemote.createIssue;
  const filteredCases = testCases.filter((tc) => tc.projectId === projectId);
  const projectFolders = folders.filter(f => f.projectId === projectId);
  const requirements = issues.filter((i) => i.projectId === projectId && i.type === IssueType.REQUIREMENT);

  const allVersions = React.useMemo(() => {
    const versions = filteredCases
      .map(tc => tc.version)
      .filter((v): v is string => !!v && v.trim() !== "");
    return Array.from(new Set(versions));
  }, [filteredCases]);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "error" | "success" | "warning" = "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const onAddTestCase = rawOnAddTestCase;
  const onUpdateTestCase = rawOnUpdateTestCase;
  const onDeleteTestCase = rawOnDeleteTestCase;

  const onDeleteTestCaseBatch = (ids: string[]) => {
    rawOnDeleteTestCaseBatch(ids);
  };

  const onUpdateFolders = (updatedFolders: FolderType[]) => {
    rawOnUpdateFolders(updatedFolders);
  };

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(null);

  // 批量操作与节点移动状态
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [pickerCaseIds, setPickerCaseIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const handleOpenFolderMovePicker = (folderId: string) => {
    setMovingFolderId(folderId);
  };

  const handleExecuteMoveFolder = (
    folderId: string,
    targetParentId: string | undefined,
    moveType: "both" | "cases_only" = "both",
    selectedCaseIdsToMove?: string[]
  ) => {
    const targetFolder = folders.find(f => f.id === folderId);
    const oldParentId = targetFolder?.parentId;

    if (selectedCaseIdsToMove) {
      if (moveType === "cases_only") {
        filteredCases.forEach(tc => {
          if (selectedCaseIdsToMove.includes(tc.id)) {
            onUpdateTestCase({
              ...tc,
              folderId: targetParentId,
              updatedAt: new Date().toISOString(),
            });
          }
        });
      } else {
        const casesDirectlyInFolder = filteredCases.filter(tc => tc.folderId === folderId);
        casesDirectlyInFolder.forEach(tc => {
          if (!selectedCaseIdsToMove.includes(tc.id)) {
            onUpdateTestCase({
              ...tc,
              folderId: oldParentId,
              updatedAt: new Date().toISOString(),
            });
          }
        });

        if (folderId === targetParentId) {
          alert("目录无法移动至自身内部！");
          return;
        }
        const getAllDescendantIds = (fid: string): string[] => {
          const children = folders.filter(f => f.parentId === fid);
          let ids = children.map(c => c.id);
          children.forEach(c => {
            ids = [...ids, ...getAllDescendantIds(c.id)];
          });
          return ids;
        };
        if (targetParentId && getAllDescendantIds(folderId).includes(targetParentId)) {
          alert("目录无法移动到自己的子孙目录中！");
          return;
        }

        const nextFolders = folders.map(f => {
          if (f.id === folderId) {
            return { ...f, parentId: targetParentId };
          }
          return f;
        });
        onUpdateFolders(nextFolders);
      }
    } else {
      if (moveType === "cases_only") {
        const getAllDescendantIds = (fid: string): string[] => {
          const children = folders.filter(f => f.parentId === fid);
          let ids = children.map(c => c.id);
          children.forEach(c => {
            ids = [...ids, ...getAllDescendantIds(c.id)];
          });
          return ids;
        };
        const descendantIds = getAllDescendantIds(folderId);
        const allFolderIdsToMoveFrom = [folderId, ...descendantIds];

        filteredCases.forEach(tc => {
          if (tc.folderId && allFolderIdsToMoveFrom.includes(tc.folderId)) {
            onUpdateTestCase({
              ...tc,
              folderId: targetParentId,
              updatedAt: new Date().toISOString(),
            });
          }
        });
      } else {
        if (folderId === targetParentId) {
          alert("目录无法移动至自身内部！");
          return;
        }
        const getAllDescendantIds = (fid: string): string[] => {
          const children = folders.filter(f => f.parentId === fid);
          let ids = children.map(c => c.id);
          children.forEach(c => {
            ids = [...ids, ...getAllDescendantIds(c.id)];
          });
          return ids;
        };
        if (targetParentId && getAllDescendantIds(folderId).includes(targetParentId)) {
          alert("目录无法移动到自己的子孙目录中！");
          return;
        }

        const nextFolders = folders.map(f => {
          if (f.id === folderId) {
            return { ...f, parentId: targetParentId };
          }
          return f;
        });
        onUpdateFolders(nextFolders);
      }
    }
    setMovingFolderId(null);
  };

  const handleToggleCaseSelect = (caseId: string) => {
    setSelectedCaseIds(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const handleBatchToggleCases = (caseIds: string[], select: boolean) => {
    setSelectedCaseIds(prev => {
      if (select) {
        const next = [...prev];
        caseIds.forEach(id => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      } else {
        return prev.filter(id => !caseIds.includes(id));
      }
    });
  };

  const handleSelectAll = () => {
    const visibleCaseIds = filteredCasesBySearch.map(tc => tc.id);
    const allSelected = visibleCaseIds.length > 0 && visibleCaseIds.every(id => selectedCaseIds.includes(id));
    if (allSelected) {
      setSelectedCaseIds(prev => prev.filter(id => !visibleCaseIds.includes(id)));
    } else {
      setSelectedCaseIds(prev => {
        const unique = new Set([...prev, ...visibleCaseIds]);
        return Array.from(unique);
      });
    }
  };

  const handleOpenMoveSingle = (caseId: string) => {
    setPickerCaseIds([caseId]);
    setIsMoveModalOpen(true);
  };

  const handleOpenMoveBatch = () => {
    if (selectedCaseIds.length === 0) return;
    setPickerCaseIds(selectedCaseIds);
    setIsMoveModalOpen(true);
  };

  const handleExecuteMoveCases = (ids: string[], folderId: string | undefined, linkedRequirementId?: string) => {
    ids.forEach(id => {
      const tc = testCases.find(t => t.id === id);
      if (tc) {
        const folderName = folderId ? (folders.find(f => f.id === folderId)?.name || '未分类') : '未分类';
        const reqName = linkedRequirementId ? (issues.find(r => r.id === linkedRequirementId)?.title || '无关联需求') : '无关联需求';

        const currentUserDetail = currentUser || users[0] || { id: "u-sys", nickname: "管理员" };
        const newLog = {
          id: `log-move-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: currentUserDetail.id,
          userName: currentUserDetail.nickname,
          action: "批量调整归属/需求关联",
          oldValue: "批量变更",
          newValue: `归属至: ${folderName}, 关联至: ${reqName}`,
          createdAt: new Date().toISOString()
        };

        onUpdateTestCase({
          ...tc,
          folderId,
          linkedRequirementId: linkedRequirementId === "" ? undefined : (linkedRequirementId || tc.linkedRequirementId),
          historyLogs: [newLog, ...(tc.historyLogs || [])]
        });
      }
    });
    setSelectedCaseIds([]);
    setIsBatchMode(false);
  };

  const handleExecuteBatchStatusChange = (status: TestCaseStatus) => {
    selectedCaseIds.forEach(id => {
      const tc = testCases.find(t => t.id === id);
      if (tc) {
        const currentUserDetail = currentUser || users[0] || { id: "u-sys", nickname: "管理员" };
        const newLog = {
          id: `log-batch-status-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: currentUserDetail.id,
          userName: currentUserDetail.nickname,
          action: "批量更新执行状态",
          oldValue: String(tc.status || ""),
          newValue: String(status),
          createdAt: new Date().toISOString()
        };

        onUpdateTestCase({
          ...tc,
          status,
          historyLogs: [newLog, ...(tc.historyLogs || [])]
        });
      }
    });
    setSelectedCaseIds([]);
    setIsBatchMode(false);
  };

  const handleExecuteBatchDelete = () => {
    setShowBatchDeleteConfirm(true);
  };

  const performExecuteBatchDelete = () => {
    if (onDeleteTestCaseBatch) {
      onDeleteTestCaseBatch(selectedCaseIds);
    } else {
      selectedCaseIds.forEach(id => onDeleteTestCase(id));
    }
    setSelectedCaseIds([]);
    setIsBatchMode(false);
  };

  React.useEffect(() => {
    if (focusedTestCaseId) {
      setActiveCaseId(focusedTestCaseId);
      setActiveFolderId(null);
      setActiveRequirementId(null);
      if (onFocusIssue) {
        onFocusIssue(null);
      }
    }
  }, [focusedTestCaseId, onFocusIssue]);

  const [editMode, setEditMode] = useState<"form" | "markdown" | "xmind">("form");
  const [isXMindFullscreen, setIsXMindFullscreen] = useState<boolean>(true);

  React.useEffect(() => {
    if (editMode === "xmind") {
      onSetSidebarCollapsed?.(true);
      if (isXMindFullscreen) {
        setIsTreeCollapsed(true);
      } else {
        setIsTreeCollapsed(false);
      }
    } else {
      onSetSidebarCollapsed?.(false);
      setIsTreeCollapsed(false);
    }
  }, [editMode, isXMindFullscreen, onSetSidebarCollapsed]);
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [newFolderName, setNewFolderName] = useState("");
  const [isAddingFolder, setIsAddingFolder] = useState<string | boolean>(false);

  // Search filter
  const filteredCasesBySearch = filteredCases.filter(tc => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return tc.name.toLowerCase().includes(query) ||
           (tc.steps && tc.steps.toLowerCase().includes(query)) ||
           (tc.expectedResult && tc.expectedResult.toLowerCase().includes(query)) ||
           (tc.precondition && tc.precondition.toLowerCase().includes(query));
  });

  const testCasesToExport = React.useMemo(() => {
    if (selectedCaseIds.length > 0) {
      return filteredCases.filter(tc => selectedCaseIds.includes(tc.id));
    }
    return filteredCasesBySearch;
  }, [selectedCaseIds, filteredCases, filteredCasesBySearch]);

  const foldersWithMatches = React.useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const matchedFolderIds = new Set<string>();
    filteredCasesBySearch.forEach(tc => {
      if (tc.folderId) {
        matchedFolderIds.add(tc.folderId);
        let parent = folders.find(f => f.id === tc.folderId);
        while (parent) {
          matchedFolderIds.add(parent.id);
          parent = parent.parentId ? folders.find(f => f.id === parent.parentId) : undefined;
        }
      }
    });
    return matchedFolderIds;
  }, [filteredCasesBySearch, folders, searchQuery]);

  const activeExpandedNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return expandedNodes;
    const autoExpanded = { ...expandedNodes };
    foldersWithMatches.forEach(fid => {
      autoExpanded[fid] = true;
    });
    autoExpanded["unplanned-node"] = true;
    autoExpanded["requirement-view-node"] = true;
    return autoExpanded;
  }, [expandedNodes, foldersWithMatches, searchQuery]);

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState<TestCaseGrade>(TestCaseGrade.P1);
  const [newPre, setNewPre] = useState("");
  const [newSteps, setNewSteps] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newActual, setNewActual] = useState("");
  const [newLinkedReqId, setNewLinkedReqId] = useState("");
  const [newFolderId, setNewFolderId] = useState<string | undefined>(undefined);
  const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);

  const activeCase = filteredCases.find((tc) => tc.id === activeCaseId);
  const activeUsers = users.filter((u) => u.status === "active");

  const [aiGeneratingReqId, setAiGeneratingReqId] = useState<string | null>(null);

  const handleAIGenerateForReq = async (req: Issue) => {
    setAiGeneratingReqId(req.id);
    try {
      const basePrompt = systemConfig?.aiPromptTemplate || `你是一个专业的敏捷质量保障专家。请阅读业务需求规格说明，全自动推断、派生出一组能够完整覆盖上述特征（并且探索边界情况）的测试用例。`;
      const prompt = `${basePrompt}
请针对以下【业务需求：${req.title}】的 Markdown 规格说明进行生成：
---
${req.content}
---
约束配置要求：
- 请严格输出 JSON 数组格式（不需要包裹\`\`\`json\`\`\`标记）。
- 每个对象严格要求以下字段结构：name, grade(例如: 最高-P0, 高-P1, 中-P2), precondition, steps, expectedResult。
`;
      const response = await onInvokeAI(prompt);
      let cleaned = response.replace(/`{3}(json)?/g, "").trim();
      const list = JSON.parse(cleaned) as any[];

      list.forEach((item, idx) => {
        let finalGrade = TestCaseGrade.P1;
        if (item.grade && item.grade.includes("P0")) finalGrade = TestCaseGrade.P0;
        else if (item.grade && item.grade.includes("P2")) finalGrade = TestCaseGrade.P2;
        else if (item.grade && item.grade.includes("P3")) finalGrade = TestCaseGrade.P3;

        const created: TestCase = {
          id: generateCaseId(),
          projectId,
          name: item.name || "AI自动生成用例",
          grade: finalGrade,
          precondition: item.precondition || "根据AI默认推理",
          steps: item.steps || "1. 执行AI推理\n2. 观察最终结果",
          expectedResult: item.expectedResult || "符合预期",
          status: TestCaseStatus.UNTESTED,
          linkedRequirementId: req.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onAddTestCase(created);
      });

      setExpandedNodes(prev => ({ ...prev, [req.id]: true }));
      alert(`已经成功针对需求「${req.title}」全自动派生并且绑定了 ${list.length} 个 AI 测试用例！`);
    } catch (e: any) {
      alert("AI 派生测试用例遇到异常：" + e.message);
    } finally {
      setAiGeneratingReqId(null);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewName("");
    setNewGrade(TestCaseGrade.P1);
    setNewPre("");
    setNewSteps("");
    setNewExpected("");
    setNewActual("");
    setNewLinkedReqId("");
    setNewFolderId(undefined);
    setNewAssigneeId(undefined);
  };

  const handleStartCreateForReq = (reqId: string) => {
    setIsCreating(true);
    setNewName("");
    setNewGrade(TestCaseGrade.P1);
    setNewPre("");
    setNewSteps("");
    setNewExpected("");
    setNewActual("");
    setNewLinkedReqId(reqId);
    setNewFolderId(undefined);
    setNewAssigneeId(undefined);
  };

  const handleStartCreateForFolder = (folderId: string | undefined) => {
    setIsCreating(true);
    setNewName("");
    setNewGrade(TestCaseGrade.P1);
    setNewPre("");
    setNewSteps("");
    setNewExpected("");
    setNewActual("");
    setNewFolderId(folderId === "unplanned" || folderId === "req-root" || folderId === "all" ? undefined : folderId);
    setNewLinkedReqId("");
    setNewAssigneeId(undefined);
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const parentId = typeof isAddingFolder === "string" && isAddingFolder !== "root" ? isAddingFolder : undefined;
    const newFolderId = `folder-${Date.now()}`;
    const newFolder: FolderType = {
      id: newFolderId,
      projectId,
      name: newFolderName,
      parentId,
      createdAt: new Date().toISOString(),
    };
    onUpdateFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsAddingFolder(false);
    if (parentId) {
      setExpandedNodes(prev => ({ ...prev, [parentId]: true }));
    }
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    const updatedFolders = folders.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f);
    onUpdateFolders(updatedFolders);
  };

  const handleDeleteFolder = (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    setFolderToDelete(folder);
  };

  const performDeleteFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Helper to get all descendant folder IDs
    const getAllDescendantIds = (fid: string): string[] => {
      const children = folders.filter(f => f.parentId === fid);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getAllDescendantIds(c.id)];
      });
      return ids;
    };

    const descendantIds = getAllDescendantIds(folderId);
    const allFolderIdsToDelete = [folderId, ...descendantIds];
    const casesToDelete = testCases.filter(tc => tc.folderId && allFolderIdsToDelete.includes(tc.folderId));

    // Capture IDs before state mutation for batch deletion
    const capturedCaseIds = casesToDelete.map(c => c.id);

    // 1. Delete folders
    const nextFolders = folders.filter(f => !allFolderIdsToDelete.includes(f.id));
    onUpdateFolders(nextFolders);

    // 2. Delete test cases
    if (onDeleteTestCaseBatch && capturedCaseIds.length > 0) {
      onDeleteTestCaseBatch(capturedCaseIds);
    } else if (capturedCaseIds.length > 0) {
      capturedCaseIds.forEach(cid => {
        onDeleteTestCase(cid);
      });
    }

    if (activeCaseId && (allFolderIdsToDelete.includes(activeCaseId) || capturedCaseIds.includes(activeCaseId))) {
      setActiveCaseId(null);
    }

    setFolderToDelete(null);
  };

  const getFolderDeletionDetails = (folderId: string) => {
    const getAllDescendantIds = (fid: string): string[] => {
      const children = folders.filter(f => f.parentId === fid);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getAllDescendantIds(c.id)];
      });
      return ids;
    };

    const descendantIds = getAllDescendantIds(folderId);
    const allFolderIdsToDelete = [folderId, ...descendantIds];
    const casesToDelete = testCases.filter(tc => tc.folderId && allFolderIdsToDelete.includes(tc.folderId));

    return {
      subFoldersCount: descendantIds.length,
      casesCount: casesToDelete.length,
    };
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleMoveCase = (caseId: string, folderId: string | undefined, linkedRequirementId?: string) => {
    const tc = testCases.find(t => t.id === caseId);
    if (tc) {
      onUpdateTestCase({
        ...tc,
        folderId,
        linkedRequirementId: linkedRequirementId === "" ? undefined : (linkedRequirementId || tc.linkedRequirementId),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleCreateSave = (createdData: Partial<TestCase>) => {
    const created: TestCase = {
      ...createdData,
      id: generateCaseId(),
      projectId: projectId || "p1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: TestCaseStatus.UNTESTED,
      name: createdData.name || "未命名",
      grade: createdData.grade || TestCaseGrade.P1,
      precondition: createdData.precondition || "",
      steps: createdData.steps || "",
      expectedResult: createdData.expectedResult || "",
    };

    onAddTestCase(created);
    setIsCreating(false);

    if (systemConfig?.feishuConfig?.enabled && systemConfig?.feishuConfig?.notifyOnCaseCreate) {
      onTriggerWebhook("feishu", {
        title: `🧪 录入通知: ${created.name}`,
        type: "TestCaseCreated",
        content: `用例等级: ${created.grade}\n前置条件: ${created.precondition?.substring(0, 100)}\n测试步骤: ${created.steps?.substring(0, 150)}...\n预期结果: ${created.expectedResult?.substring(0, 100)}`,
        link: window.location.href,
        isAutoTrigger: true,
      });
    }
  };

  const handleInterceptAddTestCase = (tc: TestCase) => {
    onAddTestCase(tc);
  };

  return (
    <div className="space-y-6" id="testcases-workspace-wrapper">
      {(remote.isLoading || remote.isSaving || remote.error || defectRemote.error) && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-bold ${remote.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-indigo-100 bg-indigo-50 text-indigo-700"}`}>
          {remote.error
            ? `服务端同步失败：${remote.error instanceof Error ? remote.error.message : "未知错误"}`
            : remote.isSaving
              ? "正在保存测试用例与脑图结构…"
              : "正在加载测试用例…"}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-12">
        {!isTreeCollapsed && (
          <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col min-h-[600px] animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 relative">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest select-none">用例目录树</span>

              <div className="flex items-center gap-1.5 relative">
                <button
                  type="button"
                  onClick={() => setIsTreeCollapsed(true)}
                  className="p-1 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 text-slate-500 hover:text-indigo-650 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                  title="收起用例目录树"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-1 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 text-slate-500 hover:text-indigo-650 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                  title="更多数据与目录功能"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
                </button>

                {isMoreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-32 bg-white border border-slate-150/80 rounded-xl shadow-md p-1 z-40 animate-fade-in flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsImporting(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-indigo-750 hover:bg-indigo-50/50 rounded-lg transition-colors text-left w-full cursor-pointer"
                      >
                        <Upload className="h-3 w-3 text-slate-400 shrink-0" />
                        导入用例
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExporting(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-indigo-750 hover:bg-indigo-50/50 rounded-lg transition-colors text-left w-full cursor-pointer"
                      >
                        <Download className="h-3 w-3 text-slate-400 shrink-0" />
                        导出数据
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>





          {isAddingFolder && (
            <div className="mb-4 p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-indigo-700">
                <FolderPlus className="h-3.5 w-3.5" />
                <span className="text-[11px] font-extrabold uppercase tracking-tight">新建目录节点</span>
              </div>
              <input
                autoFocus
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                placeholder="请输入极简目录描述..."
                value={newFolderName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddFolder();
                  if (e.key === 'Escape') setIsAddingFolder(false);
                }}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsAddingFolder(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">取消</button>
                <button onClick={handleAddFolder} className="text-[10px] font-bold bg-indigo-600 text-white rounded-lg px-4 py-1.5 shadow-sm shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">确认创建</button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar scroll-smooth pb-36">
            <TestCaseTree
              folders={projectFolders}
              testCases={filteredCasesBySearch}
              activeCaseId={activeCaseId}
              activeFolderId={activeFolderId}
              activeRequirementId={activeRequirementId}
              expandedNodes={activeExpandedNodes}
              onToggleNode={toggleNode}
              onSelectCase={(id) => {
                setActiveCaseId(id);
                const tc = filteredCases.find(c => c.id === id);
                if (tc) {
                  if (tc.folderId) {
                    setActiveFolderId(tc.folderId);
                    setActiveRequirementId(null);
                  } else if (tc.linkedRequirementId) {
                    setActiveRequirementId(tc.linkedRequirementId);
                    setActiveFolderId(null);
                  }
                }
                setIsCreating(false);
              }}
              onSelectFolder={(id) => {
                setActiveFolderId(id);
                setActiveCaseId(null);
                setActiveRequirementId(null);
                setIsCreating(false);
              }}
              onSelectReqFolder={(id) => {
                setActiveRequirementId(id);
                setActiveCaseId(null);
                setActiveFolderId(null);
                setIsCreating(false);
              }}
              onDeleteCase={onDeleteTestCase}
              onAddCaseToFolder={handleStartCreateForFolder}
              onAddFolder={(pid) => {
                setIsAddingFolder(pid === undefined ? "root" : pid);
                setActiveCaseId(null);
                setIsCreating(false);
              }}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
              onMoveCase={handleMoveCase}
              onMoveFolder={handleExecuteMoveFolder}
              onOpenFolderMovePicker={handleOpenFolderMovePicker}
              requirements={requirements}
              onAddCaseToReq={handleStartCreateForReq}
              isBatchMode={isBatchMode}
              selectedCaseIds={selectedCaseIds}
              onToggleCaseSelect={handleToggleCaseSelect}
              onBatchToggleCases={handleBatchToggleCases}
              onOpenMovePicker={handleOpenMoveSingle}
            />
          </div>
        </div>
        )}

        <div className={`${isTreeCollapsed ? "lg:col-span-12" : "lg:col-span-9"} min-w-0 overflow-hidden`}>
          {isCreating ? (
            <TestCaseCreateForm
              projectId={projectId}
              folders={folders}
              requirements={requirements}
              activeUsers={activeUsers}
              activeFolderId={newFolderId || null}
              activeRequirementId={newLinkedReqId || null}
              onSave={handleCreateSave}
              onCancel={() => setIsCreating(false)}
              allVersions={allVersions}
            />
          ) : (
            <TestCaseDirectoryOverview
              projectId={projectId}
              activeFolderId={activeFolderId}
              activeRequirementId={activeRequirementId}
              folders={folders}
              requirements={requirements}
              issues={issues}
              testCases={filteredCasesBySearch}
              activeUsers={activeUsers}
              userGroups={userGroups}
              editMode={editMode}
              setEditMode={(mode) => {
                setEditMode(mode);
                setActiveCaseId(null);
              }}
              isTreeCollapsed={isTreeCollapsed}
              setIsTreeCollapsed={setIsTreeCollapsed}
              onUpdateTestCase={onUpdateTestCase}
              onEditTestCase={(tc) => setEditingTestCase(tc)}
              isBatchMode={isBatchMode}
              selectedCaseIds={selectedCaseIds}
              onToggleCaseSelect={handleToggleCaseSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={() => setSelectedCaseIds([])}
              onOpenMoveBatch={handleOpenMoveBatch}
              onExecuteBatchStatusChange={handleExecuteBatchStatusChange}
              onExecuteBatchDelete={handleExecuteBatchDelete}
              onDeleteTestCase={onDeleteTestCase}
              onCreateTestCase={handleStartCreate}
              onAddTestCase={handleInterceptAddTestCase}
              onUpdateFolders={onUpdateFolders}
              onTriggerWebhook={onTriggerWebhook}
              activeCase={activeCase}
              onXMindFullscreenChange={setIsXMindFullscreen}
              onNavigateToTab={onNavigateToTab}
              onFocusIssue={onFocusIssue}
              onSelectFolder={(id) => {
                setActiveFolderId(id);
                setActiveCaseId(null);
                setActiveRequirementId(null);
              }}
              onSelectReqFolder={(id) => {
                setActiveRequirementId(id);
                setActiveCaseId(null);
                setActiveFolderId(null);
              }}
              onSelectTestCase={(id) => {
                setActiveCaseId(id);
                const tc = filteredCases.find(c => c.id === id);
                if (tc) {
                  if (tc.folderId) {
                    setActiveFolderId(tc.folderId);
                    setActiveRequirementId(null);
                  } else if (tc.linkedRequirementId) {
                    setActiveRequirementId(tc.linkedRequirementId);
                    setActiveFolderId(null);
                  }
                }
                setIsCreating(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Test Case Detail Slide-over Drawer Panel */}
      {activeCaseId && activeCase && editMode !== "xmind" && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-3xs z-[100] transition-opacity duration-300 animate-fade-in"
            onClick={() => setActiveCaseId(null)}
          />
          {/* Drawer Body */}
          <div className="fixed top-0 right-0 h-full w-full max-w-[85vw] md:max-w-4xl lg:max-w-5xl bg-white border-l border-slate-200 shadow-2xl z-[101] flex flex-col overflow-hidden transition-transform duration-300 transform translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-sans">
                  用例详情与工作台
                </span>
              </div>
              <button
                onClick={() => setActiveCaseId(null)}
                className="p-1 hover:bg-slate-150 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none focus:outline-none"
                title="关闭用例面板"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Detail Panel Container */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4"><ResourceAttachments scope={apiScope} resourceType="TEST_CASE" resourceId={activeCase.id} /></div>
              <TestCaseDetailPanel
                projectId={projectId}
                activeCase={activeCase}
                requirements={requirements}
                folders={folders}
                issues={issues}
                activeUsers={activeUsers}
                currentUser={currentUser}
                userGroups={userGroups}
                editMode={editMode}
                onUpdateTestCase={onUpdateTestCase}
                onAddIssue={onAddIssue}
                onInvokeAI={onInvokeAI}
                onTriggerWebhook={onTriggerWebhook}
                onCreateFeishuGroup={onCreateFeishuGroup}
                onNavigateToTab={onNavigateToTab}
                onFocusIssue={onFocusIssue}
                activeFolderId={activeFolderId}
                activeRequirementId={activeRequirementId}
                testCases={filteredCases}
                onSelectTestCase={(id) => {
                  setActiveCaseId(id);
                }}
                onSelectFolder={(id) => {
                  setActiveFolderId(id);
                  setActiveCaseId(null);
                }}
                onSelectReqFolder={(id) => {
                  setActiveRequirementId(id);
                  setActiveCaseId(null);
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Directory Deletion Safe Custom Modal */}
      {folderToDelete && (() => {
        const details = getFolderDeletionDetails(folderToDelete.id);
        const hasWarning = details.subFoldersCount > 0 || details.casesCount > 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
            <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-rose-50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              {/* Safety Red Accent Line */}
              <div className="h-1.5 w-full bg-rose-500" />

              <div className="p-4.5 border-b border-rose-100 bg-rose-50/35 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">彻底删除目录确认</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-bold">⚠️ 删除后该节点下的所有数据不可恢复</p>
                  </div>
                </div>
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-3.5">
                <div className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  您确定要移除自定义创建的级联文件夹吗？
                </div>

                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-705">
                    <span className="flex items-center gap-2 font-black text-slate-400 text-[10px]">
                      目标目录名称
                    </span>
                    <span className="font-extrabold text-slate-800 truncate max-w-[150px]">{folderToDelete.name}</span>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="flex items-center justify-between text-[11px] text-slate-700">
                    <span className="flex items-center gap-2 font-medium">
                      <FolderIcon className="h-3.5 w-3.5 text-indigo-400" />
                      级联子目录数量
                    </span>
                    <span className="font-extrabold text-indigo-650 font-mono bg-indigo-50/80 px-2 py-0.5 rounded-full text-[10px]">{details.subFoldersCount} 个</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-700">
                    <span className="flex items-center gap-2 font-medium">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      包含的测试用例数
                    </span>
                    <span className="font-extrabold text-indigo-650 font-mono bg-indigo-50/80 px-2 py-0.5 rounded-full text-[10px]">{details.casesCount} 个</span>
                  </div>
                </div>

                {hasWarning && (
                  <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100/40 text-[9px] text-amber-700 font-semibold leading-relaxed">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>该目录下包含子目录或测试用例，删除动作将同时物理清除此节点下的全部关联用例项！</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50/60 border-t border-slate-100/80 flex justify-end gap-2 text-[11px]">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="px-3.5 py-2 font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => performDeleteFolder(folderToDelete.id)}
                  className="px-4 py-2 font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-100 transition-all active:scale-[0.98] cursor-pointer"
                >
                  确认彻底删除
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <MoveCaseModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        caseIds={pickerCaseIds}
        testCases={filteredCases}
        folders={projectFolders}
        requirements={requirements}
        onConfirmMove={handleExecuteMoveCases}
      />

      {movingFolderId && (
        <MoveFolderModal
          isOpen={!!movingFolderId}
          onClose={() => setMovingFolderId(null)}
          folderId={movingFolderId}
          folders={projectFolders}
          testCases={filteredCases}
          onConfirmMove={handleExecuteMoveFolder}
        />
      )}

      <ExportDataModal
        isOpen={isExporting}
        onClose={() => setIsExporting(false)}
        dataType="testcase"
        dataList={testCasesToExport}
        fullDataList={filteredCases}
        users={users}
        requirements={requirements}
      />

      {isImporting && (
        <ImportTestCasesModal
          projectId={projectId}
          activeUsers={users.filter(u => u.status === "active")}
          folders={projectFolders}
          currentFolderId={activeFolderId}
          currentUser={currentUser}
          onClose={() => setIsImporting(false)}
          onImport={(imported) => {
            imported.forEach(tc => onAddTestCase(tc));
            setIsImporting(false);
          }}
        />
      )}

      {editingTestCase && (
        <EditTestCaseModal
          projectId={projectId}
          activeCase={editingTestCase}
          requirements={requirements}
          folders={projectFolders}
          activeUsers={users}
          allVersions={allVersions}
          onClose={() => setEditingTestCase(null)}
          onSave={onUpdateTestCase}
        />
      )}

      <ConfirmDialog
        isOpen={showBatchDeleteConfirm}
        title="批量删除测试用例"
        message={`您确定要批量彻底删除选中的 ${selectedCaseIds.length} 个测试用例吗？此物理删除动作将不可恢复。`}
        confirmText="确认删除"
        cancelText="取消"
        type="danger"
        onConfirm={performExecuteBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl bg-amber-50 border-amber-200 text-amber-800 animate-slide-left">
          <span className="text-xs font-bold leading-none">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
