/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  User,
  Plus,
  Trash2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  AlertTriangle,
  SlidersHorizontal,
  Filter,
  BookmarkCheck,
  Zap,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import {
  Issue,
  IssueType,
  RequirementPriority,
  RequirementStatus,
  User as SystemUser,
  TestCase,
  UserGroup,
  ProjectTab,
  SystemConfig,
  TestCaseGrade,
  TestCaseStatus,
  DefectStatus,
} from "../types";
import { Lock } from "lucide-react";
import { robustJsonParse, mapAITestCase } from "../lib/aiUtils";
import RequirementDetailPanel from "./RequirementDetailPanel";
import DeleteRequirementDialog from "./DeleteRequirementDialog";
import CreateRequirementModal from "./CreateRequirementModal";
import EditRequirementModal from "./EditRequirementModal";
import Pagination from "./Pagination";
import { formatReqId, formatDefectId, formatCaseId, generateCaseId } from "../lib/idUtils";
import TraceabilityListModal from "./TraceabilityListModal";
import CustomSelect from "./CustomSelect";
import { priorityToApi, statusToApi, useRequirementBridge } from "../features/requirements/api/useRequirements";
import { RequirementApiScope } from "../features/requirements/api/types";
import { useDefectBridge } from "../features/defects/api/useDefects";
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

interface RequirementsBoardProps {
  projectId: string;
  users: SystemUser[];
  onInvokeAI: (prompt: string) => Promise<string>;
  onTriggerWebhook: (provider: string, payload: any) => void;
  onCreateFeishuGroup?: (payload: any) => Promise<any>;
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusTestCase?: (id: string) => void;
  focusedRequirementId?: string | null;
  onFocusRequirement?: (id: string | null) => void;
  systemConfig: SystemConfig;
  onPromptMissing?: () => void;
  currentUser?: SystemUser | null;
  userGroups?: UserGroup[];
  apiScope: RequirementApiScope;
}

