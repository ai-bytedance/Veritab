/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  User,
  Plus,
  Trash2,
  AlertOctagon,
  Download,
  SlidersHorizontal,
  Filter,
  X,
  ChevronDown,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckSquare,
  AlertTriangle,
  Zap,
  CheckCircle2,
  BookmarkCheck,
  FileText,
  Edit3,
  Lock,
} from "lucide-react";
import {
  Issue,
  IssueType,
  DefectStatus,
  DefectSeverity,
  User as SystemUser,
  TestCase,
  DefectComment,
  ProjectTab,
  UserGroup,
} from "../types";
import CreateDefectModal from "./CreateDefectModal";
import EditDefectModal from "./EditDefectModal";
import DefectDetailView from "./DefectDetailView";
import ExportDataModal from "./ExportDataModal";
import ImportDefectsModal from "./ImportDefectsModal";
import Pagination from "./Pagination";
import { formatReqId, formatDefectId, formatCaseId } from "../lib/idUtils";
import TraceabilityListModal from "./TraceabilityListModal";
import ConfirmDialog from "./ConfirmDialog";
import CustomSelect from "./CustomSelect";
import { severityToApi, statusToApi, useDefectBridge } from "../features/defects/api/useDefects";
import { DefectApiScope } from "../features/defects/api/types";
import ResourceAttachments from "./ResourceAttachments";
import { useRequirementBridge } from "../features/requirements/api/useRequirements";
import { useTestCaseBridge } from "../features/test-cases/api/useTestCases";

