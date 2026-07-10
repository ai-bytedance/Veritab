/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  Edit3,
  FileText,
  Paperclip,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  Zap,
  BookmarkCheck,
  AlertTriangle,
  User,
  X,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Send,
  Search,
} from "lucide-react";
import {
  Issue,
  DefectStatus,
  DefectSeverity,
  User as SystemUser,
  TestCase,
  UserGroup,
  ProjectTab
} from "../types";
import { checkPermission } from "../lib/permission";
import MarkdownWorkspace, { simpleMarkdownParse } from "./MarkdownWorkspace";
import { formatDefectId } from "../lib/idUtils";
import DefectWorkflow from "./DefectWorkflow";
import HistoryLogTimeline from "./HistoryLogTimeline";
import DefectCommentsSection from "./DefectCommentsSection";
import CustomDropdown from "./CustomDropdown";

interface DefectDetailViewProps {
  activeIssue: Issue;
  users: SystemUser[];
  testCases: TestCase[];
  requirements: Issue[];
  currentUser: SystemUser;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onUpdateField: (key: keyof Issue, val: any) => void;
  onUpdateStatus: (status: DefectStatus) => void;
  getNextAllowedStates: (current: DefectStatus) => any[];
  onToggleLinkedCase: (caseId: string) => void;
  onTriggerWebhook: (provider: string, payload: any) => void;
  onCreateFeishuGroup?: (payload: any) => Promise<any>;
  systemConfig?: any;
  userGroups?: UserGroup[];
}

