/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, FileUp, Paperclip } from "lucide-react";
import {
  Issue,
  RequirementPriority,
  RequirementStatus,
  User as SystemUser,
  HistoryLog,
} from "../types";
import MarkdownWorkspace from "./MarkdownWorkspace";
import CustomDropdown from "./CustomDropdown";

interface EditRequirementModalProps {
  activeIssue: Issue;
  activeUsers: SystemUser[];
  onClose: () => void;
  onSave: (issue: Issue) => void;
}

export default function EditRequirementModal({
  activeIssue,
  activeUsers,
  onClose,
  onSave,
}: EditRequirementModalProps) {
  const [validationError, setValidationError] = useState("");
  const [title, setTitle] = useState(activeIssue.title || "");
  const [content, setContent] = useState(activeIssue.content || "");
  const [priority, setPriority] = useState<RequirementPriority>(
    activeIssue.priority as RequirementPriority || RequirementPriority.MP2
  );
  const [requirementStatus, setRequirementStatus] = useState<RequirementStatus>(
    activeIssue.requirementStatus as RequirementStatus || RequirementStatus.DRAFT
  );
  const [assigneeId, setAssigneeId] = useState(activeIssue.assigneeId || "");
  const [estimatedStartTime, setEstimatedStartTime] = useState(activeIssue.estimatedStartTime || "");
  const [estimatedEndTime, setEstimatedEndTime] = useState(activeIssue.estimatedEndTime || "");
  const [attachments, setAttachments] = useState<string[]>(
    activeIssue.attachmentUrls || []
  );

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];

    const validAttachments: string[] = [];

    files.forEach((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(
          `⚠️ 上传错误: 文件 "${file.name}" 大小（${(file.size / 1024 / 1024).toFixed(2)}MB）超出了限制，单个附件最多不可超过 10MB。`
        );
        return;
      }

      validAttachments.push(`[Local] ${file.name}`);
    });

    setAttachments((prev) => [...prev, ...validAttachments]);
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveEdit = () => {
    if (!title.trim()) {
      setValidationError("请输入业务需求标题描述后再保存编辑。");
      return;
    }
    setValidationError("");

    const currentUser = activeUsers[0] || { id: "u-sys", nickname: "管理员" };
    const newLogs: HistoryLog[] = [];
    const timestamp = new Date().toISOString();

    // 1. Title
    if (activeIssue.title !== title.trim()) {
      newLogs.push({
        id: `log-${Date.now()}-title-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "修改了需求名称",
        oldValue: activeIssue.title || "无",
        newValue: title.trim(),
        createdAt: timestamp,
      });
    }

    // 2. Content
    if ((activeIssue.content || "") !== (content || "")) {
      newLogs.push({
        id: `log-${Date.now()}-content-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "修改了需求描述",
        oldValue: activeIssue.content ? "原描述" : "无",
        newValue: content ? "新描述" : "无",
        createdAt: timestamp,
      });
    }

    // 3. Priority
    if (activeIssue.priority !== priority) {
      newLogs.push({
        id: `log-${Date.now()}-priority-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "调整了需求优先级",
        oldValue: activeIssue.priority,
        newValue: priority,
        createdAt: timestamp,
      });
    }

    // 4. Assignee
    const oldAssigneeId = activeIssue.assigneeId || "";
    const newAssigneeId = assigneeId || "";
    if (oldAssigneeId !== newAssigneeId) {
      const oldUser = activeUsers.find((u) => u.id === oldAssigneeId);
      const newUser = activeUsers.find((u) => u.id === newAssigneeId);
      newLogs.push({
        id: `log-${Date.now()}-assignee-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "变更了负责人",
        oldValue: oldUser ? oldUser.nickname : "未指派",
        newValue: newUser ? newUser.nickname : "未指派",
        createdAt: timestamp,
      });
    }

    // 5. Estimated Start Time
    const oldStart = activeIssue.estimatedStartTime || "";
    const newStart = estimatedStartTime || "";
    if (oldStart !== newStart) {
      newLogs.push({
        id: `log-${Date.now()}-start-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "更新了预估开始时间",
        oldValue: oldStart || "未设置",
        newValue: newStart || "未设置",
        createdAt: timestamp,
      });
    }

    // 6. Estimated End Time
    const oldEnd = activeIssue.estimatedEndTime || "";
    const newEnd = estimatedEndTime || "";
    if (oldEnd !== newEnd) {
      newLogs.push({
        id: `log-${Date.now()}-end-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "更新了预估结束时间",
        oldValue: oldEnd || "未设置",
        newValue: newEnd || "未设置",
        createdAt: timestamp,
      });
    }

    // 7. Attachments
    const oldAttachments = activeIssue.attachmentUrls || [];
    const newAttachments = attachments;
    if (JSON.stringify(oldAttachments) !== JSON.stringify(newAttachments)) {
      newLogs.push({
        id: `log-${Date.now()}-attachments-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        userName: currentUser.nickname,
        action: "更新了附件材料",
        oldValue: oldAttachments.length > 0 ? `${oldAttachments.length}个附件` : "无",
        newValue: newAttachments.length > 0 ? `${newAttachments.length}个附件` : "无",
        createdAt: timestamp,
      });
    }

    const updatedIssue: Issue = {
      ...activeIssue,
      title: title.trim(),
      content,
      priority,
      requirementStatus: activeIssue.requirementStatus || RequirementStatus.DRAFT,
      assigneeId: assigneeId || undefined,
      estimatedStartTime: estimatedStartTime || undefined,
      estimatedEndTime: estimatedEndTime || undefined,
      attachmentUrls: attachments,
      historyLogs: [...newLogs, ...(activeIssue.historyLogs || [])],
      updatedAt: timestamp,
    };

    onSave(updatedIssue);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in animate-duration-200" id="edit-requirement-modal-overlay">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[92vh] text-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <span className="inline-block h-2 w-2 bg-indigo-600 rounded-full"></span>
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                编辑业务需求
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                更新业务需求内容，系统将自动记录更新版本。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
          {validationError && (
            <div className="text-xs bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3 font-semibold animate-fade-in">
              ⚠️ {validationError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 pt-1 text-left">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                名称 *
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-850 outline-none focus:border-indigo-500 hover:border-slate-350 transition-all font-bold placeholder:text-slate-305"
                placeholder="请输入核心业务功能需求标题描述..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setValidationError("");
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                优先级
              </label>
              <CustomDropdown
                options={Object.values(RequirementPriority)}
                value={priority}
                onChange={(val) => setPriority(val as RequirementPriority)}
                placeholder="请选择优先级"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                负责人
              </label>
              <CustomDropdown
                options={[
                  { value: "", label: "--未指派负责人--" },
                  ...activeUsers.map((u) => ({
                    value: u.id,
                    label: `${u.nickname} (${u.group})`,
                  })),
                ]}
                value={assigneeId}
                onChange={(val) => setAssigneeId(val)}
                placeholder="--未指派负责人--"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                预估开始时间
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-850 outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-bold"
                value={estimatedStartTime}
                onChange={(e) => setEstimatedStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                预估结束时间
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-850 outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-bold"
                value={estimatedEndTime}
                onChange={(e) => setEstimatedEndTime(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                流转状态
              </label>
              <CustomDropdown
                options={[RequirementStatus.DRAFT]}
                value={RequirementStatus.DRAFT}
                onChange={() => {}}
                disabled={true}
                placeholder="请选择状态"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                描述
              </label>
              <MarkdownWorkspace
                value={content}
                onChange={(val) => setContent(val)}
                placeholder="输入规格书需求内容，支持 Markdown 语法，如编写列表或表格。"
              />
            </div>

            {/* Requirement Attachment Form */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                上传参考附件材料
              </label>

              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50/30 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3">
                    <FileUp className="w-5 h-5 mb-1 text-slate-400" />
                    <p className="text-[11px] text-slate-500 font-bold">
                      <span>点击上传</span>
                      <span className="text-slate-400 font-medium font-sans">
                        {" "}
                        或拖拽文件至此
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400 font-sans uppercase">
                      PDF, XLS, PNG, DMG, PPT (每个文件限制 &lt; 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  {attachments.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 animate-fade-in text-xs font-medium text-slate-705"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <div className="truncate pr-1.5">
                          <p className="font-bold text-slate-700 truncate">
                            {f}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-100 justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-500 px-5 py-2.5 transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSaveEdit}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 font-black text-xs text-white px-5 py-2.5 transition-all cursor-pointer shadow-md"
          >
            保存编辑
          </button>
        </div>
      </div>
    </div>
  );
}
