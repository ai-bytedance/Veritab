/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  ChevronDown,
  Check,
  MessageSquare,
  UserPlus
} from "lucide-react";
import { User as SystemUser } from "../types";

interface FeishuCollabWidgetProps {
  itemId: string;
  itemType: "Requirement" | "Defect" | "TestCase";
  itemTitle: string;
  itemContent: string;
  itemPriorityOrSeverity?: string; // e.g. Priority or Severity
  activeUsers: SystemUser[];
  onTriggerWebhook: (provider: string, payload: any) => void;
  onCreateFeishuGroup?: (payload: {
    title: string;
    itemType: "Requirement" | "Defect" | "TestCase";
    itemId: string;
    itemTitle: string;
    members: SystemUser[];
  }) => Promise<any>;
}

export default function FeishuCollabWidget({
  itemId,
  itemType,
  itemTitle,
  itemContent,
  itemPriorityOrSeverity,
  activeUsers,
  onTriggerWebhook,
  onCreateFeishuGroup,
}: FeishuCollabWidgetProps) {
  const activeMembers = activeUsers.filter((u) => u.status === "active");

  const [selectedUsers, setSelectedUsers] = useState<SystemUser[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleUserSelection = (user: SystemUser) => {
    const exists = selectedUsers.find((u) => u.id === user.id);
    if (exists) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const selectAll = () => {
    setSelectedUsers([]);
  };

  const getSelectionText = () => {
    if (selectedUsers.length === 0) {
      return "全员";
    }
    if (selectedUsers.length === 1) {
      return `@${selectedUsers[0].nickname}`;
    }
    return `@${selectedUsers[0].nickname} 等 ${selectedUsers.length} 人`;
  };

  const handlePushWebhook = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const targets = selectedUsers.length > 0 ? selectedUsers : activeMembers;
      const payload = {
        title: `${itemType === "Defect" ? "🚨 缺陷故障跟进" : itemType === "Requirement" ? "📌 需求流转" : "🧪 测试进度"}: ${itemTitle}`,
        type: itemType,
        mentions: targets.map((t) => t.nickname),
        mentionsWithId: targets.map((t) => ({ nickname: t.nickname, feishuUserId: t.feishuUserId })),
        content: itemContent.substring(0, 150) + (itemContent.length > 150 ? "..." : ""),
        priority: itemPriorityOrSeverity || "常规",
        link: window.location.href,
      };
      await onTriggerWebhook("feishu", payload);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleGroupCreate = async () => {
    if (!onCreateFeishuGroup || isGrouping) return;
    setIsGrouping(true);

    try {
      const targets = selectedUsers.length > 0 ? selectedUsers : activeMembers;
      const itemShortTitle = itemTitle.length > 15 ? itemTitle.substring(0, 15) + "..." : itemTitle;
      const groupTopic = `${itemType === "Defect" ? "【缺陷跟进组】" : itemType === "Requirement" ? "【需求组】" : "【测试群】"}${itemShortTitle}`;

      await onCreateFeishuGroup({
        title: groupTopic,
        itemType,
        itemId,
        itemTitle,
        members: targets,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGrouping(false);
    }
  };

  return (
    <div
      className="border border-slate-200/80 rounded-xl p-3 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans transition-all"
      id={`feishu-compact-widget-${itemId}`}
    >
      {/* Short and space-efficient text info */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-700">飞书即时协同</span>
            <span className="text-[9px] px-1 bg-sky-150/50 text-sky-700 rounded-sm font-medium border border-sky-200/30">
              Lark
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">
            配置关联成员并一键消息通知或创建会话组
          </p>
        </div>
      </div>

      {/* Extreme space-saving controls */}
      <div className="flex items-center flex-wrap gap-1.5 justify-end">
        {/* User selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-[10px] text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
          >
            <span>协作人: {getSelectionText()}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 z-40 w-48 bg-white rounded-lg shadow-lg border border-slate-100 p-1.5 space-y-1 animate-scale-up">
              <div className="text-[9px] font-bold text-slate-400 px-1.5 pb-1 border-b border-slate-50 flex justify-between items-center">
                <span>指定协作范围</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-indigo-600 hover:underline text-[9px] cursor-pointer"
                >
                  清除
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                <button
                  type="button"
                  onClick={selectAll}
                  className={`w-full text-left px-1.5 py-1 rounded flex items-center justify-between text-[10px] transition-colors cursor-pointer ${
                    selectedUsers.length === 0 ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>👥 默认全员</span>
                  {selectedUsers.length === 0 && <Check className="h-3 w-3" />}
                </button>

                {activeMembers.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUserSelection(user)}
                      className={`w-full text-left px-1.5 py-1 rounded flex items-center justify-between text-[10px] transition-colors cursor-pointer ${
                        isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className="truncate">{user.nickname}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action: Send notification is now clean and compact */}
        <button
          type="button"
          onClick={handlePushWebhook}
          disabled={isSending}
          className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50/20 text-slate-600 hover:text-sky-600 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          <Send className={`h-2.5 w-2.5 ${isSending ? "animate-spin" : "text-sky-500"}`} />
          <span>{isSending ? "推送中" : "消息通知"}</span>
        </button>

        {/* Action: Create Group */}
        {onCreateFeishuGroup && (
          <button
            type="button"
            onClick={handleGroupCreate}
            disabled={isGrouping}
            className="inline-flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="h-2.5 w-2.5 shrink-0" />
            <span>{isGrouping ? "加群中" : "一键拉群"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
