/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Folder as FolderType, Issue, TestCase, TestCaseGrade, User as SystemUser, TestCaseStatus } from "../types";
import { CopyPlus, X } from "lucide-react";
import EditableStepsTable from "./EditableStepsTable";
import CustomDropdown from "./CustomDropdown";

interface TestCaseCreateFormProps {
  projectId: string;
  folders: FolderType[];
  requirements: Issue[];
  activeUsers: SystemUser[];
  activeFolderId: string | null;
  activeRequirementId: string | null;
  onSave: (testCase: Partial<TestCase>) => void;
  onCancel: () => void;
  allVersions?: string[];
}

export default function TestCaseCreateForm({
  projectId,
  folders,
  requirements,
  activeUsers,
  activeFolderId,
  activeRequirementId,
  onSave,
  onCancel,
  allVersions = [],
}: TestCaseCreateFormProps) {
  const [newName, setNewName] = useState("");
  const [newPre, setNewPre] = useState("");
  const [newSteps, setNewSteps] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newGrade, setNewGrade] = useState<TestCaseGrade>(TestCaseGrade.P1);
  const [newFolderId, setNewFolderId] = useState<string | undefined>(undefined);
  const [newLinkedReqId, setNewLinkedReqId] = useState<string>("");
  const [newVersion, setNewVersion] = useState("v1.0.0");
  const [newTags, setNewTags] = useState("");
  const [validationError, setValidationError] = useState("");

  // Initialize from active parents
  useEffect(() => {
    if (activeFolderId) setNewFolderId(activeFolderId);
    if (activeRequirementId) setNewLinkedReqId(activeRequirementId);
  }, [activeFolderId, activeRequirementId]);

  const handleCreateSave = () => {
    if (!newName.trim()) {
      setValidationError("请输入测试用例名称规则标题描述。");
      return;
    }
    setValidationError("");
    onSave({
      name: newName.trim(),
      precondition: newPre.trim(),
      steps: newSteps.trim(),
      expectedResult: newExpected.trim(),
      grade: newGrade,
      status: TestCaseStatus.UNTESTED,
      projectId,
      folderId: newFolderId || undefined,
      linkedRequirementId: newLinkedReqId || undefined,
      version: newVersion.trim() || undefined,
      tags: newTags.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-3xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <CopyPlus className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                创建全新测试用例
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                快速录入功能特征设计用例，规范并沉淀测试回归资产链路。
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                用例验证主题 *
              </label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (e.target.value.trim()) setValidationError("");
                }}
                placeholder="例如：输入天气Prompt自适应计算和雨量粒子仿真生成验证..."
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                版本号 <span className="text-indigo-650 font-normal lowercase">(输入或选择)</span>
              </label>
              <input
                type="text"
                list="existing-versions"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="例如: v1.0.0"
              />
              <datalist id="existing-versions">
                {allVersions.map((v) => (
                  <option key={v} value={v} />
                ))}
                {!allVersions.includes("v1.0.0") && <option value="v1.0.0" />}
                {!allVersions.includes("v1.1.0") && <option value="v1.1.0" />}
                {!allVersions.includes("v2.0.0") && <option value="v2.0.0" />}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                标签 <span className="text-slate-400 font-normal lowercase">(逗号/空格分隔)</span>
              </label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="例如: 冒烟, 核心"
              />
            </div>

            <div className="sm:col-span-2 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
              <div className="space-y-0.5">
                <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  用例优先级
                </label>
                <p className="text-[9.5px] text-slate-400 font-medium">合理的优先级等级有助于提高回归和覆盖效率</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.values(TestCaseGrade).map((g) => {
                  const isSelected = newGrade === g;
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
                      onClick={() => setNewGrade(g)}
                      className={`px-4 py-1.5 rounded-xl text-[10.5px] font-black border transition-all cursor-pointer active:scale-95 ${colorClass}`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

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
                value={newLinkedReqId}
                onChange={(val) => setNewLinkedReqId(val)}
                placeholder="-- 通用性需求、不绑定特定基线 --"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                归属文件目录
              </label>
              <CustomDropdown
                options={[
                  { value: "", label: "-- 根节点 (未分类) --" },
                  ...(folders || []).map((f) => ({ value: f.id, label: f.name }))
                ]}
                value={newFolderId || ""}
                onChange={(val) => setNewFolderId(val || undefined)}
                placeholder="-- 根节点 (未分类) --"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                前置环境条件
              </label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-300"
                value={newPre}
                onChange={(e) => setNewPre(e.target.value)}
                placeholder="例如: 智能系统已加载 VCU 核心策略控制字，环境雷达设备处于热备状态"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center justify-between gap-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  用例操作步骤与对应的预期结果
                </span>
                <span className="text-[9px] text-slate-400 font-medium normal-case">💡 小提示：可增删或上下排序各步骤，支持多行批量插入。</span>
              </label>
              <EditableStepsTable
                steps={newSteps}
                expectedResult={newExpected}
                onChange={(nextSteps, nextExpected) => {
                  setNewSteps(nextSteps);
                  setNewExpected(nextExpected);
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
            onClick={handleCreateSave}
            className="rounded-xl bg-slate-900 font-black text-xs text-white px-5 py-2.5 hover:bg-slate-800 transition-all cursor-pointer shadow-md shadow-slate-100"
          >
            确定创建
          </button>
        </div>
      </div>
    </div>
  );
}
