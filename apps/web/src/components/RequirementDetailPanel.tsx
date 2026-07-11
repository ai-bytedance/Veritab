import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Paperclip,
  X,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  File as FileIcon,
  Send,
  AlertTriangle,
  UserPlus,
  Search
} from "lucide-react";
import {
  Issue,
  TestCase,
  RequirementStatus,
  RequirementPriority,
  ProjectTab,
  TestCaseStatus,
  TestCaseGrade,
  IssueType,
  DefectStatus,
  DefectSeverity,
  UserGroup
} from "../types";
import { checkPermission } from "../lib/permission";
import HistoryLogTimeline from "./HistoryLogTimeline";
import FeishuCollabWidget from "./FeishuCollabWidget";
import MarkdownWorkspace, { simpleMarkdownParse } from "./MarkdownWorkspace";
import { robustJsonParse, mapAITestCase } from "../lib/aiUtils";
import { formatReqId, formatDefectId, generateCaseId } from "../lib/idUtils";
import ResourceAttachments from "./ResourceAttachments";
import { RequirementApiScope } from "../features/requirements/api/types";
import { useResourceHistory } from "../features/history/useResourceHistory";

export interface RequirementDetailPanelProps {
  projectId: string;
  activeIssue: Issue;
  issues: Issue[];
  testCases: TestCase[];
  onUpdateIssue: (issue: Issue) => void;
  onDeleteTestCase?: (id: string) => void;
  onInvokeAI: (prompt: string) => Promise<string>;
  onAddTestCaseBatch: (cases: TestCase[]) => void;
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusTestCase?: (id: string) => void;
  onTriggerWebhook: (provider: string, payload: any) => void;
  onCreateFeishuGroup?: (payload: any) => Promise<any>;
  activeUsers: any[];
  systemConfig: any;
  onPromptMissing?: () => void;
  initialEditMode?: boolean;
  currentUser?: any;
  userGroups?: UserGroup[];
  apiScope: RequirementApiScope;
}