export default function RequirementsBoard({
  projectId,
  users,
  onInvokeAI,
  onTriggerWebhook,
  onCreateFeishuGroup,
  onNavigateToTab,
  onFocusTestCase,
  focusedRequirementId,
  onFocusRequirement,
  systemConfig,
  onPromptMissing,
  currentUser = null,
  userGroups = [],
  apiScope,
}: RequirementsBoardProps) {
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);

  const showToast = (message: string, type: "error" | "success" | "warning" = "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const safeAddIssue = (issue: Issue) => {
    void remote.createIssue(issue);
  };

  const safeUpdateIssue = (issue: Issue) => {
    void remote.updateIssue(issue);
  };

  const safeDeleteIssue = (id: string) => {
    void remote.deleteIssue(id);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("全部");
  const [selectedPriorityFilter, setSelectedPriorityFilter] =
    useState<string>("ALL");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("ALL");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [editingReq, setEditingReq] = useState<Issue | null>(null);
  const [reqToDelete, setReqToDelete] = useState<Issue | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const remote = useRequirementBridge(apiScope, projectId, {
    limit: pageSize,
    page: currentPage,
    q: searchQuery.trim() || undefined,
    status:
      selectedStatusFilter !== "全部"
        ? statusToApi[selectedStatusFilter as RequirementStatus]
        : undefined,
    priority:
      selectedPriorityFilter !== "ALL"
        ? priorityToApi[selectedPriorityFilter as RequirementPriority]
        : undefined,
    creatorId: selectedCreatorId !== "ALL" ? selectedCreatorId : undefined,
    assigneeId: selectedAssigneeId !== "ALL" ? selectedAssigneeId : undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const defectRemote = useDefectBridge(apiScope, projectId);
  const testCaseRemote = useTestCaseBridge(apiScope, projectId);
  const issues = [...remote.issues, ...defectRemote.issues];
  const testCases = testCaseRemote.testCases;
  const onDeleteTestCase = testCaseRemote.deleteTestCase;
  const onAddTestCaseBatch = (cases: TestCase[]) => cases.forEach(testCaseRemote.createTestCase);
  const onUpdateTestCase = testCaseRemote.updateTestCase;
  const onUpdateIssue = remote.updateIssue;
  const filteredRequirements = issues.filter(
    (issue) => issue.projectId === projectId && issue.type === IssueType.REQUIREMENT,
  );

  useEffect(() => {
    if (remote.error) {
      showToast(remote.error instanceof Error ? remote.error.message : "需求服务请求失败", "error");
    }
  }, [remote.error]);

  // Form edit states
  const [isCreating, setIsCreating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResultPrompt, setAiResultPrompt] = useState("");

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

  const activeIssue = filteredRequirements.find(
    (i) => i.id === selectedIssueId,
  );
  const activeUsers = users.filter((u) => u.status === "active");

  // Reset pagination when filter shifts
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedStatusFilter,
    selectedPriorityFilter,
    selectedCreatorId,
    selectedAssigneeId,
  ]);

  // Adjust active requirements selection if filtered out
  useEffect(() => {
    if (filteredRequirements.length > 0 && !selectedIssueId) {
      setSelectedIssueId(filteredRequirements[0].id);
    }
  }, [projectId]);

  // Listen and jump/focus to the selected requirement from other boards
  useEffect(() => {
    if (
      focusedRequirementId &&
      filteredRequirements.some((r) => r.id === focusedRequirementId)
    ) {
      setSelectedIssueId(focusedRequirementId);
      setIsDrawerOpen(true);
      if (onFocusRequirement) {
        setTimeout(() => onFocusRequirement(null), 100);
      }
    }
  }, [focusedRequirementId, projectId]);

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleSaveNew = (created: Issue) => {
    safeAddIssue(created);
    setIsCreating(false);

    // Feishu config trigger check for on create
    if (
      systemConfig.feishuConfig.enabled &&
      systemConfig.feishuConfig.notifyOnReqCreate
    ) {
      const assigneeUser = activeUsers.find((u) => u.id === created.assigneeId);
      const payload = {
        title: `🆕 需求录入通知: ${created.title}`,
        type: "RequirementCreated",
        mentionsWithId: assigneeUser
          ? [
              {
                nickname: assigneeUser.nickname,
                feishuUserId: assigneeUser.feishuUserId,
              },
            ]
          : undefined,
        content: `需求描述: ${created.content.substring(0, 150)}...\n优先级: ${created.priority}`,
        link: window.location.href,
        isAutoTrigger: true,
      };

      onTriggerWebhook("feishu", payload);
    }
  };

  // Switch requirement status pipeline and trigger webhook if enabled
  const handleRequirementStatusChange = (statusVal: RequirementStatus) => {
    if (!activeIssue) return;


    onUpdateIssue({
      ...activeIssue,
      requirementStatus: statusVal,
      updatedAt: new Date().toISOString(),
    });

    // Feishu config trigger check for status change
    if (
      systemConfig.feishuConfig.enabled &&
      systemConfig.feishuConfig.notifyOnReqChange
    ) {
      const assigneeUser = activeUsers.find(
        (u) => u.id === activeIssue.assigneeId,
      );
      const creatorUser = activeUsers.find(
        (u) => u.id === activeIssue.creatorId,
      );

      let notifyTargets: any[] = [];
      if (
        statusVal === RequirementStatus.ACCEPTING ||
        statusVal === RequirementStatus.COMPLETED
      ) {
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
      } else {
        if (assigneeUser)
          notifyTargets.push({
            nickname: assigneeUser.nickname,
            feishuUserId: assigneeUser.feishuUserId,
          });
      }

      const nickname = assigneeUser ? assigneeUser.nickname : "负责人";

      const payload = {
        title: `🔄 需求流转通知: ${activeIssue.title}`,
        type: "RequirementStatusChanged",
        content: `需求节点已流转更新至：【${statusVal}】\n相关负责人：@${nickname}`,
        mentionsWithId: notifyTargets.length > 0 ? notifyTargets : undefined,
        link: window.location.href,
        isAutoTrigger: true,
      };

      onTriggerWebhook("feishu", payload);
    }
  };

  // AI testcase generation mapping
  const handleAIGeneratedCase = async () => {
    if (!activeIssue) return;


    if (
      !systemConfig?.aiPromptTemplate ||
      !systemConfig.aiPromptTemplate.trim()
    ) {
      if (onPromptMissing) {
        onPromptMissing();
      } else {
        alert("请先在「系统配置」中配置大模型用例生成策略。");
      }
      return;
    }

    setAiGenerating(true);
    try {
      const basePrompt = systemConfig.aiPromptTemplate;
      const prompt = `${basePrompt}

请针对以下【业务需求：${activeIssue.title}】的 Markdown 规格说明，严格按照约定的 JSON 数组格式派生生成测试用例：
---
${activeIssue.content}
---
`;
      const response = await onInvokeAI(prompt);
      const list = robustJsonParse<any[]>(response, []);

      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("AI 返回的数据为空或不匹配 JSON 数组规范");
      }

      const formattedCases: TestCase[] = list.map((item, idx) => {
        const mapped = mapAITestCase(item);
        return {
          id: generateCaseId(),
          projectId,
          name: mapped.name,
          grade: (mapped.grade || "中-P2") as TestCaseGrade,
          precondition: mapped.precondition,
          steps: mapped.steps,
          expectedResult: mapped.expectedResult,
          status: "未测试" as TestCaseStatus,
          linkedRequirementId: activeIssue.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      // Bind to current issue
      const updatedLinkedCases = [
        ...(activeIssue.linkToTestCases || []),
        ...formattedCases.map((tc) => tc.id),
      ];
      safeUpdateIssue({
        ...activeIssue,
        linkToTestCases: updatedLinkedCases,
        updatedAt: new Date().toISOString(),
      });

      onAddTestCaseBatch(formattedCases);
      setAiResultPrompt(
        `已成功自动生成 ${formattedCases.length} 个 AI 测试用例，并建立双向互锁追溯！正在秒级切换至用例模块进行核查...`,
      );

      // Auto navigation shift
      setTimeout(() => {
        setAiResultPrompt("");
        if (onNavigateToTab) {
          onNavigateToTab(ProjectTab.TESTCASE);
        }
      }, 2000);
    } catch (err: any) {
      alert("AI用例解析失败，原始返回文本异常：" + err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleToggleLinkedCase = (caseId: string) => {
    if (!activeIssue) return;
    const currentList = activeIssue.linkToTestCases || [];
    const updated = currentList.includes(caseId)
      ? currentList.filter((id) => id !== caseId)
      : [...currentList, caseId];

    safeUpdateIssue({
      ...activeIssue,
      linkToTestCases: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUnbindTestCase = (caseId: string) => {
    const issueId = traceabilityState.issueId;
    if (!issueId) return;

    const req = issues.find((i) => i.id === issueId);
    if (req) {
      const updatedLinkToTestCases = (req.linkToTestCases || []).filter((id) => id !== caseId);
      safeUpdateIssue({
        ...req,
        linkToTestCases: updatedLinkToTestCases,
        updatedAt: new Date().toISOString(),
      });

      setTraceabilityState((prev) => ({
        ...prev,
        testCases: prev.testCases.filter((tc) => tc.id !== caseId),
      }));
    }

    const tc = testCases.find((t) => t.id === caseId);
    if (tc && tc.linkedRequirementId === issueId) {
      onUpdateTestCase({
          ...tc,
          linkedRequirementId: undefined,
          updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleMarkdownChange = (val: string) => {
    if (!activeIssue) return;
    safeUpdateIssue({
      ...activeIssue,
      content: val,
      updatedAt: new Date().toISOString(),
    });
  };

  const getPriorityBadgeClass = (p?: RequirementPriority) => {
    switch (p) {
      case RequirementPriority.EP:
        return "bg-rose-50 border border-rose-100/60 text-rose-600";
      case RequirementPriority.HP1:
        return "bg-amber-50 border border-amber-100/60 text-amber-600";
      case RequirementPriority.MP2:
        return "bg-indigo-50 border border-indigo-100/60 text-indigo-600";
      default:
        return "bg-slate-50 border border-slate-100/60 text-slate-600";
    }
  };

  const getRequirementStatusBadgeClass = (status: RequirementStatus) => {
    switch (status) {
      case RequirementStatus.DRAFT:
        return "bg-slate-100 border border-slate-200 text-slate-550";
      case RequirementStatus.UNDER_REVIEW:
        return "bg-amber-50 border border-amber-100 text-amber-600";
      case RequirementStatus.DEVELOPING:
        return "bg-sky-50 border border-sky-100 text-sky-600";
      case RequirementStatus.TESTING:
        return "bg-indigo-50 border border-indigo-100 text-indigo-600 animate-pulse";
      case RequirementStatus.ACCEPTING:
        return "bg-purple-50 border border-purple-100 text-purple-600";
      case RequirementStatus.COMPLETED:
        return "bg-emerald-50 border border-emerald-100 text-emerald-600";
      default:
        return "bg-slate-50 border border-slate-100 text-slate-550";
    }
  };

  const allStatuses = ["全部", ...Object.values(RequirementStatus)];

  const getStatusCount = (st: string) => {
    if (st === "全部") return filteredRequirements.length;
    return filteredRequirements.filter(
      (i) => (i.requirementStatus || RequirementStatus.DEVELOPING) === st,
    ).length;
  };

  const activeFiltersCount =
    (selectedStatusFilter !== "全部" ? 1 : 0) +
    (selectedPriorityFilter !== "ALL" ? 1 : 0) +
    (selectedCreatorId !== "ALL" ? 1 : 0) +
    (selectedAssigneeId !== "ALL" ? 1 : 0);

  // Search filter
  const searchFiltered = filteredRequirements.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchedStatus = i.requirementStatus || RequirementStatus.DRAFT;
    const matchesStatus =
      selectedStatusFilter === "全部" || matchedStatus === selectedStatusFilter;

    const matchedPriority = i.priority || RequirementPriority.MP2;
    const matchesPriority =
      selectedPriorityFilter === "ALL" ||
      matchedPriority === selectedPriorityFilter;

    const matchedCreator = i.creatorId || "";
    const matchesCreator =
      selectedCreatorId === "ALL" || matchedCreator === selectedCreatorId;

    const matchedAssignee = i.assigneeId || "";
    const matchesAssignee =
      selectedAssigneeId === "ALL" || matchedAssignee === selectedAssigneeId;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesCreator &&
      matchesAssignee
    );
  });

  // Pagination bounds
  const totalPages = Math.ceil(remote.total / pageSize);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedRequirements = searchFiltered;
  const boardTotal = Object.values(remote.statusCounts).reduce((sum, count) => sum + (count || 0), 0);
  const boardStatusCount = (status: "DRAFT" | "UNDER_REVIEW" | "IN_PROGRESS" | "TESTING" | "ACCEPTING" | "DONE") =>
    remote.statusCounts[status] || 0;

  return (
    <div
      className="space-y-6 animate-fade-in text-left"
      id="requirements-board-wrapper"
    >
      {(remote.isLoading || remote.isSaving) && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700">
          {remote.isLoading ? "正在从服务端加载需求…" : "正在安全保存需求变更…"}
        </div>
      )}
      {/* Upper Statistics Overview Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <BookmarkCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">全部需求集</p>
            <h4 className="text-xl font-black text-slate-800 font-mono mt-0.5">{boardTotal} <span className="text-xs text-slate-400 font-normal">项</span></h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-slate-50 text-slate-500">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">待评审/草稿</p>
            <h4 className="text-xl font-black text-slate-700 font-mono mt-0.5">
              {boardStatusCount("DRAFT") + boardStatusCount("UNDER_REVIEW")}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">开发中</p>
            <h4 className="text-xl font-black text-sky-600 font-mono mt-0.5">
              {boardStatusCount("IN_PROGRESS")}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">测试验收中</p>
            <h4 className="text-xl font-black text-indigo-600 font-mono mt-0.5">
              {boardStatusCount("TESTING") + boardStatusCount("ACCEPTING")}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-2xs flex items-center gap-3.5 col-span-2 md:col-span-1">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">已完成归档</p>
            <h4 className="text-xl font-black text-emerald-600 font-mono mt-0.5">
              {boardStatusCount("DONE")}
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
              <span>空间业务需求集</span>
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                {searchFiltered.length} / {filteredRequirements.length}
              </span>
            </h3>
          </div>
        </div>

        {/* Filters and Search toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/50 select-none">
            {/* Left side: Search Box and Advanced Filter closely paired */}
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pl-9 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all text-slate-800 placeholder:text-slate-400"
                  placeholder="搜索需求标题或描述内容..."
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
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-3xs font-black"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>高级筛选</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-indigo-600 text-white text-[9px] font-black leading-none rounded-full px-1.5 py-0.5 ml-0.5">
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
                          <Filter className="h-3.5 w-3.5 text-indigo-600" /> 高级筛选条件
                        </span>
                      </div>

                      <div className="space-y-3 text-left">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">生命周期流程</label>
                          <CustomSelect
                            value={selectedStatusFilter}
                            onChange={(val) => setSelectedStatusFilter(val)}
                            options={allStatuses.map((st) => ({ value: st, label: st }))}
                            focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                            activeBgClassName="bg-indigo-50/50"
                            activeTextClassName="text-indigo-750"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">优先级过滤</label>
                          <CustomSelect
                            value={selectedPriorityFilter}
                            onChange={(val) => setSelectedPriorityFilter(val)}
                            options={[
                              { value: "ALL", label: "全部优先级" },
                              ...Object.values(RequirementPriority).map((p) => ({ value: p, label: p })),
                            ]}
                            focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                            activeBgClassName="bg-indigo-50/50"
                            activeTextClassName="text-indigo-750"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">处理负责人</label>
                          <CustomSelect
                            value={selectedAssigneeId}
                            onChange={(val) => setSelectedAssigneeId(val)}
                            options={[
                              { value: "ALL", label: "全部处理人" },
                              ...users.map((u) => ({ value: u.id, label: u.nickname })),
                            ]}
                            focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                            activeBgClassName="bg-indigo-50/50"
                            activeTextClassName="text-indigo-750"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">需求提出人</label>
                          <CustomSelect
                            value={selectedCreatorId}
                            onChange={(val) => setSelectedCreatorId(val)}
                            options={[
                              { value: "ALL", label: "全部创建人" },
                              ...users.map((u) => ({ value: u.id, label: u.nickname })),
                            ]}
                            focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                            activeBgClassName="bg-indigo-50/50"
                            activeTextClassName="text-indigo-750"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStatusFilter("全部");
                            setSelectedPriorityFilter("ALL");
                            setSelectedCreatorId("ALL");
                            setSelectedAssigneeId("ALL");
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          重置
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedFilters(false)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-indigo-200"
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
            <div className="flex items-center gap-2 shrink-0 select-none">
              <button
                onClick={handleCreate}
                className="px-3.5 py-2 text-white text-xs font-black rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none bg-indigo-600 hover:bg-indigo-700 active:scale-95 hover:shadow-2xs"
                id="btn-overview-create-req"
              >
                <span className="text-sm font-black">+</span>
                <span>新建需求</span>
              </button>
            </div>
          </div>

          {/* Inline active filters list */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedStatusFilter !== "全部" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                  <span>状态: {selectedStatusFilter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter("全部")}
                    className="hover:text-rose-900 font-extrabold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedPriorityFilter !== "ALL" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                  <span>优先级: {selectedPriorityFilter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityFilter("ALL")}
                    className="hover:text-amber-900 font-extrabold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedCreatorId !== "ALL" && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  <span>
                    提报: {users.find((u) => u.id === selectedCreatorId)?.nickname || selectedCreatorId}
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
                    负责: {users.find((u) => u.id === selectedAssigneeId)?.nickname || selectedAssigneeId}
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
                  setSelectedStatusFilter("全部");
                  setSelectedPriorityFilter("ALL");
                  setSelectedCreatorId("ALL");
                  setSelectedAssigneeId("ALL");
                  setSearchQuery("");
                }}
                className="text-[9px] font-extrabold text-slate-400 hover:text-indigo-650 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-full px-2 py-0.5 transition-all cursor-pointer"
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
            {paginatedRequirements.length > 0 && (
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                <div className="w-32 shrink-0 font-sans">需求编号</div>
                <div className="flex-1 min-w-0 font-sans pl-2">需求名称</div>
                <div className="flex items-center shrink-0 text-left gap-x-6">
                  <div className="w-20 text-center font-sans">优先级</div>
                  <div className="w-24 text-center font-sans">流转状态</div>
                  <div className="w-24 text-left font-sans pl-1">负责人</div>
                  <div className="w-28 text-left font-sans">质量追踪</div>
                  <div className="w-40 text-right font-sans">更新日期</div>
                  <div className="w-14 text-right font-sans pr-1">操作</div>
                </div>
              </div>
            )}

            {/* Flat listing workspace rows */}
            <div className="space-y-2.5">
              {paginatedRequirements.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400 italic border border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                  🔍 暂无匹配到当前筛选条件的业务需求。
                </div>
              ) : (
                paginatedRequirements.map((issue) => {
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
                          ? "bg-indigo-50/40 border-indigo-200/60 ring-1 ring-indigo-50 shadow-xs"
                          : "border-slate-200/60 bg-white hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Left block ID */}
                      <div className="w-32 shrink-0 flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-100/60 px-2 py-0.5 rounded-lg font-mono truncate">
                          {formatReqId(issue.id)}
                        </span>
                      </div>

                      {/* Title Column */}
                      <div className="min-w-0 flex-1 pl-2">
                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={issue.title}>
                          {issue.title}
                        </h4>
                      </div>

                      {/* Right metadata flex alignments */}
                      <div className="flex items-center gap-x-6 text-xs shrink-0 justify-end">
                        {/* Priority */}
                        <div className="w-20 flex justify-center shrink-0">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-center border ${getPriorityBadgeClass(issue.priority)}`}
                          >
                            {issue.priority || "中-P2"}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="w-24 flex justify-center shrink-0">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold text-center border ${getRequirementStatusBadgeClass(issue.requirementStatus || RequirementStatus.DEVELOPING)}`}
                          >
                            {issue.requirementStatus || RequirementStatus.DEVELOPING}
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

                        {/* Indicators */}
                        {(() => {
                          const linkedCount = testCases.filter(
                            (tc) =>
                              tc.linkedRequirementId === issue.id ||
                              issue.linkToTestCases?.includes(tc.id),
                          ).length;
                          const defectCount = issues.filter(
                            (i) =>
                              i.projectId === projectId &&
                              i.type === IssueType.DEFECT &&
                              i.linkToRequirements?.includes(issue.id),
                          ).length;
                          const openDefectsCount = issues.filter(
                            (i) =>
                              i.projectId === projectId &&
                              i.type === IssueType.DEFECT &&
                              i.linkToRequirements?.includes(issue.id) &&
                              i.defectStatus !== DefectStatus.CLOSED &&
                              i.defectStatus !== DefectStatus.RESOLVED &&
                              i.defectStatus !== DefectStatus.REJECTED,
                          ).length;

                          return (
                            <div className="flex items-center gap-2 w-28 shrink-0">
                              <span
                                className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded font-bold hover:brightness-95 transition-all cursor-pointer ${linkedCount > 0 ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                title="点击查看关联测试用例列表"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const reqCases = testCases.filter(
                                    (tc) =>
                                      tc.linkedRequirementId === issue.id ||
                                      issue.linkToTestCases?.includes(tc.id),
                                  );
                                  setTraceabilityState({
                                    isOpen: true,
                                    title: `需求 ${formatReqId(issue.id)} 的关联测试用例`,
                                    subtitle: issue.title,
                                    testCases: reqCases,
                                    issues: [],
                                    issueId: issue.id,
                                  });
                                }}
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>{linkedCount}</span>
                              </span>
                              <span
                                className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded font-bold hover:brightness-95 border transition-all cursor-pointer ${
                                  defectCount > 0
                                    ? openDefectsCount > 0
                                      ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-slate-50 text-slate-400 border-slate-100"
                                }`}
                                title="点击查看关联异常缺陷列表"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const reqDefects = issues.filter(
                                    (i) =>
                                      i.projectId === projectId &&
                                      i.type === IssueType.DEFECT &&
                                      i.linkToRequirements?.includes(issue.id),
                                  );
                                  setTraceabilityState({
                                    isOpen: true,
                                    title: `需求 ${formatReqId(issue.id)} 的关联异常缺陷`,
                                    subtitle: issue.title,
                                    testCases: [],
                                    issues: reqDefects,
                                  });
                                }}
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{defectCount}</span>
                              </span>
                            </div>
                          );
                        })()}

                        {/* Update Date */}
                        <div className="text-[10px] text-slate-400 font-medium w-40 text-right shrink-0">
                          {formatDateToSeconds(issue.updatedAt || issue.createdAt)}
                        </div>

                        {/* Hover actions */}
                        <div className="flex items-center gap-1.5 w-14 justify-end shrink-0 pr-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingReq(issue);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg cursor-pointer border border-slate-200"
                            title="编辑"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReqToDelete(issue);
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

        {/* Flat Pagination controls */}
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
            themeColor="indigo"
          />
        )}
      </div>

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
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-sans">
                  需求详情与工作台
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
            <div className="flex-1 overflow-y-auto p-4">
              <RequirementDetailPanel
                projectId={projectId}
                activeIssue={activeIssue}
                issues={issues}
                testCases={testCases}
                onUpdateIssue={safeUpdateIssue}
                onDeleteTestCase={onDeleteTestCase}
                onInvokeAI={onInvokeAI}
                onAddTestCaseBatch={onAddTestCaseBatch}
                onNavigateToTab={onNavigateToTab}
                onFocusTestCase={onFocusTestCase}
                onTriggerWebhook={onTriggerWebhook}
                onCreateFeishuGroup={onCreateFeishuGroup}
                activeUsers={activeUsers}
                systemConfig={systemConfig}
                onPromptMissing={onPromptMissing}
                currentUser={currentUser}
                userGroups={userGroups}
              />
            </div>
          </div>
        </>
      )}

      {/* Floating Overlay Modal for Requirement Creation */}
      {isCreating && (
        <CreateRequirementModal
          projectId={projectId}
          activeUsers={activeUsers}
          onClose={() => setIsCreating(false)}
          onSave={handleSaveNew}
        />
      )}

      {/* Floating Overlay Modal for Requirement Editing */}
      {editingReq && (
        <EditRequirementModal
          activeIssue={editingReq}
          activeUsers={activeUsers}
          onClose={() => setEditingReq(null)}
          onSave={(updatedIssue) => {
            safeUpdateIssue(updatedIssue);
            setEditingReq(null);
          }}
        />
      )}

      {/* Requirement Deletion Prevention & Confirmation Dialog */}
      {reqToDelete && (
        <DeleteRequirementDialog
          reqToDelete={reqToDelete}
          issues={issues}
          testCases={testCases}
          projectId={projectId}
          onClose={() => setReqToDelete(null)}
          onConfirmDelete={(id) => {
            safeDeleteIssue(id);
            if (selectedIssueId === id) {
              const remaining = filteredRequirements.filter((i) => i.id !== id);
              setSelectedIssueId(remaining.length > 0 ? remaining[0].id : null);
            }
            setReqToDelete(null);
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
        onFocusIssue={onFocusRequirement}
        onUnbindTestCase={handleUnbindTestCase}
      />

      {/* Global Toast inside Board */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[120] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-slide-in-right ${
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : toast.type === "error"
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <span className="text-xs font-bold leading-none">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
