/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, FileUp, Paperclip } from "lucide-react";
import {
  Issue,
  IssueType,
  RequirementPriority,
  RequirementStatus,
  User as SystemUser,
} from "../types";
import MarkdownWorkspace from "./MarkdownWorkspace";
import CustomDropdown from "./CustomDropdown";
import { generateReqId } from "../lib/idUtils";

interface CreateRequirementModalProps {
  projectId: string;
  activeUsers: SystemUser[];
  onClose: () => void;
  onSave: (issue: Issue) => void;
}

export default function CreateRequirementModal({
  projectId,
  activeUsers,
  onClose,
  onSave,
}: CreateRequirementModalProps) {
  const [validationError, setValidationError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState(
    `### 业务背景概述\n请在此处输入具体的需求背景与业务逻辑目标...\n\n### 核心功能需求定义\n- [ ] 功能点 1\n- [ ] 功能点 2\n\n### 仿真验证拦截指标\n- 基线指标及覆盖场景说明： `
  );
  const [newPriority, setNewPriority] = useState<RequirementPriority>(
    RequirementPriority.MP2
  );
  const [newRequirementStatus, setNewRequirementStatus] =
    useState<RequirementStatus>(RequirementStatus.DRAFT);
  const [newAssigneeId, setNewAssigneeId] = useState(activeUsers[0]?.id || "");
  const [newEstimatedStartTime, setNewEstimatedStartTime] = useState("");
  const [newEstimatedEndTime, setNewEstimatedEndTime] = useState("");
  const [newImgUrl, setNewImgUrl] = useState("");

  // Custom mock physical attachment states
  const [mockAttachments, setMockAttachments] = useState<
    { name: string; size: string; type: string }[]
  >([]);

  // Mock File Upload change handler checking sizes
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];

    const validAttachments: { name: string; size: string; type: string }[] = [];

    files.forEach((file) => {
      // 10MB size limit check
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(
          `⚠️ 上传错误: 文件 "${file.name}" 大小（${(file.size / 1024 / 1024).toFixed(2)}MB）超出了限制，单个附件最多不可超过 10MB。`
        );
        return;
      }

      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

      validAttachments.push({
        name: file.name,
        size: sizeStr,
        type: file.type || "application/octet-stream",
      });
    });

    setMockAttachments((prev) => [...prev, ...validAttachments]);
  };

  const handleRemoveAttachment = (idx: number) => {
    setMockAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNew = () => {
    if (!newTitle.trim()) {
      setValidationError("请输入业务需求标题描述后再确定创建。");
      return;
    }
    setValidationError("");

    // Map attachments name to virtual urls
    const mappedAttachments = mockAttachments.map(
      (m) =>
        `https://veritab.sandbox/attachments/${encodeURIComponent(m.name)}`
    );

    const created: Issue = {
      id: generateReqId(),
      projectId,
      type: IssueType.REQUIREMENT,
      title: newTitle,
      content: newContent,
      priority: newPriority,
      requirementStatus: newRequirementStatus,
      assigneeId: newAssigneeId || undefined,
      estimatedStartTime: newEstimatedStartTime || undefined,
      estimatedEndTime: newEstimatedEndTime || undefined,
      attachmentUrls: mappedAttachments,
      imageUrl: newImgUrl || undefined,
      linkToTestCases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(created);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in animate-duration-200">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[92vh] text-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <span className="inline-block h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></span>
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                创建业务需求
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                录入功能规格说明，支持一键生成测试用例。
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
            <div className="sm:col-span-2 space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                名称 *
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-850 outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-bold placeholder:text-slate-400"
                placeholder="请输入核心业务功能需求标题描述..."
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (e.target.value.trim()) setValidationError("");
                }}
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                优先级
              </label>
              <CustomDropdown
                options={Object.values(RequirementPriority)}
                value={newPriority}
                onChange={(val) => setNewPriority(val as RequirementPriority)}
                placeholder="请选择优先级"
              />
            </div>

            <div className="space-y-1.5 text-left">
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
                value={newAssigneeId}
                onChange={(val) => setNewAssigneeId(val)}
                placeholder="--未指派负责人--"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                预估开始时间
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-850 outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-bold"
                value={newEstimatedStartTime}
                onChange={(e) => setNewEstimatedStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                预估结束时间
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-850 outline-none focus:border-indigo-500 hover:border-slate-300 transition-all font-bold"
                value={newEstimatedEndTime}
                onChange={(e) => setNewEstimatedEndTime(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5 text-left">
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

            <div className="sm:col-span-2 space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                描述
              </label>
              <MarkdownWorkspace
                value={newContent}
                onChange={(val) => setNewContent(val)}
                placeholder="输入规格书需求内容，支持 Markdown 语法，如编写列表或表格。"
              />
            </div>

            {/* Requirement Attachment Form */}
            <div className="sm:col-span-2 space-y-2 text-left">
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

              {mockAttachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  {mockAttachments.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 animate-fade-in text-xs font-medium text-slate-700"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <div className="truncate pr-1.5">
                          <p className="font-bold text-slate-700 truncate">
                            {f.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold font-sans">
                            {f.size}
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
            onClick={handleSaveNew}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 font-black text-xs text-white px-5 py-2.5 transition-all cursor-pointer shadow-md"
          >
            确定创建
          </button>
        </div>
      </div>
    </div>
  );
}
