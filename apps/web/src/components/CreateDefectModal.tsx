/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Issue, IssueType, DefectSeverity, DefectStatus, User } from "../types";
import MarkdownWorkspace from "./MarkdownWorkspace";
import CustomDropdown from "./CustomDropdown";
import { generateDefectId } from "../lib/idUtils";

interface CreateDefectModalProps {
  projectId: string;
  activeUsers: User[];
  requirements: Issue[];
  currentUser?: User;
  onClose: () => void;
  onSave: (issue: Issue) => void;
}

const CreateDefectModal: React.FC<CreateDefectModalProps> = ({
  projectId,
  activeUsers,
  requirements,
  currentUser,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(
    "### 缺陷复现步骤\n1.\n2.\n\n### 期望结果\n- \n\n### 实际结果\n- "
  );
  const [severity, setSeverity] = useState<DefectSeverity>(DefectSeverity.NORMAL);
  const [status] = useState<DefectStatus>(DefectStatus.NEW);
  const [assigneeId, setAssigneeId] = useState(activeUsers[0]?.id || "");
  const [creatorId, setCreatorId] = useState(currentUser?.id || activeUsers[0]?.id || "");
  const [linkedReqId, setLinkedReqId] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setValidationError("请输入缺陷标题描述后再提交录入。");
      return;
    }
    setValidationError("");
    const created: Issue = {
      id: generateDefectId(),
      projectId,
      type: IssueType.DEFECT,
      title: title.trim(),
      content,
      severity,
      defectStatus: status,
      assigneeId: assigneeId || undefined,
      creatorId: creatorId || undefined,
      linkToRequirements: linkedReqId ? [linkedReqId] : [],
      attachmentUrls: attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(created);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                录入新缺陷报告
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                提报仿真故障偏离并流转处理责任，联动各视图质控链路。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-405 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">

          {validationError && (
            <div className="text-xs bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3 font-semibold animate-fade-in">
              ⚠️ {validationError}
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 pt-1 text-left">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">缺陷标题 *</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-205 border-slate-200 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50/20 transition-all placeholder:text-slate-400 font-bold"
                placeholder="e.g. 仿真运行中检测到致命浮点数运算越界溢出错误..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setValidationError("");
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">关联来源需求</label>
              <CustomDropdown
                options={[
                  { value: "", label: "--未关联需求--" },
                  ...requirements.map((req) => ({ value: req.id, label: req.title }))
                ]}
                value={linkedReqId}
                onChange={(val) => setLinkedReqId(val)}
                placeholder="--未关联需求--"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">处理人</label>
              <CustomDropdown
                options={[
                  { value: "", label: "--待指定处理人--" },
                  ...activeUsers.map((u) => ({
                    value: u.id,
                    label: `${u.nickname} (${u.group})`,
                  })),
                ]}
                value={assigneeId}
                onChange={(val) => setAssigneeId(val)}
                placeholder="--待指定处理人--"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">创建人</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500 outline-none font-semibold cursor-not-allowed text-left"
                value={(() => {
                  const activeCreator = activeUsers.find(u => u.id === creatorId) || currentUser;
                  return activeCreator ? activeCreator.nickname : "系统登录用户";
                })()}
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">严重程度</label>
                <CustomDropdown
                  options={Object.values(DefectSeverity)}
                  value={severity}
                  onChange={(val) => setSeverity(val as DefectSeverity)}
                  placeholder="选择严重程度"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">缺陷初始状态</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500 outline-none font-semibold cursor-not-allowed"
                  value={status}
                  disabled
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">缺陷详细内容描述</label>
              <MarkdownWorkspace
                value={content}
                onChange={(val) => setContent(val)}
                placeholder="请输入缺陷相关的仿真环境配置、重现步骤以及具体报错日志等内容..."
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">附件与参考素材</label>
              <input
                type="file"
                id="create-defect-attachment-upload"
                className="hidden"
                multiple
                onChange={(e) => {
                  if (!e.target.files) return;
                  const files = Array.from(e.target.files) as File[];
                  const newUrls = files.map(f => `[Local] ${f.name}`);
                  setAttachments(prev => [...prev, ...newUrls]);
                }}
              />
              <div className="flex items-center justify-center w-full">
                <label
                  onClick={() => document.getElementById("create-defect-attachment-upload")?.click()}
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50/30 hover:bg-slate-50 transition-all hover:border-rose-450 hover:border-rose-400 shadow-3xs"
                >
                  <div className="flex flex-col items-center justify-center pt-3 pb-3">
                    <Paperclip className="w-5 h-5 mb-1 text-slate-400" />
                    <p className="text-[11px] text-slate-500 font-bold">
                      <span>点击上传资源</span>
                      <span className="text-slate-400 font-medium font-sans"> 或拖拽文件至此</span>
                    </p>
                    <p className="text-[9px] text-slate-400 font-sans uppercase">支持 PDF, XLS, PNG, DMG, PPT (单文件 &lt; 10MB)</p>
                  </div>
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  {attachments.map((at, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] animate-fade-in font-medium text-slate-705">
                      <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                        <Paperclip className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <div className="truncate pr-1.5">
                          <p className="font-bold text-slate-700 truncate">{at}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
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
        </div>

        {/* Modal Footer */}
        <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-100 justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-500 px-5  py-2.5 transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-slate-900 hover:bg-rose-950 hover:bg-slate-800 text-white font-black text-xs px-5 py-2.5 transition-all cursor-pointer shadow-md shadow-slate-100"
          >
            提报缺陷
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDefectModal;