export default function RequirementDetailPanel({
  projectId,
  activeIssue,
  issues,
  testCases,
  onUpdateIssue,
  onDeleteTestCase,
  onInvokeAI,
  onAddTestCaseBatch,
  onNavigateToTab,
  onFocusTestCase,
  onTriggerWebhook,
  onCreateFeishuGroup,
  activeUsers,
  systemConfig,
  onPromptMissing,
  initialEditMode = false,
  currentUser,
  userGroups = [],
  apiScope,
}: RequirementDetailPanelProps) {
  const historyLogs = useResourceHistory("requirements", apiScope, activeIssue.id).data;
  const checkActionPermission = (action: string) => {
    return checkPermission(currentUser || null, userGroups || [], ProjectTab.REQUIREMENT, action);
  };

  const isEditingContent = false;
  const [aiGenerating, setAiGenerating] = useState(false);
  const [linkedDefectsPage, setLinkedDefectsPage] = useState(1);
  const [detailZoom, setDetailZoom] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [detailHeight, setDetailHeight] = useState<"normal" | "expanded">("normal");
  const [isDefectsExpanded, setIsDefectsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const LINKED_DEFECTS_PER_PAGE = 4;

  // --- 消息通知 & 一键拉群 state ---
  const [selectedNotifyUsers, setSelectedNotifyUsers] = useState<any[]>([]);
  const [isNotifyDropdownOpen, setIsNotifyDropdownOpen] = useState(false);
  const [notifySearchQuery, setNotifySearchQuery] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const notifyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNotifyDropdownOpen) {
      setNotifySearchQuery("");
    }
  }, [isNotifyDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifyDropdownRef.current && !notifyDropdownRef.current.contains(event.target as Node)) {
        setIsNotifyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifyUserSelection = (user: any) => {
    const exists = selectedNotifyUsers.find((u) => u.id === user.id);
    if (exists) {
      setSelectedNotifyUsers(selectedNotifyUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedNotifyUsers([...selectedNotifyUsers, user]);
    }
  };

  const getNotifySelectionText = () => {
    if (selectedNotifyUsers.length === 0) {
      return "全员";
    }
    if (selectedNotifyUsers.length === 1) {
      return `@${selectedNotifyUsers[0].nickname}`;
    }
    return `@${selectedNotifyUsers[0].nickname} 等 ${selectedNotifyUsers.length} 人`;
  };

  const handleSendNotify = async () => {
    if (!checkActionPermission("notify")) {
      setToast({
        message: "⚠️ 您所属的工作群组无权进行“推送飞书消息状态通知”操作！",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (isSendingNotification) return;
    setIsSendingNotification(true);
    try {
      const activeMembers = activeUsers.filter((u: any) => u.status === "active");
      const targets = selectedNotifyUsers.length > 0 ? selectedNotifyUsers : activeMembers;
      const currentStatus = activeIssue.requirementStatus || RequirementStatus.DEVELOPING;

      const payload = {
        title: `🔄 需求流转节点状态通知: ${activeIssue.title}`,
        type: "Requirement",
        mentions: targets.map((t) => t.nickname),
        mentionsWithId: targets.map((t) => ({ nickname: t.nickname, feishuUserId: t.feishuUserId })),
        content: `需求当前最新流转状态为：【${currentStatus}】\n请各开发、测试与协作者人员留意，若状态发生改变请及时关注最新测试进度与验收条件。`,
        link: window.location.href,
      };

      const res: any = await (onTriggerWebhook as any)("feishu", payload);
      setToast({
        message: res?.message || "已成功向选定人员发送飞书卡片通知！",
        type: "success"
      });
      setTimeout(() => setToast(null), 3000);
      setIsNotifyDropdownOpen(false);
    } catch (e: any) {
      console.error(e);
      setToast({
        message: e.message || "消息推送失败",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleGroupCreate = async () => {
    if (!checkActionPermission("group_chat")) {
      setToast({
        message: "⚠️ 您所属的工作群组无权进行“一键拉起工作群聊”操作！",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!onCreateFeishuGroup || isGrouping) return;
    setIsGrouping(true);
    try {
      const activeMembers = activeUsers.filter((u: any) => u.status === "active");
      const itemShortTitle = activeIssue.title.length > 15 ? activeIssue.title.substring(0, 15) + "..." : activeIssue.title;
      const groupTopic = `【需求组】${itemShortTitle}`;

      await onCreateFeishuGroup({
        title: groupTopic,
        itemType: "Requirement",
        itemId: activeIssue.id,
        itemTitle: activeIssue.title,
        members: activeMembers,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGrouping(false);
    }
  };

  const handleRequirementStatusChange = (statusVal: RequirementStatus) => {
    if (!activeIssue) return;
    if (activeIssue.requirementStatus === statusVal) return;

    const currentStatus = activeIssue.requirementStatus || RequirementStatus.DRAFT;
    const currentUser = activeUsers[0] || { id: "u-sys", nickname: "管理员" };

    const newLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.nickname,
      action: "变更了需求状态",
      oldValue: currentStatus,
      newValue: statusVal,
      createdAt: new Date().toISOString()
    };

    onUpdateIssue({
      ...activeIssue,
      requirementStatus: statusVal,
      historyLogs: [newLog, ...(activeIssue.historyLogs || [])],
      updatedAt: new Date().toISOString()
    });

    if (systemConfig.feishuConfig.enabled && systemConfig.feishuConfig.notifyOnStatusChange) {
      const assigneeUser = activeUsers.find((u: any) => u.id === activeIssue.assigneeId);
      const nickname = assigneeUser ? assigneeUser.nickname : "负责人";

      const payload = {
        title: `🔄 需求生命周期流转变化: ${activeIssue.title}`,
        type: "RequirementStatusChanged",
        content: `需求节点已流转更新至：【${statusVal}】\n进行派发对应人员：@${nickname}`,
        link: window.location.href,
        isAutoTrigger: true,
      };

      onTriggerWebhook("feishu", payload);
    }
  };

  const handleAIGeneratedCase = async () => {
    if (!checkActionPermission("ai_generate")) {
      setToast({
        message: "⚠️ 您所属的工作群组无权进行“AI 智能生成用例”操作！",
        type: "warning"
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!activeIssue) return;

    if (!systemConfig?.aiPromptTemplate || !systemConfig.aiPromptTemplate.trim()) {
      if (onPromptMissing) {
        onPromptMissing();
      } else {
        alert("请先在「系统配置」中配置定用例生成策略。");
      }
      return;
    }

    setAiGenerating(true);
    try {
      const basePrompt = systemConfig.aiPromptTemplate;
      const prompt = `${basePrompt}

请针对以下【业务需求：${activeIssue.title}】的 Markdown 规格说明，严格按照约定的 JSON 数组格式选择性衍生测试用例：
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

      const updatedLinkedCases = [...(activeIssue.linkToTestCases || []), ...formattedCases.map((tc) => tc.id)];
      onUpdateIssue({
        ...activeIssue,
        linkToTestCases: updatedLinkedCases,
        updatedAt: new Date().toISOString()
      });

      onAddTestCaseBatch(formattedCases);

      setTimeout(() => {
        // user requested to confirm before jumping, but we don't have modals,
        // so we don't auto-jump anymore. They can navigate manually.
      }, 500);
    } catch (err: any) {
      console.error("AI用例解析失败：" + err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleMarkdownChange = (val: string) => {
    if (!activeIssue) return;
    onUpdateIssue({
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

  const linkedDefects = issues.filter(
    (i) => i.projectId === projectId && i.type === IssueType.DEFECT && i.linkToRequirements?.includes(activeIssue.id)
  );

  const openDefects = linkedDefects.filter(d => d.defectStatus !== DefectStatus.CLOSED && d.defectStatus !== DefectStatus.RESOLVED);

  const totalDefectPages = Math.max(1, Math.ceil(linkedDefects.length / LINKED_DEFECTS_PER_PAGE));
  const paginatedDefects = linkedDefects
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(
      (linkedDefectsPage - 1) * LINKED_DEFECTS_PER_PAGE,
      linkedDefectsPage * LINKED_DEFECTS_PER_PAGE
    );

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4.5 space-y-4 animate-fade-in" id="requirement-detail-panel">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10.5px] select-none text-slate-400 font-semibold">
            <span className="text-[10px] font-black tracking-widest text-indigo-700 font-mono uppercase bg-indigo-50 px-2.5 py-1 rounded">
              {formatReqId(activeIssue.id)}
            </span>
          </div>
          <h2 className="text-md font-extrabold text-slate-800 mt-2.5 leading-relaxed">
            {activeIssue.title}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans shadow-3xs">
            更新于：{new Date(activeIssue.updatedAt).toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            })}
          </span>
        </div>
      </div>

      {/* Interactive Functional Status Lifecycle Pipe */}
      {!isEditingContent && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-4" id="requirement-lifecycle-pipe">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
              <span>流转泳道</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded font-black font-sans text-[10px] shrink-0">
                当前流程: {activeIssue.requirementStatus || RequirementStatus.DEVELOPING}
              </span>
            </div>
          </div>

          <div className="relative pt-2 pb-1 px-1">
            <div className="absolute top-5 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 rounded" />

            {(() => {
              const statusesList = Object.values(RequirementStatus);
              const currentStatus = activeIssue.requirementStatus || RequirementStatus.DEVELOPING;
              const currentIndex = statusesList.indexOf(currentStatus);
              const percent = (currentIndex / (statusesList.length - 1)) * 100;
              return (
                <div
                  className="absolute top-5 left-4 h-1 bg-indigo-500 -translate-y-1/2 rounded transition-all duration-300 ease-out"
                  style={{ width: `calc(${percent}% - 8px)` }}
                />
              );
            })()}

            <div className="relative flex justify-between">
              {Object.values(RequirementStatus).map((statusVal, idx) => {
                const statusesList = Object.values(RequirementStatus);
                const currentStatus = activeIssue.requirementStatus || RequirementStatus.DEVELOPING;
                const currentIndex = statusesList.indexOf(currentStatus);
                const isPassed = idx <= currentIndex;
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={statusVal}
                    type="button"
                    onClick={() => handleRequirementStatusChange(statusVal)}
                    className="group flex flex-col items-center focus:outline-none cursor-pointer z-10"
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCurrent ? "bg-indigo-600 border-indigo-600 text-white" : isPassed ? "bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-slate-200 text-slate-300"}`}>
                      {isPassed && !isCurrent ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[9px] font-black">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-bold transition-all ${isCurrent ? "text-indigo-600" : isPassed ? "text-slate-700" : "text-slate-400"}`}>
                      {statusVal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Markdown Workspace or Preview */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5 select-none">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-600">
            <span>{isEditingContent ? "需求详情与工作台（编辑模式）" : "需求详情与工作台"}</span>
          </div>

          {!isEditingContent && activeIssue.content && activeIssue.content.trim() !== "" && (
            <div className="flex flex-wrap items-center gap-3">
              {onCreateFeishuGroup && (
                <button
                  type="button"
                  onClick={handleGroupCreate}
                  disabled={isGrouping}
                  className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {isGrouping ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  )}
                  <span>一键拉群</span>
                </button>
              )}

              {/* 消息通知 & 接收人 融合组件 */}
              <div className="relative" ref={notifyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifyDropdownOpen(!isNotifyDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  <Send className="h-3 w-3 text-indigo-500" />
                  <span>消息通知 ({getNotifySelectionText()})</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {isNotifyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2.5 z-50 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-extrabold text-slate-700">推送状态通知卡片</span>
                      <button
                        type="button"
                        onClick={() => setSelectedNotifyUsers([])}
                        className="text-[9px] text-indigo-600 hover:underline cursor-pointer font-bold"
                      >
                        默认全员
                      </button>
                    </div>

                    {/* Member checklist */}
                    <div className="space-y-1.5">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                        选择接收人员 ({selectedNotifyUsers.length > 0 ? `${selectedNotifyUsers.length}人` : "默认全员"})
                      </div>

                      {/* Search box if there are more than 5 active users */}
                      {activeUsers.filter((u: any) => u.status === "active").length > 5 && (
                        <div className="relative mb-2">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="搜索人员..."
                            value={notifySearchQuery}
                            onChange={(e) => setNotifySearchQuery(e.target.value)}
                            className="w-full pl-6.5 pr-6 py-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-md text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none transition-all font-sans"
                          />
                          {notifySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setNotifySearchQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {(() => {
                          const filtered = activeUsers
                            .filter((u: any) => u.status === "active")
                            .filter((user: any) => {
                              if (!notifySearchQuery) return true;
                              const q = notifySearchQuery.toLowerCase();
                              return (
                                user.nickname?.toLowerCase().includes(q) ||
                                user.username?.toLowerCase().includes(q) ||
                                user.email?.toLowerCase().includes(q)
                              );
                            });
                          const displayed = notifySearchQuery ? filtered : filtered.slice(0, 5);
                          return displayed.map((user: any) => {
                            const isSelected = selectedNotifyUsers.some((u) => u.id === user.id);
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleNotifyUserSelection(user)}
                                className={`w-full text-left px-2 py-1 rounded flex items-center justify-between text-[10px] transition-colors cursor-pointer ${
                                  isSelected ? "bg-indigo-50/70 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-600 text-[8px] font-bold flex items-center justify-center uppercase">
                                    {user.nickname.substring(0, 1)}
                                  </span>
                                  <span className="truncate">{user.nickname}</span>
                                </div>
                                {isSelected && <span className="text-indigo-600 font-bold text-[10px]">✓</span>}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Action button inside the panel */}
                    <button
                      type="button"
                      onClick={handleSendNotify}
                      disabled={isSendingNotification}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                    >
                      {isSendingNotification ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>通知发送中...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          <span>立即发送</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAIGeneratedCase}
                disabled={aiGenerating}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
              >
                {aiGenerating && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                )}
                <span>AI 智能生成用例</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-100 py-0.5 px-2 rounded-xl text-[10px] font-bold text-slate-500">
                <span>预览缩放</span>
                <button type="button" onClick={() => setDetailZoom("sm")} className={`px-1 rounded ${detailZoom === "sm" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 cursor-pointer"}`}>小</button>
                <button type="button" onClick={() => setDetailZoom("base")} className={`px-1 rounded ${detailZoom === "base" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 cursor-pointer"}`}>中</button>
                <button type="button" onClick={() => setDetailZoom("lg")} className={`px-1 rounded ${detailZoom === "lg" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 cursor-pointer"}`}>大</button>
                <button type="button" onClick={() => setDetailZoom("xl")} className={`px-1 rounded ${detailZoom === "xl" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 cursor-pointer"}`}>超大</button>
                <span className="mx-1 text-slate-300">|</span>
                <span>卡片高度</span>
                <button type="button" onClick={() => setDetailHeight(prev => prev === "normal" ? "expanded" : "normal")} className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-200/60 hover:border-indigo-500 hover:text-indigo-600 rounded flex items-center gap-0.5 cursor-pointer text-[9px] font-black transition-all">
                  {detailHeight === "normal" ? "展开" : "收起"}
                </button>
              </div>
            </div>
          )}
        </div>

        {isEditingContent ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">需求名称</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none"
                  value={activeIssue.title}
                  onChange={(e) => onUpdateIssue({ ...activeIssue, title: e.target.value, updatedAt: new Date().toISOString() })}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">优先级</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
                  value={activeIssue.priority}
                  onChange={(e) => onUpdateIssue({ ...activeIssue, priority: e.target.value as RequirementPriority, updatedAt: new Date().toISOString() })}
                >
                  {Object.values(RequirementPriority).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">负责人</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
                  value={activeIssue.assigneeId || ""}
                  onChange={(e) => onUpdateIssue({ ...activeIssue, assigneeId: e.target.value || undefined, updatedAt: new Date().toISOString() })}
                >
                  <option value="">--未指派负责人--</option>
                  {activeUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nickname}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5">需求描述与说明书规格</label>
                <MarkdownWorkspace
                  value={activeIssue.content}
                  onChange={handleMarkdownChange}
                  placeholder="请输入需求说明书 (支持标准 Markdown 语法)..."
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 font-sans">需求附件与素材管理</label>

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Paperclip className="w-5 h-5 mb-1 text-slate-400" />
                      <p className="text-[11px] text-slate-500 font-bold">
                        <span>点击上传</span>
                        <span className="text-slate-400 font-medium"> 或拖拽文件至此</span>
                      </p>
                      <p className="text-[9px] text-slate-400 font-sans uppercase">支持 PDF, XLS, PNG, DMG, PPT (单文件 &lt; 10MB)</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (!e.target.files) return;
                        const files = Array.from(e.target.files) as File[];
                        const newUrls = files.map(f => `[Local] ${f.name}`);
                        const newList = [...(activeIssue.attachmentUrls || []), ...newUrls];
                        onUpdateIssue({ ...activeIssue, attachmentUrls: newList, updatedAt: new Date().toISOString() });
                      }}
                    />
                  </label>
                </div>

                {activeIssue.attachmentUrls && activeIssue.attachmentUrls.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 mt-2">
                    {activeIssue.attachmentUrls.map((at, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px]">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Paperclip className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <div className="truncate pr-1.5">
                            <p className="font-bold text-slate-700 truncate">{at}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newList = (activeIssue.attachmentUrls || []).filter((_, i) => i !== idx);
                            onUpdateIssue({ ...activeIssue, attachmentUrls: newList, updatedAt: new Date().toISOString() });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {}}
                className="text-[10px] text-indigo-600 font-extrabold cursor-pointer border border-indigo-200 bg-white hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                完成编辑并预览 →
              </button>
            </div>
          </div>
        ) : !activeIssue.content || activeIssue.content.trim() === "" ? (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-500 gap-3">
            <span className="italic flex items-center gap-1.5 text-left">
              <AlertTriangle className="h-4 w-4 text-slate-400 shrink-0" />
              暂无业务需求说明书内容。请使用需求列表操作列的「编辑」按钮，在弹出的独立编辑窗中补充内容。
            </span>
          </div>
        ) : (
          <div className="space-y-2">

            {/* Metadata Bar for Priority, Assignee, and Estimated Time */}
            <div className="flex flex-wrap items-center gap-2 select-none text-slate-500 py-1">
              <span className={`text-[9.5px] font-black px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 shadow-3xs ${getPriorityBadgeClass(activeIssue.priority)}`}>
                优先级: {activeIssue.priority || "中-P2"}
              </span>

              <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9.5px] font-bold font-sans">
                负责人: {activeUsers.find((u) => u.id === activeIssue.assigneeId)?.nickname || "未指派"}
              </span>

              <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9.5px] font-bold font-sans">
                预估时间: {activeIssue.estimatedStartTime ? `${activeIssue.estimatedStartTime} 至 ${activeIssue.estimatedEndTime || "未设定"}` : "未设定"}
              </span>
            </div>

            <div className={`overflow-y-auto bg-white p-5 border border-slate-100 rounded-2xl shadow-3xs ${detailHeight === "normal" ? "min-h-[14rem] max-h-[26rem]" : "min-h-[30rem] max-h-[50rem]"} transition-all`}>
              <div
                className={`markdown-body ${detailZoom === "sm" ? "text-[11px] leading-relaxed" : detailZoom === "base" ? "text-xs sm:text-sm leading-relaxed" : detailZoom === "lg" ? "text-sm sm:text-base leading-relaxed" : "text-base sm:text-lg leading-relaxed"}`}
                dangerouslySetInnerHTML={{ __html: simpleMarkdownParse(activeIssue.content) }}
              />
            </div>
          </div>
        )}
      </div>

      <ResourceAttachments scope={apiScope} resourceType="REQUIREMENT" resourceId={activeIssue.id} />

      {/* Simplified Traceability, Feishu, and Audit History (Visible in preview/reading mode only) */}
      {!isEditingContent && (
        <>
          {/* Tabbed Style for Change Logs to Match Defect Page */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mt-6 select-none font-sans" id="requirement-timeline">
            <button
              type="button"
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-50 text-indigo-600 shadow-3xs cursor-default"
            >
              <span>变更记录</span>
              {historyLogs && historyLogs.length > 0 && (
                <span className="ml-1.5 text-[9.5px] px-1.5 py-0.2 rounded-full bg-indigo-200/60 text-indigo-700 font-black">
                  {historyLogs.length}
                </span>
              )}
            </button>
          </div>

          <div className="mt-3 animate-fade-in font-sans">
            <div className="bg-slate-50/25 rounded-2xl border border-slate-100 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">变更记录</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">记录需求属性变更与状态流转历史</p>
                </div>
              </div>
              <HistoryLogTimeline logs={historyLogs} />
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-slate-900 text-white text-xs py-2 px-3.5 rounded-xl shadow-xl animate-fade-in border border-slate-800 font-sans">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${toast.type === "success" ? "bg-emerald-400 animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