const DefectDetailView: React.FC<DefectDetailViewProps> = ({
  activeIssue,
  users,
  testCases,
  requirements,
  currentUser,
  isEditing,
  setIsEditing,
  onUpdateField,
  onUpdateStatus,
  getNextAllowedStates,
  onToggleLinkedCase,
  onTriggerWebhook,
  onCreateFeishuGroup,
  systemConfig,
  userGroups = []
}) => {
  const checkActionPermission = (action: string) => {
    return checkPermission(currentUser || null, userGroups || [], ProjectTab.DEFECT, action);
  };

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [detailZoom, setDetailZoom] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [detailHeight, setDetailHeight] = useState<"normal" | "expanded">("normal");
  const [activeBottomTab, setActiveBottomTab] = useState<"comments" | "history">("comments");

  // --- 消息通知 ---
  const [selectedNotifyUsers, setSelectedNotifyUsers] = useState<any[]>([]);
  const [isNotifyDropdownOpen, setIsNotifyDropdownOpen] = useState(false);
  const [notifySearchQuery, setNotifySearchQuery] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const notifyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNotifyDropdownOpen) {
      setNotifySearchQuery("");
    }
  }, [isNotifyDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: Event) {
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
    if (isSendingNotification || !onTriggerWebhook || !activeIssue) return;
    setIsSendingNotification(true);
    try {
      const activeMembers = users ? users.filter((u: any) => u.status === "active") : [];
      const targets = selectedNotifyUsers.length > 0 ? selectedNotifyUsers : activeMembers;

      const payload = {
        title: `🔄 缺陷流转状态节点通知: ${activeIssue.title}`,
        type: "Defect",
        mentions: targets.map((t) => t.nickname),
        mentionsWithId: targets.map((t) => ({ nickname: t.nickname, feishuUserId: t.feishuUserId })),
        content: `缺陷当前最新流转状态为：【${activeIssue.defectStatus || "新建"}】\n请相关开发与测试人员留意，尽快排查、修复与闭环验证，避免影响发布窗口。`,
        link: window.location.href,
      };

      const res: any = await onTriggerWebhook("feishu", payload);
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
      const activeMembers = users.filter((u: any) => u.status === "active");
      const itemShortTitle = activeIssue.title.length > 15 ? activeIssue.title.substring(0, 15) + "..." : activeIssue.title;
      const groupTopic = `【缺陷跟进组】${itemShortTitle}`;

      await onCreateFeishuGroup({
        title: groupTopic,
        itemType: "Defect",
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

  const handleAddAttachment = () => {
    const url = prompt("请输入附件、图片或日志的远程 URL 地址:");
    if (url && url.trim()) {
      const newList = [...(activeIssue.attachmentUrls || []), url.trim()];
      onUpdateField("attachmentUrls", newList);
    }
  };

  return (
    <div
      className="rounded-xl border border-slate-100 bg-white p-4.5 space-y-4 animate-fade-in"
      id="defect-detail-panel"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-150 pb-4">
        <div className="flex-1 min-w-0 text-left">
          {/* Top Hierarchical Breadcrumb context */}
          <div className="flex items-center gap-1.5 text-[10.5px] select-none text-slate-400 font-semibold">
            <span className="text-[10px] font-black tracking-widest text-rose-600 font-mono uppercase bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0">
              {formatDefectId(activeIssue.id)}
            </span>
          </div>

          <h2 className="text-sm font-extrabold text-slate-800 leading-relaxed font-sans mt-2.5" title={activeIssue.title}>
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

      {/* Workflow */}
      {!isEditing && (
        <DefectWorkflow
          currentStatus={activeIssue.defectStatus || DefectStatus.NEW}
          onUpdateStatus={onUpdateStatus}
          getNextAllowedStates={getNextAllowedStates}
          users={users}
          onTriggerWebhook={onTriggerWebhook}
          activeIssue={activeIssue}
        />
      )}

      {/* Content Area */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5 select-none">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-600 font-sans">
            <span>
              {isEditing ? "缺陷详情与工作台（编辑模式）" : "缺陷详情与工作台"}
            </span>
          </div>

          {!isEditing && activeIssue.content && activeIssue.content.trim() !== "" && (
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
              {users && onTriggerWebhook && activeIssue && (
                <div className="relative" ref={notifyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotifyDropdownOpen(!isNotifyDropdownOpen)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    <Send className="h-3 w-3 text-rose-500" />
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
                          className="text-[9px] text-rose-600 hover:underline cursor-pointer font-bold"
                        >
                          默认全员
                        </button>
                      </div>

                      {/* Member checklist */}
                      <div className="space-y-1.5">
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                          选择接收人员 ({selectedNotifyUsers.length > 0 ? `${selectedNotifyUsers.length}人` : "默认全员"})
                        </div>

                        {users && users.filter((u: any) => u.status === "active").length > 5 && (
                          <div className="relative mb-2">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                            <input
                              type="text"
                              placeholder="搜索人员..."
                              value={notifySearchQuery}
                              onChange={(e) => setNotifySearchQuery(e.target.value)}
                              className="w-full pl-6.5 pr-6 py-1 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white rounded-md text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none transition-all font-sans"
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
                            const filtered = (users || [])
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
                                    isSelected ? "bg-rose-50/70 text-rose-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-600 text-[8px] font-bold flex items-center justify-center uppercase">
                                      {user.nickname.substring(0, 1)}
                                    </span>
                                    <span className="truncate">{user.nickname}</span>
                                  </div>
                                  {isSelected && <span className="text-rose-600 font-bold text-[10px]">✓</span>}
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
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
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
              )}

              {/* Zoom and Expand Controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 py-0.5 px-2 rounded-xl text-[10px] font-bold text-slate-500 font-sans">
                <span>预览缩放</span>
                <button type="button" onClick={() => setDetailZoom("sm")} className={`px-1 rounded ${detailZoom === "sm" ? "bg-rose-600 text-white font-bold" : "bg-white text-slate-600 cursor-pointer font-medium"}`}>小</button>
                <button type="button" onClick={() => setDetailZoom("base")} className={`px-1 rounded ${detailZoom === "base" ? "bg-rose-600 text-white font-bold" : "bg-white text-slate-600 cursor-pointer font-medium"}`}>中</button>
                <button type="button" onClick={() => setDetailZoom("lg")} className={`px-1 rounded ${detailZoom === "lg" ? "bg-rose-600 text-white font-bold" : "bg-white text-slate-600 cursor-pointer font-medium"}`}>大</button>
                <button type="button" onClick={() => setDetailZoom("xl")} className={`px-1 rounded ${detailZoom === "xl" ? "bg-rose-600 text-white font-bold" : "bg-white text-slate-600 cursor-pointer font-medium"}`}>超大</button>
                <span className="mx-1 text-slate-300">|</span>
                <span>卡片高度</span>
                <button type="button" onClick={() => setDetailHeight(prev => prev === "normal" ? "expanded" : "normal")} className="px-1.5 py-0.5 bg-white text-slate-600 border border-slate-200/60 hover:border-rose-500 hover:text-rose-600 rounded flex items-center gap-0.5 cursor-pointer text-[9px] font-black transition-all">
                  {detailHeight === "normal" ? "展开" : "收起"}
                </button>
              </div>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="space-y-4 p-4 bg-white rounded-xl border border-rose-100 shadow-3xs">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                  缺陷标题
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-400"
                  value={activeIssue.title}
                  onChange={(e) => onUpdateField("title", e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                    处理人
                  </label>
                  <CustomDropdown
                    options={[
                      { value: "", label: "--待指定处理人--" },
                      ...users.map((u) => ({ value: u.id, label: u.nickname })),
                    ]}
                    value={activeIssue.assigneeId || ""}
                    onChange={(val) => onUpdateField("assigneeId", val)}
                    placeholder="--待指定处理人--"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                    严重程度
                  </label>
                  <CustomDropdown
                    options={Object.values(DefectSeverity)}
                    value={activeIssue.severity || DefectSeverity.NORMAL}
                    onChange={(val) => onUpdateField("severity", val as DefectSeverity)}
                    placeholder="选择严重程度"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                    创建人
                  </label>
                  <CustomDropdown
                    options={[
                      { value: "", label: "--待指定创建人--" },
                      ...users.map((u) => ({ value: u.id, label: u.nickname })),
                    ]}
                    value={activeIssue.creatorId || ""}
                    onChange={(val) => onUpdateField("creatorId", val)}
                    placeholder="--待指定创建人--"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                  缺陷详细内容
                </label>
                <MarkdownWorkspace
                  value={activeIssue.content}
                  onChange={(val) => onUpdateField("content", val)}
                />
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 font-sans">
                  缺陷附件与复现素材
                </label>
                <input
                  type="file"
                  id="defect-attachment-upload"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (!e.target.files) return;
                    const files = Array.from(e.target.files) as File[];
                    const newUrls = files.map((f) => `[Local] ${f.name}`);
                    const newList = [
                      ...(activeIssue.attachmentUrls || []),
                      ...newUrls,
                    ];
                    onUpdateField("attachmentUrls", newList);
                  }}
                />
                <div className="flex items-center justify-center w-full">
                  <label
                    onClick={() =>
                      document
                        .getElementById("defect-attachment-upload")
                        ?.click()
                    }
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all hover:border-rose-400 shadow-sm"
                  >
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Paperclip className="w-5 h-5 mb-1 text-slate-400 group-hover:text-rose-600" />
                      <p className="text-[11px] text-slate-500 font-bold">
                        <span>点击上传</span>
                        <span className="text-slate-400 font-medium">
                          {" "}
                          或拖拽文件至此
                        </span>
                      </p>
                      <p className="text-[9px] text-slate-400 font-sans uppercase">
                        支持 PDF, XLS, PNG, DMG, PPT (单文件 &lt; 10MB)
                      </p>
                    </div>
                  </label>
                </div>
                {activeIssue.attachmentUrls &&
                  activeIssue.attachmentUrls.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 mt-2 font-sans">
                      {activeIssue.attachmentUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px]"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Paperclip className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <div className="truncate pr-1.5">
                              <p className="font-bold text-slate-700 truncate">
                                {url}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateField(
                                "attachmentUrls",
                                (activeIssue.attachmentUrls || []).filter(
                                  (_, i) => i !== idx,
                                ),
                              )
                            }
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
            <div className="flex justify-end gap-3 items-center">
              <span className="text-[10px] text-slate-400">
                💡 修改实时生效
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-[10px] text-rose-600 font-extrabold cursor-pointer border border-rose-200 bg-white hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                完成编辑并预览 →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeIssue.content && activeIssue.content.trim() !== "" && (
              <div className="space-y-2">

                {/* Metadata Bar for Defect Details */}
                <div className="flex flex-wrap items-center gap-2 select-none text-slate-500 py-1">
                  <span className={`text-[9.5px] font-black px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 shadow-3xs ${
                    activeIssue.severity === DefectSeverity.FATAL
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : activeIssue.severity === DefectSeverity.SERIOUS
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : activeIssue.severity === DefectSeverity.NORMAL
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    严重程度: {activeIssue.severity || DefectSeverity.NORMAL}
                  </span>

                  <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9.5px] font-bold font-sans">
                    处理人：{users.find((u) => u.id === activeIssue.assigneeId)?.nickname || "未指派"}
                  </span>

                  <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9.5px] font-bold font-sans">
                    创建人：{users.find((u) => u.id === activeIssue.creatorId)?.nickname || "未指派"}
                  </span>
                </div>

                <div className={`overflow-y-auto bg-white p-5 border border-slate-100 rounded-2xl shadow-3xs text-left ${detailHeight === "normal" ? "min-h-[14rem] max-h-[26rem]" : "min-h-[30rem] max-h-[50rem]"} transition-all`}>
                  <div className={`markdown-body ${detailZoom === "sm" ? "text-[11px] leading-relaxed" : detailZoom === "base" ? "text-xs sm:text-sm leading-relaxed" : detailZoom === "lg" ? "text-sm sm:text-base leading-relaxed" : "text-base sm:text-lg leading-relaxed"}`}>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: simpleMarkdownParse(activeIssue.content),
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeIssue.attachmentUrls &&
              activeIssue.attachmentUrls.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-wider font-sans">
                    <Paperclip className="h-4 w-4 text-rose-500" />
                    <span>
                      缺陷关联附件及复现素材资源 (
                      {activeIssue.attachmentUrls.length})
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {activeIssue.attachmentUrls.map((at, idx) => (
                      <a
                        key={idx}
                        href={at}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-400 transition-all group shadow-3xs hover:shadow-sm"
                      >
                        <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                          <ImageIcon className="h-4 w-4 text-rose-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-700 truncate group-hover:text-rose-600">
                            资源文件 #{idx + 1}
                          </p>
                          <p className="text-[9px] text-slate-400 truncate font-mono">
                            {at}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Tabbed Comments and Change Logs (History) */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mt-6 select-none font-sans">
              <button
                type="button"
                onClick={() => setActiveBottomTab("comments")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeBottomTab === "comments"
                    ? "bg-rose-50 text-rose-600 shadow-3xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>评论</span>
                {activeIssue.comments && activeIssue.comments.length > 0 && (
                  <span className={`ml-1.5 text-[9.5px] px-1.5 py-0.2 rounded-full ${activeBottomTab === "comments" ? "bg-rose-200/60 text-rose-700" : "bg-slate-100 text-slate-500"} font-black`}>
                    {activeIssue.comments.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveBottomTab("history")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeBottomTab === "history"
                    ? "bg-rose-50 text-rose-600 shadow-3xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>变更记录</span>
                {activeIssue.historyLogs && activeIssue.historyLogs.length > 0 && (
                  <span className={`ml-1.5 text-[9.5px] px-1.5 py-0.2 rounded-full ${activeBottomTab === "history" ? "bg-rose-200/60 text-rose-700" : "bg-slate-100 text-slate-500"} font-black`}>
                    {activeIssue.historyLogs.length}
                  </span>
                )}
              </button>
            </div>

            <div className="mt-3 animate-fade-in">
              {activeBottomTab === "comments" ? (
                <DefectCommentsSection
                  activeIssue={activeIssue}
                  currentUser={currentUser}
                  onUpdateField={onUpdateField}
                  users={users}
                  systemConfig={systemConfig}
                  onTriggerWebhook={onTriggerWebhook}
                />
              ) : (
                <div className="bg-slate-50/25 rounded-2xl border border-slate-100 p-4 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">变更记录</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">记录缺陷属性修改与状态流转变更历史</p>
                    </div>
                  </div>
                  <HistoryLogTimeline logs={activeIssue.historyLogs} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-slate-900 text-white text-xs py-2 px-3.5 rounded-xl shadow-xl animate-fade-in border border-slate-800 font-sans">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${toast.type === "success" ? "bg-emerald-400 animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DefectDetailView;
