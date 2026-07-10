import React, { useState } from "react";
import { Edit3, X } from "lucide-react";
import { TestCase, TestCaseGrade, Folder as FolderType, Issue, User as SystemUser } from "../types";
import EditableStepsTable from "./EditableStepsTable";
import CustomDropdown from "./CustomDropdown";

interface TestCaseFormEditorProps {
  projectId: string;
  activeCase: TestCase;
  requirements: Issue[];
  folders: FolderType[];
  activeUsers: SystemUser[];
  onSave: (draft: TestCase) => void;
  onCancel: () => void;
  allVersions?: string[];
}

export default function TestCaseFormEditor({
  projectId,
  activeCase,
  requirements,
  folders,
  activeUsers,
  onSave,
  onCancel,
  allVersions = []
}: TestCaseFormEditorProps) {
  const [localCaseDraft, setLocalCaseDraft] = useState<TestCase>({ ...activeCase });

  const updateDraftField = (key: keyof TestCase, val: any) => {
    setLocalCaseDraft((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = () => {
    onSave(localCaseDraft);
  };

  return (
    <div className="flex flex-col h-full max-h-[92vh] overflow-hidden">
      {/* Modal Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-left">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Edit3 className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              编辑测试用例
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              修改并完善测试用例的属性、前置条件与验证执行步骤。
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="关闭"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Modal Body (Scrollable) */}
      <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
          {/* Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              用例验证主题 *
            </label>
            <input
              type="text"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
              value={localCaseDraft.name}
              onChange={(e) => updateDraftField("name", e.target.value)}
              placeholder="例如：输入天气Prompt自适应计算和雨量粒子仿真生成验证..."
            />
          </div>

          {/* Version */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              版本号 <span className="text-indigo-650 font-normal lowercase">(输入或选择)</span>
            </label>
            <input
              type="text"
              list="edit-case-versions"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
              value={localCaseDraft.version || ""}
              onChange={(e) => updateDraftField("version", e.target.value)}
              placeholder="例如: v1.0.0"
            />
            <datalist id="edit-case-versions">
              {allVersions.map((v) => (
                <option key={v} value={v} />
              ))}
              {!allVersions.includes("v1.0.0") && <option value="v1.0.0" />}
              {!allVersions.includes("v1.1.0") && <option value="v1.1.0" />}
              {!allVersions.includes("v2.0.0") && <option value="v2.0.0" />}
            </datalist>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              标签 <span className="text-slate-400 font-normal lowercase">(逗号/空格分隔)</span>
            </label>
            <input
              type="text"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
              value={localCaseDraft.tags || ""}
              onChange={(e) => updateDraftField("tags", e.target.value)}
              placeholder="例如: 冒烟, 核心"
            />
          </div>

          {/* Priority selection */}
          <div className="sm:col-span-2 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none animate-fade-in">
            <div className="space-y-0.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                用例优先级
              </label>
              <p className="text-[9.5px] text-slate-400 font-medium">合理的优先级等级有助于提高回归和覆盖效率</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.values(TestCaseGrade).map((g) => {
                const isSelected = localCaseDraft.grade === g;
                let colorClass = "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300";
                if (isSelected) {
                  if (g === TestCaseGrade.P0) colorClass = "bg-rose-50 border-rose-300 text-rose-700 shadow-3xs ring-2 ring-rose-100/50";
                  else if (g === TestCaseGrade.P1) colorClass = "bg-orange-50 border-orange-300 text-orange-700 shadow-3xs ring-2 ring-orange-100/50";
                  else if (g === TestCaseGrade.P2) colorClass = "bg-indigo-50 border-indigo-300 text-indigo-650 shadow-3xs ring-2 ring-indigo-100/50";
                  else colorClass = "bg-slate-100 border-slate-300 text-slate-800 shadow-3xs ring-2 ring-slate-100";
                }
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => updateDraftField("grade", g)}
                    className={`px-4 py-1.5 rounded-xl text-[10.5px] font-black border transition-all cursor-pointer active:scale-95 ${colorClass}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked Req */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              关联业务需求
            </label>
            <CustomDropdown
              options={[
                { value: "", label: "-- 通用性需求、不绑定特定基线 --" },
                ...(requirements || []).map((r) => ({ value: r.id, label: r.title }))
              ]}
              value={localCaseDraft.linkedRequirementId || ""}
              onChange={(val) => updateDraftField("linkedRequirementId", val || undefined)}
              placeholder="-- 通用性需求、不绑定特定基线 --"
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              归属文件目录
            </label>
            <CustomDropdown
              options={[
                { value: "", label: "-- 根目录 (未分类) --" },
                ...(folders || []).map((f) => ({ value: f.id, label: f.name }))
              ]}
              value={localCaseDraft.folderId || ""}
              onChange={(val) => updateDraftField("folderId", val || undefined)}
              placeholder="-- 根目录 (未分类) --"
            />
          </div>

          {/* Precondition */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              前置环境条件
            </label>
            <input
              type="text"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-300"
              value={localCaseDraft.precondition || ""}
              onChange={(e) => updateDraftField("precondition", e.target.value)}
              placeholder="例如: 智能系统已加载 VCU 核心策略控制字，环境雷达设备处于热备状态"
            />
          </div>

          {/* Steps */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center justify-between gap-1.5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                用例操作步骤与对应的预期结果
              </span>
              <span className="text-[9px] text-slate-400 font-medium normal-case">💡 小提示：可增删或上下排序各步骤，支持多行批量插入。</span>
            </label>
            <EditableStepsTable
              steps={localCaseDraft.steps || ""}
              expectedResult={localCaseDraft.expectedResult || ""}
              onChange={(st, exp) => {
                updateDraftField("steps", st);
                updateDraftField("expectedResult", exp);
              }}
            />
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-100 justify-end shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-slate-100 font-bold hover:bg-slate-200 text-xs text-slate-500 px-5 py-2.5 transition-all cursor-pointer"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-slate-900 font-black text-xs text-white px-5 py-2.5 hover:bg-slate-800 transition-all cursor-pointer shadow-md shadow-slate-100"
        >
          保存
        </button>
      </div>
    </div>
  );
}