const formatDateToSeconds = (dateVal: string | number | Date) => {
  if (!dateVal) return "暂无";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "暂无";
  const pad = (num: number) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

interface DefectsBoardProps {
  projectId: string;
  users: SystemUser[];
  currentUser: SystemUser;
  onTriggerWebhook: (provider: string, payload: any) => void;
  onInvokeAI?: (prompt: string) => Promise<string>;
  onCreateFeishuGroup?: (payload: any) => Promise<any>;
  onNavigateToTab?: (tab: any) => void;
  focusedDefectId?: string | null;
  onFocusDefect?: (id: string | null) => void;
  systemConfig?: any;
  userGroups?: UserGroup[];
  apiScope: DefectApiScope;
}

export default function DefectsBoard({
  projectId,
  users,
  currentUser,
  onTriggerWebhook,
  onCreateFeishuGroup,
  focusedDefectId,
  onFocusDefect,
  systemConfig,
  onNavigateToTab,
  userGroups = [],
  apiScope,
}: DefectsBoardProps) {
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);

  const showToast = (message: string, type: "error" | "success" | "warning" = "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const safeAddIssue = (issue: Issue) => void remote.createIssue(issue);

  const safeUpdateIssue = (issue: Issue) => {
    void remote.updateIssue(issue);
  };

  const safeDeleteIssue = (id: string) => {
    void remote.deleteIssue(id);
  };
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<
    DefectStatus | "ALL"
  >("ALL");
  const [selectedCreatorId, setSelectedCreatorId] =
    React.useState<string>("ALL");
  const [selectedAssigneeId, setSelectedAssigneeId] =
    React.useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = React.useState<
    DefectSeverity | "ALL"
  >("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] =
    React.useState<boolean>(false);

  const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);

  // Sync focused ID from parent
  React.useEffect(() => {
    if (
      focusedDefectId &&
      filteredDefects.some((d) => d.id === focusedDefectId)
    ) {
      setSelectedIssueId(focusedDefectId);
      setIsDrawerOpen(true);
      if (onFocusDefect) {
        // Clear it after jump so it doesn't sticky if user clicks elsewhere
        setTimeout(() => onFocusDefect(null), 100);
      }
    }
  }, [focusedDefectId, projectId]);

  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingDefect, setEditingDefect] = useState<Issue | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Deletion confirm states
  const [deleteSingleIssueId, setDeleteSingleIssueId] = useState<string | null>(null);
  const [isDeleteSingleConfirmOpen, setIsDeleteSingleConfirmOpen] = useState(false);

  // Traceability List Modal states
  const [traceabilityState, setTraceabilityState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    testCases: TestCase[];
    issues: Issue[];
    issueId?: string;
  }>({
    isOpen: false,
    title: "",
    subtitle: "",
    testCases: [],
    issues: [],
  });

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const remote = useDefectBridge(apiScope, projectId, {
    limit: pageSize,
    page: currentPage,
    q: searchQuery.trim() || undefined,
    status: selectedStatus !== "ALL" ? statusToApi[selectedStatus] : undefined,
    severity: selectedSeverity !== "ALL" ? severityToApi[selectedSeverity] : undefined,
    creatorId: selectedCreatorId !== "ALL" ? selectedCreatorId : undefined,
    assigneeId: selectedAssigneeId !== "ALL" ? selectedAssigneeId : undefined,
  });
  const requirementRemote = useRequirementBridge(apiScope, projectId);
  const testCaseRemote = useTestCaseBridge(apiScope, projectId);
  const issues = [...requirementRemote.issues, ...remote.issues];
  const testCases = testCaseRemote.testCases;
  const onUpdateTestCase = testCaseRemote.updateTestCase;
  const onAddIssue = remote.createIssue;
  const onUpdateIssue = remote.updateIssue;
  const filteredDefects = issues.filter(
    (issue) => issue.projectId === projectId && issue.type === IssueType.DEFECT,
  );

  React.useEffect(() => {
    if (remote.error) {
      showToast(remote.error instanceof Error ? remote.error.message : "缺陷服务请求失败", "error");
    }
  }, [remote.error]);

  const activeIssue = filteredDefects.find((i) => i.id === selectedIssueId);
  const activeUsers = users.filter((u) => u.status === "active");
  const requirements = issues.filter(
    (i) => i.projectId === projectId && i.type === IssueType.REQUIREMENT,
  );

  // Reset pagination when search or status filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedStatus,
    selectedCreatorId,
    selectedAssigneeId,
    selectedSeverity,
  ]);

  const handleToggleLinkedCase = (caseId: string) => {
    if (!activeIssue) return;
    const currentList = activeIssue.linkToTestCases || [];
    const isAdding = !currentList.includes(caseId);
    const updated = isAdding
      ? [...currentList, caseId]
      : currentList.filter((id) => id !== caseId);

    const tc = testCases.find((t) => t.id === caseId);
    const tcName = tc ? tc.name : caseId;

    const newLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || "system",
      userName: currentUser?.nickname || "管理员",
      action: isAdding ? "关联了测试用例" : "解除了测试用例关联",
      oldValue: isAdding ? "未关联" : tcName,
      newValue: isAdding ? tcName : "已解除",
      createdAt: new Date().toISOString(),
    };

    onUpdateIssue({
      ...activeIssue,
      linkToTestCases: updated,
      historyLogs: [newLog, ...(activeIssue.historyLogs || [])],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUnbindTestCase = (caseId: string) => {
    const issueId = traceabilityState.issueId;
    if (!issueId) return;

    const defect = issues.find((i) => i.id === issueId);
    if (defect) {
      const updatedLinkToTestCases = (defect.linkToTestCases || []).filter((id) => id !== caseId);
      const tc = testCases.find((t) => t.id === caseId);
      const tcName = tc ? tc.name : caseId;
      const newLog = {
        id: `log-${Date.now()}`,
        userId: currentUser?.id || "system",
        userName: currentUser?.nickname || "管理员",
        action: "解除了测试用例关联",
        oldValue: tcName,
        newValue: "已解除",
        createdAt: new Date().toISOString(),
      };

      onUpdateIssue({
        ...defect,
        linkToTestCases: updatedLinkToTestCases,
        historyLogs: [newLog, ...(defect.historyLogs || [])],
        updatedAt: new Date().toISOString(),
      });

      setTraceabilityState((prev) => ({
        ...prev,
        testCases: prev.testCases.filter((tc) => tc.id !== caseId),
      }));
    }

    const tc = testCases.find((t) => t.id === caseId);
    if (tc && tc.linkedDefectId === issueId) {
      onUpdateTestCase({
          ...tc,
          linkedDefectId: undefined,
          updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleUpdateStatus = (status: DefectStatus) => {
    if (!activeIssue) return;
    if (activeIssue.defectStatus === status) return;


    const currentStatus = activeIssue.defectStatus || DefectStatus.NEW;

    const newLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || "system",
      userName: currentUser?.nickname || "管理员",
      action: "流转缺陷状态",
      oldValue: currentStatus,
      newValue: status,
      createdAt: new Date().toISOString(),
    };

    onUpdateIssue({
      ...activeIssue,
      defectStatus: status,
      historyLogs: [newLog, ...(activeIssue.historyLogs || [])],
      updatedAt: new Date().toISOString(),
    });

    // Notify Feishu if enabled
    if (
      systemConfig?.feishuConfig?.enabled &&
      systemConfig?.feishuConfig?.notifyOnDefectChange
    ) {
      const assigneeUser = users.find((u) => u.id === activeIssue.assigneeId);
      const creatorUser = users.find((u) => u.id === activeIssue.creatorId);

      let notifyTargets: any[] = [];
      if (
        status === DefectStatus.NEW ||
        status === DefectStatus.PROCESSING ||
        status === DefectStatus.REOPEN
      ) {
        if (assigneeUser)
          notifyTargets.push({
            nickname: assigneeUser.nickname,
            feishuUserId: assigneeUser.feishuUserId,
          });
      } else if (
        status === DefectStatus.RESOLVED ||
        status === DefectStatus.REJECTED
      ) {
        if (creatorUser)
          notifyTargets.push({
            nickname: creatorUser.nickname,
            feishuUserId: creatorUser.feishuUserId,
          });
      } else if (status === DefectStatus.CLOSED) {
        if (creatorUser)
          notifyTargets.push({
            nickname: creatorUser.nickname,
            feishuUserId: creatorUser.feishuUserId,
          });
        if (assigneeUser && assigneeUser.id !== creatorUser?.id)
          notifyTargets.push({
            nickname: assigneeUser.nickname,
            feishuUserId: assigneeUser.feishuUserId,
          });
      }

      onTriggerWebhook("feishu", {
        title: `🔄 缺陷流转通知: ${activeIssue.title}`,
        type: "DefectStatusChanged",
        content: `状态由 [${currentStatus}] 变更为 [${status}]`,
        assignee: assigneeUser?.nickname || "未知",
        mentionsWithId: notifyTargets.length > 0 ? notifyTargets : undefined,
        link: window.location.href,
        isAutoTrigger: true,
      });
    }
  };

  const updateField = (key: keyof Issue, val: any) => {
    if (!activeIssue) return;

    if (key === "comments") {
    } else {
    }

    const oldValueStr = activeIssue[key];
    const newValueStr = val;

    // Only create log if the field values are genuinely different
    const isDifferent = Array.isArray(oldValueStr)
      ? JSON.stringify(oldValueStr) !== JSON.stringify(newValueStr)
      : oldValueStr !== newValueStr;

    let updatedLogs = activeIssue.historyLogs || [];

    if (isDifferent) {
      let actionLabel = "修改了缺陷属性";
      let logOldValue = String(oldValueStr || "");
      let logNewValue = String(newValueStr || "");

      switch (key) {
        case "title":
          actionLabel = "修改了缺陷标题";
          break;
        case "content":
          actionLabel = "修改了缺陷描述";
          logOldValue =
            oldValueStr && String(oldValueStr).length > 30
              ? String(oldValueStr).substring(0, 30) + "..."
              : String(oldValueStr || "");
          logNewValue =
            newValueStr && String(newValueStr).length > 30
              ? String(newValueStr).substring(0, 30) + "..."
              : String(newValueStr || "");
          break;
        case "severity":
          actionLabel = "变更了缺陷严重级别";
          break;
        case "assigneeId":
          actionLabel = "更正了缺陷指派人";
          const oldUser = users.find((u) => u.id === oldValueStr);
          const newUser = users.find((u) => u.id === newValueStr);
          logOldValue = oldUser
            ? oldUser.nickname
            : String(oldValueStr || "无");
          logNewValue = newUser
            ? newUser.nickname
            : String(newValueStr || "无");
          break;
        case "creatorId":
          actionLabel = "更正了缺陷提报人";
          const oldCreator = users.find((u) => u.id === oldValueStr);
          const newCreator = users.find((u) => u.id === newValueStr);
          logOldValue = oldCreator
            ? oldCreator.nickname
            : String(oldValueStr || "无");
          logNewValue = newCreator
            ? newCreator.nickname
            : String(newValueStr || "无");
          break;
        case "attachmentUrls":
          actionLabel = "更新了缺陷佐证附件";
          const oldLen = Array.isArray(oldValueStr) ? oldValueStr.length : 0;
          const newLen = Array.isArray(newValueStr) ? newValueStr.length : 0;
          logOldValue = `${oldLen} 个附件`;
          logNewValue = `${newLen} 个附件`;
          break;
        case "comments":
          actionLabel = "更新了沟通回复";
          const oldComments = Array.isArray(oldValueStr)
            ? (oldValueStr as unknown as DefectComment[])
            : [];
          const newComments = Array.isArray(newValueStr)
            ? (newValueStr as unknown as DefectComment[])
            : [];
          const oldLenC = oldComments.length;
          const newLenC = newComments.length;
          if (newLenC > oldLenC) {
            actionLabel = "发表了新的回复评论";
            const added = newComments.find(
              (nC) => !oldComments.some((oC) => oC.id === nC.id),
            );
            logOldValue = "无";
            logNewValue = added
              ? added.content.length > 20
                ? added.content.substring(0, 20) + "..."
                : added.content
              : `${newLenC} 条回复`;
          } else if (newLenC < oldLenC) {
            actionLabel = "删除了沟通回复";
            const removed = oldComments.find(
              (oC) => !newComments.some((nC) => nC.id === oC.id),
            );
            logOldValue = removed
              ? removed.content.length > 20
                ? removed.content.substring(0, 20) + "..."
                : removed.content
              : `${oldLenC} 条回复`;
            logNewValue = "内容已被删除";
          } else {
            actionLabel = "更新/编辑了沟通回复内容";
            const changed = newComments.find((nC) => {
              const oldC = oldComments.find((c) => c.id === nC.id);
              return oldC && oldC.content !== nC.content;
            });
            if (changed) {
              const oldC = oldComments.find((c) => c.id === changed.id);
              const oldContent = oldC ? oldC.content : "";
              logOldValue =
                oldContent.length > 20
                  ? oldContent.substring(0, 20) + "..."
                  : oldContent;
              logNewValue =
                changed.content.length > 20
                  ? changed.content.substring(0, 20) + "..."
                  : changed.content;
            } else {
              logOldValue = `${oldLenC} 条回复`;
              logNewValue = `${newLenC} 条回复`;
            }
          }
          break;
        case "linkToRequirements":
          actionLabel = "修改了关联需求设定";
          break;
        default:
          actionLabel = `更新了 ${String(key)} 字段`;
      }

      const newLog = {
        id: `log-${Date.now()}`,
        userId: currentUser?.id || "system",
        userName: currentUser?.nickname || "管理员",
        action: actionLabel,
        oldValue: logOldValue,
        newValue: logNewValue,
        createdAt: new Date().toISOString(),
      };

      updatedLogs = [newLog, ...updatedLogs];
    }

    onUpdateIssue({
      ...activeIssue,
      [key]: val,
      historyLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    });
  };

  const getNextAllowedStates = (current: DefectStatus) => {
    switch (current) {
      case DefectStatus.NEW:
        return [
          {
            status: DefectStatus.CONFIRMED,
            label: "确认缺陷",
            color: "bg-sky-600 hover:bg-sky-700 text-white border-sky-700",
          },
          {
            status: DefectStatus.PROCESSING,
            label: "开始处理",
            color:
              "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:border-indigo-800",
          },
          {
            status: DefectStatus.REJECTED,
            label: "驳回拒绝",
            color:
              "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300",
          },
        ];
      case DefectStatus.CONFIRMED:
        return [
          {
            status: DefectStatus.PROCESSING,
            label: "开始处理",
            color: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700",
          },
          {
            status: DefectStatus.REJECTED,
            label: "驳回拒绝",
            color: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200",
          },
        ];
      case DefectStatus.PROCESSING:
        return [
          {
            status: DefectStatus.RESOLVED,
            label: "完成修复",
            color:
              "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700",
          },
          {
            status: DefectStatus.REJECTED,
            label: "驳回拒绝",
            color:
              "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300",
          },
        ];
      case DefectStatus.RESOLVED:
        return [
          {
            status: DefectStatus.VERIFIED,
            label: "验证通过",
            color: "bg-teal-600 hover:bg-teal-700 text-white border-teal-700",
          },
          {
            status: DefectStatus.REOPEN,
            label: "未修复/重新打开",
            color:
              "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200",
          },
        ];
      case DefectStatus.VERIFIED:
        return [
          {
            status: DefectStatus.CLOSED,
            label: "归档关闭",
            color: "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-md",
          },
          {
            status: DefectStatus.REOPEN,
            label: "验证失败/重新打开",
            color: "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200",
          },
        ];
      case DefectStatus.REOPEN:
        return [
          {
            status: DefectStatus.PROCESSING,
            label: "重新处理",
            color: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700",
          },
          {
            status: DefectStatus.RESOLVED,
            label: "确认解决",
            color:
              "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 animate-pulse",
          },
        ];
      case DefectStatus.CLOSED:
        return [
          {
            status: DefectStatus.REOPEN,
            label: "重新打开",
            color:
              "bg-amber-50 hover:bg-amber-100 text-amber-850 border-amber-200",
          },
        ];
      case DefectStatus.REJECTED:
        return [
          {
            status: DefectStatus.REOPEN,
            label: "重新激活启动",
            color:
              "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200",
          },
          {
            status: DefectStatus.CLOSED,
            label: "归档关闭",
            color:
              "bg-slate-600 hover:bg-slate-700 text-white border-slate-600",
          },
        ];
      default:
        return [];
    }
  };

  const searchFiltered = filteredDefects.filter((i) => {
    const matchesSearch = i.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "ALL" || i.defectStatus === selectedStatus;
    const matchesCreator =
      selectedCreatorId === "ALL" || i.creatorId === selectedCreatorId;
    const matchesAssignee =
      selectedAssigneeId === "ALL" || i.assigneeId === selectedAssigneeId;
    const matchesSeverity =
      selectedSeverity === "ALL" || i.severity === selectedSeverity;
    return (
      matchesSearch &&
      matchesStatus &&
      matchesCreator &&
      matchesAssignee &&
      matchesSeverity
    );
  });

  const totalPages = Math.ceil(remote.total / pageSize);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedDefectsSide = searchFiltered;
  const defectStatusCount = (status: keyof typeof remote.statusCounts) => remote.statusCounts[status] || 0;
  const boardTotal = Object.values(remote.statusCounts).reduce((sum, count) => sum + (count || 0), 0);

  const activeFiltersCount =
    (selectedStatus !== "ALL" ? 1 : 0) +
    (selectedSeverity !== "ALL" ? 1 : 0) +
    (selectedCreatorId !== "ALL" ? 1 : 0) +
    (selectedAssigneeId !== "ALL" ? 1 : 0);

  return (
    <div
      className="space-y-6 animate-fade-in text-left"
      id="defects-board-wrapper"
    >
      {(remote.isLoading || remote.isSaving) && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
          {remote.isLoading ? "正在从服务端加载缺陷…" : "正在安全保存缺陷变更…"}
        </div>
      )}
      {/* Upper Statistics Overview Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4.5 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <AlertOctagon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">全部缺陷集</p>
            <h4 className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-0.5 truncate">{boardTotal} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">项</span></h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4.5 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <BookmarkCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">待定位排查</p>
            <h4 className="text-lg sm:text-xl font-black text-blue-600 font-mono mt-0.5 truncate">
              {defectStatusCount("OPEN") + defectStatusCount("REOPENED")}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4.5 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Zap className="h-4.5 w-4.5 sm:h-5 sm:w-5 animate-pulse text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">定位排查中</p>
            <h4 className="text-lg sm:text-xl font-black text-amber-600 font-mono mt-0.5 truncate">
              {defectStatusCount("CONFIRMED") + defectStatusCount("IN_PROGRESS")}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4.5 shadow-2xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">已修复待验证</p>
            <h4 className="text-lg sm:text-xl font-black text-sky-600 font-mono mt-0.5 truncate">
              {defectStatusCount("RESOLVED") + defectStatusCount("VERIFIED")}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4.5 shadow-2xs flex items-center gap-2.5 sm:gap-3.5 col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">归档验证关闭</p>
            <h4 className="text-lg sm:text-xl font-black text-emerald-600 font-mono mt-0.5 truncate">
              {defectStatusCount("CLOSED")}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>空间故障缺陷管理集</span>
              <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-mono">
                {searchFiltered.length} / {filteredDefects.length}
              </span>
            </h3>
          </div>
        </div>

        {/* Filters and Search toolbar - Unified Layout style */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/50 select-none">
            {/* Left side: Search Box and Advanced Filter closely paired */}
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pl-9 text-xs outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50/50 transition-all text-slate-800 placeholder:text-slate-400"
                  placeholder="搜索缺陷名称或内容描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3 py-2 rounded-xl border transition-all text-xs font-bold cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none ${
                    showAdvancedFilters || activeFiltersCount > 0
                      ? "bg-rose-50 text-rose-700 border-rose-200 shadow-3xs font-black"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>高级筛选</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-rose-600 text-white text-[9px] font-black leading-none rounded-full px-1.5 py-0.5 ml-0.5">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Advanced Filter Floating Console */}
                {showAdvancedFilters && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent cursor-default"
                      onClick={() => setShowAdvancedFilters(false)}
                    />
                    <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl space-y-3.5 z-50 text-left text-xs text-slate-705 animate-slide-up">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Filter className="h-3.5 w-3.5 text-rose-600" /> 高级筛选条件
                        </span>
                      </div>

                      <div className="space-y-3 text-left">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">缺陷状态</label>
                          <CustomSelect
                            value={selectedStatus}
                            onChange={(val) => setSelectedStatus(val as any)}
                            options={[
                              { value: "ALL", label: "全部状态" },
                              ...Object.values(DefectStatus).map((s) => ({ value: s, label: s })),
                            ]}
                            focusRingColorClassName="focus:border-rose-500 focus:ring-rose-50/50"
                            activeBgClassName="bg-rose-50/50"
                            activeTextClassName="text-rose-750"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">严重程度</label>
                          <CustomSelect
                            value={selectedSeverity}
                            onChange={(val) => setSelectedSeverity(val as any)}
                            options={[
                              { value: "ALL", label: "全部级别" },
                              ...Object.values(DefectSeverity).map((s) => ({ value: s, label: s })),
                            ]}
                            focusRingColorClassName="focus:border-rose-500 focus:ring-rose-50/50"
                            activeBgClassName="bg-rose-50/50"
                            activeTextClassName="text-rose-750"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">创建提报人</label>
                          <CustomSelect
                            value={selectedCreatorId}
                            onChange={(val) => setSelectedCreatorId(val)}
                            options={[
                              { value: "ALL", label: "全部创建人" },
                              ...activeUsers.map((u) => ({ value: u.id, label: u.nickname })),
                            ]}
                            focusRingColorClassName="focus:border-rose-500 focus:ring-rose-50/50"
                            activeBgClassName="bg-rose-50/50"
                            activeTextClassName="text-rose-750"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">处理负责人</label>
                          <CustomSelect
                            value={selectedAssigneeId}
                            onChange={(val) => setSelectedAssigneeId(val)}
                            options={[
                              { value: "ALL", label: "全部处理人" },
                              ...activeUsers.map((u) => ({ value: u.id, label: u.nickname })),
                            ]}
                            focusRingColorClassName="focus:border-rose-500 focus:ring-rose-50/50"
                            activeBgClassName="bg-rose-50/50"
                            activeTextClassName="text-rose-750"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStatus("ALL");
                            setSelectedCreatorId("ALL");
                            setSelectedAssigneeId("ALL");
                            setSelectedSeverity("ALL");
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          重置
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedFilters(false)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-rose-200"
                        >
                          确定
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right side: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0 select-none">
              <button
                onClick={() => setIsCreating(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-3xs hover:shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none"
                id="btn-overview-create-defect"
              >
                <span className="text-sm font-black">+</span>
                <span>新建缺陷</span>
              </button>
              <button
                type="button"
                onClick={() => setIsImporting(true)}
                className="px-3.5 py-2 border border-rose-200 bg-rose-50/20 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-102 flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>批量导入</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExporting(true)}
                className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-102 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>导出数据</span>
              </button>
            </div>
          </div>
        </div>

          {/* Inline active filters list */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedStatus !== "ALL" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                  <span>状态: {selectedStatus}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("ALL")}
                    className="hover:text-rose-900 font-extrabold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedSeverity !== "ALL" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full">
                  <span>严重度: {selectedSeverity}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSeverity("ALL")}
                    className="hover:text-orange-900 font-extrabold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedCreatorId !== "ALL" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  <span>
                    提报: {activeUsers.find((u) => u.id === selectedCreatorId)?.nickname || selectedCreatorId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCreatorId("ALL")}
                    className="hover:text-indigo-900 font-extrabold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedAssigneeId !== "ALL" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full">
                  <span>
                    负责: {activeUsers.find((u) => u.id === selectedAssigneeId)?.nickname || selectedAssigneeId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedAssigneeId("ALL")}
                    className="hover:text-teal-900 font-extrabold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("ALL");
                  setSelectedCreatorId("ALL");
                  setSelectedAssigneeId("ALL");
                  setSelectedSeverity("ALL");
                  setSearchQuery("");
                }}
                className="text-[9px] font-extrabold text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-full px-2 py-0.5 transition-all cursor-pointer"
              >
                清空全部 ✕
              </button>
            </div>
          )}
        </div>

        {/* Scrollable table container for smaller viewports to prevent squishing */}
        <div className="w-full overflow-x-auto scrollbar-thin">
          <div className="min-w-[1100px] pb-1 space-y-3">
            {/* List Header (表头) */}
            {paginatedDefectsSide.length > 0 && (
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                <div className="w-32 shrink-0 font-sans pl-1">
                  <span>缺陷编号</span>
                </div>
                <div className="flex-1 min-w-0 font-sans pl-2">缺陷名称</div>
                <div className="flex items-center shrink-0 text-left gap-x-6">
                  <div className="w-20 text-center font-sans">严重程度</div>
                  <div className="w-24 text-center font-sans">流转状态</div>
                  <div className="w-24 text-left font-sans pl-1">负责人</div>
                  <div className="w-28 text-left font-sans">质量追踪</div>
                  <div className="w-40 text-right font-sans">创建日期</div>
                  <div className="w-14 text-right font-sans pr-1">操作</div>
                </div>
              </div>
            )}

            {/* Flat listing workspace rows */}
            <div className="space-y-2.5">
              {paginatedDefectsSide.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400 italic border border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                  🔍 暂无匹配到当前筛选条件的异常故障缺陷。
                </div>
              ) : (
                paginatedDefectsSide.map((issue) => {
                  const assigned = users.find((u) => u.id === issue.assigneeId);
                  const isSelected = selectedIssueId === issue.id && !isCreating;
                  return (
                    <div
                      key={issue.id}
                      onClick={() => {
                        setSelectedIssueId(issue.id);
                        setIsDrawerOpen(true);
                        setIsCreating(false);
                      }}
                      className={`group relative rounded-xl border p-4 cursor-pointer transition-all hover:shadow-xs flex flex-row items-center justify-between gap-4 text-left ${
                        isSelected
                          ? "bg-rose-50/20 border-rose-200/60 ring-1 ring-rose-50 shadow-xs"
                          : "border-slate-200/60 bg-white hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Left block ID */}
                      <div className="w-32 shrink-0 flex items-center pl-1">
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100/60 px-2 py-0.5 rounded-lg font-mono truncate">
                          {formatDefectId(issue.id)}
                        </span>
                      </div>

                      {/* Title Column */}
                      <div className="min-w-0 flex-1 pl-2">
                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors" title={issue.title}>
                          {issue.title}
                        </h4>
                      </div>

                      {/* Right metadata flex alignments */}
                      <div className="flex items-center gap-x-6 text-xs shrink-0 justify-end">
                        {/* Severity */}
                        <div className="w-20 flex justify-center shrink-0">
                          {issue.severity && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold text-center border ${
                                issue.severity === DefectSeverity.FATAL
                                  ? "bg-rose-50 border-rose-100 text-rose-600 shadow-3xs"
                                  : issue.severity === DefectSeverity.SERIOUS
                                    ? "bg-orange-50 border-orange-100 text-orange-600 shadow-3xs"
                                    : issue.severity === DefectSeverity.NORMAL
                                      ? "bg-amber-50 border-amber-100 text-amber-600 shadow-3xs"
                                      : "bg-slate-50 border-slate-100 text-slate-600 shadow-3xs"
                              }`}
                            >
                              {issue.severity}
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="w-24 flex justify-center shrink-0">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              issue.defectStatus === DefectStatus.NEW
                                ? "bg-blue-50 text-blue-600 border-blue-100"
                                : issue.defectStatus === DefectStatus.CLOSED
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : issue.defectStatus === DefectStatus.RESOLVED
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-indigo-50 text-indigo-600 border-indigo-100"
                            }`}
                          >
                            {issue.defectStatus || "新建"}
                          </span>
                        </div>

                        {/* Owner */}
                        <div className="flex items-center gap-1.5 w-24 shrink-0 pl-1">
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                            {assigned ? assigned.nickname.substring(0, 1) : "待"}
                          </div>
                          <span className="text-[11px] font-medium text-slate-600 truncate">
                            {assigned ? assigned.nickname : "待指派"}
                          </span>
                        </div>

                        {/* Linked items */}
                        {(() => {
                          const linkedCaseCount = issue.linkToTestCases?.length || 0;
                          const linkedReqCount = issue.linkToRequirements?.length || 0;

                          return (
                            <div className="flex items-center gap-2 w-28 shrink-0">
                              <span
                                className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded font-bold hover:brightness-95 border transition-all cursor-pointer ${linkedReqCount > 0 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}
                                title="点击查看关联业务需求列表"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const defectReqs = issues.filter(
                                    (r) =>
                                      r.projectId === projectId &&
                                      r.type === IssueType.REQUIREMENT &&
                                      issue.linkToRequirements?.includes(r.id),
                                  );
                                  setTraceabilityState({
                                    isOpen: true,
                                    title: `缺陷 ${formatDefectId(issue.id)} 的关联业务需求`,
                                    subtitle: issue.title,
                                    testCases: [],
                                    issues: defectReqs,
                                    issueId: issue.id,
                                  });
                                }}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>{linkedReqCount}</span>
                              </span>
                              <span
                                className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded font-bold hover:brightness-95 border transition-all cursor-pointer ${linkedCaseCount > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}
                                title="点击查看关联测试用例列表"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const defectCases = testCases.filter(
                                    (tc) => issue.linkToTestCases?.includes(tc.id),
                                  );
                                  setTraceabilityState({
                                    isOpen: true,
                                    title: `缺陷 ${formatDefectId(issue.id)} 的关联测试用例`,
                                    subtitle: issue.title,
                                    testCases: defectCases,
                                    issues: [],
                                    issueId: issue.id,
                                  });
                                }}
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>{linkedCaseCount}</span>
                              </span>
                            </div>
                          );
                        })()}

                        {/* Creation Date */}
                        <div className="text-[10px] text-slate-400 font-medium w-40 text-right shrink-0">
                          {formatDateToSeconds(issue.createdAt)}
                        </div>

                        {/* Hover actions */}
                        <div className="flex items-center gap-1.5 w-14 justify-end shrink-0 pr-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDefect(issue);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg cursor-pointer border border-slate-200"
                            title="编辑"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSingleIssueId(issue.id);
                              setIsDeleteSingleConfirmOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg cursor-pointer border border-slate-200"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {remote.total > 0 && (
          <Pagination
            currentPage={activePage}
            totalItems={remote.total}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
            themeColor="rose"
          />
        )}

      {/* Right Drawer Slide-out Panel */}
      {isDrawerOpen && activeIssue && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-3xs z-[100] transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* Drawer Wrapper with slide in transition */}
          <div
            className="fixed top-0 right-0 h-full w-full max-w-[85vw] md:max-w-4xl lg:max-w-5xl bg-slate-50 border-l border-slate-200 shadow-2xl z-[101] flex flex-col overflow-hidden animate-slide-left"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-sans">
                  缺陷详情与工作台
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 hover:bg-slate-150 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none focus:outline-none"
                title="关闭抽屉面板"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Drawer scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              <div className="mb-4"><ResourceAttachments scope={apiScope} resourceType="DEFECT" resourceId={activeIssue.id} /></div>
              <DefectDetailView
                apiScope={apiScope}
                activeIssue={activeIssue}
                users={users}
                testCases={testCases}
                requirements={requirements}
                currentUser={currentUser}
                isEditing={false}
                setIsEditing={() => {}}
                onUpdateField={updateField}
                onUpdateStatus={handleUpdateStatus}
                getNextAllowedStates={getNextAllowedStates}
                onToggleLinkedCase={handleToggleLinkedCase}
                onTriggerWebhook={onTriggerWebhook}
                onCreateFeishuGroup={onCreateFeishuGroup}
                systemConfig={systemConfig}
                userGroups={userGroups}
              />
            </div>
          </div>
        </>
      )}

      {/* Floating Overlay Modal for Defect Editing */}
      {editingDefect && (
        <EditDefectModal
          activeIssue={editingDefect}
          activeUsers={activeUsers}
          requirements={requirements}
          currentUser={currentUser}
          onClose={() => setEditingDefect(null)}
          onSave={(updatedDefect) => {
            safeUpdateIssue(updatedDefect);
            setEditingDefect(null);
          }}
        />
      )}

      {/* Create Defect Overlay Dialog */}
      {isCreating && (
        <CreateDefectModal
          projectId={projectId}
          activeUsers={activeUsers}
          requirements={requirements}
          currentUser={currentUser}
          onClose={() => setIsCreating(false)}
          onSave={(issue) => {
            onAddIssue(issue);
            setIsCreating(false);

            // Feishu notification for creation
            if (
              systemConfig?.feishuConfig?.enabled &&
              systemConfig?.feishuConfig?.notifyOnDefectCreate
            ) {
              const assigneeUser = users.find(
                (u) => u.id === issue.assigneeId,
              );
              onTriggerWebhook("feishu", {
                title: `🆕 新缺陷提报通知: ${issue.title}`,
                type: "DefectCreated",
                content: `由于来源需求【${requirements.find((r) => r.id === issue.linkToRequirements?.[0])?.title || "未关联"}】衍生出的全新功能故障，请及时关注。`,
                severity: issue.severity,
                assignee: assigneeUser?.nickname || "未指派",
                mentionsWithId: assigneeUser
                  ? [
                      {
                        nickname: assigneeUser.nickname,
                        feishuUserId: assigneeUser.feishuUserId,
                      },
                    ]
                  : undefined,
                link: window.location.href,
                isAutoTrigger: true,
              });
            }
          }}
        />
      )}

      <ExportDataModal
        isOpen={isExporting}
        onClose={() => setIsExporting(false)}
        dataType="defect"
        dataList={searchFiltered}
        users={users}
        requirements={requirements}
      />

      {isImporting && (
        <ImportDefectsModal
          projectId={projectId}
          activeUsers={activeUsers}
          currentUser={currentUser}
          onClose={() => setIsImporting(false)}
          onImport={async (imported) => {
            await remote.createIssues(imported);
            if (imported.length > 0) {
              showToast(`已成功导入 ${imported.length} 条缺陷。`, "success");
            }
          }}
        />
      )}

      {/* Traceability Association List Modal */}
      <TraceabilityListModal
        isOpen={traceabilityState.isOpen}
        onClose={() => setTraceabilityState(prev => ({ ...prev, isOpen: false }))}
        title={traceabilityState.title}
        subtitle={traceabilityState.subtitle}
        testCases={traceabilityState.testCases}
        issues={traceabilityState.issues}
        users={users}
        onNavigateToTab={onNavigateToTab}
        onFocusIssue={onFocusDefect}
        onUnbindTestCase={handleUnbindTestCase}
      />

      {/* Single Defect Deletion Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteSingleConfirmOpen}
        title="确认删除该异常缺陷吗？"
        message={
          deleteSingleIssueId
            ? `你正在尝试永久删除缺陷 ${formatDefectId(deleteSingleIssueId)} 及其所有关联的互锁数据追溯关系。该操作不可撤销，确定执行吗？`
            : "你正在尝试永久删除选中的缺陷。该操作不可撤销，确定执行吗？"
        }
        confirmText="立即删除"
        cancelText="考虑一下"
        type="danger"
        onConfirm={() => {
          if (deleteSingleIssueId) {
            safeDeleteIssue(deleteSingleIssueId);
            setDeleteSingleIssueId(null);
          }
          setIsDeleteSingleConfirmOpen(false);
        }}
        onCancel={() => {
          setDeleteSingleIssueId(null);
          setIsDeleteSingleConfirmOpen(false);
        }}
      />
    </div>
  );
}
