/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  UserCheck,
  Briefcase,
  X,
  Check,
  FolderGit2,
  BookmarkCheck,
  AlertOctagon,
  FileCheck2,
  GitCommit,
  BarChart4,
  Settings,
  PlusCircle,
  Edit3,
  Trash2,
  ShieldCheck,
  Sparkles,
  Sliders,
  RefreshCw,
  MessageSquare,
  Play,
  Send,
  UserPlus
} from "lucide-react";
import { ProjectTab } from "../types";

interface UserGroupDialogProps {
  isOpen: boolean;
  mode: "create" | "edit";
  id?: string;
  name: string;
  description: string;
  permittedTabs?: ProjectTab[];
  permittedActions?: Record<string, string[]>;
  onClose: () => void;
  onChange: (fields: Partial<{
    name: string;
    description: string;
    permittedTabs: ProjectTab[];
    permittedActions: Record<string, string[]>;
  }>) => void;
  onSave: () => void;
}

const AVAILABLE_MENU_PERMISSIONS = [
  { tab: ProjectTab.OVERVIEW, label: "空间概览", desc: "主控雷盘与仿真链路", icon: FolderGit2 },
  { tab: ProjectTab.REQUIREMENT, label: "需求管理", desc: "产品指标与智能用例", icon: BookmarkCheck },
  { tab: ProjectTab.DEFECT, label: "缺陷追踪", desc: "仿真故障与缺陷流转", icon: AlertOctagon },
  { tab: ProjectTab.TESTCASE, label: "测试用例", desc: "树形层次与脑图拓扑", icon: FileCheck2 },
  { tab: ProjectTab.CODE_CHANGES, label: "代码追踪", desc: "构建流水与代码变更", icon: GitCommit },
  { tab: ProjectTab.METRICS, label: "质量度量", desc: "颗粒堆叠与健康卡片", icon: BarChart4 },
];

const TAB_ACTION_CONFIG: Record<ProjectTab, {
  key: string;
  label: string;
  icon: any;
  colorClass: string;
}[]> = {
  [ProjectTab.OVERVIEW]: [
    { key: "create", label: "一键生成质量报告", icon: Sparkles, colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { key: "edit", label: "编辑空间基本配置", icon: Sliders, colorClass: "text-amber-600 bg-amber-50 border-amber-100" },
  ],
  [ProjectTab.REQUIREMENT]: [
    { key: "create", label: "新建与批量导入需求", icon: PlusCircle, colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { key: "edit", label: "修改需求基本内容/描述", icon: Edit3, colorClass: "text-amber-600 bg-amber-50 border-amber-100" },
    { key: "status_flow", label: "需求流转状态变更", icon: Sliders, colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { key: "ai_analysis", label: "需求 AI 契约深度分析", icon: Sparkles, colorClass: "text-purple-600 bg-purple-50 border-purple-100" },
    { key: "ai_generate", label: "AI 智能生成用例", icon: Sparkles, colorClass: "text-purple-600 bg-purple-50 border-purple-100" },
    { key: "notify", label: "推送飞书消息状态通知", icon: Send, colorClass: "text-rose-600 bg-rose-50 border-rose-100" },
    { key: "group_chat", label: "一键拉起工作群聊", icon: UserPlus, colorClass: "text-sky-600 bg-sky-50 border-sky-100" },
    { key: "delete", label: "删除需求条目", icon: Trash2, colorClass: "text-rose-600 bg-rose-50 border-rose-100" },
  ],
  [ProjectTab.DEFECT]: [
    { key: "create", label: "新建与批量导入缺陷", icon: PlusCircle, colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { key: "edit", label: "修改缺陷基本信息", icon: Edit3, colorClass: "text-amber-600 bg-amber-50 border-amber-100" },
    { key: "status_flow", label: "流转缺陷处理状态", icon: Sliders, colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { key: "comment", label: "发表及回复缺陷评论", icon: MessageSquare, colorClass: "text-teal-600 bg-teal-50 border-teal-100" },
    { key: "ai_generate", label: "AI 智能根因研判与推荐", icon: Sparkles, colorClass: "text-purple-600 bg-purple-50 border-purple-100" },
    { key: "notify", label: "推送飞书消息状态通知", icon: Send, colorClass: "text-rose-600 bg-rose-50 border-rose-100" },
    { key: "group_chat", label: "一键拉起工作群聊", icon: UserPlus, colorClass: "text-sky-600 bg-sky-50 border-sky-100" },
    { key: "delete", label: "物理删除缺陷条目", icon: Trash2, colorClass: "text-rose-600 bg-rose-50 border-rose-100" },
  ],
  [ProjectTab.TESTCASE]: [
    { key: "create", label: "新建/导入/AI智能生成用例", icon: PlusCircle, colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { key: "edit", label: "修改用例描述与预置步骤", icon: Edit3, colorClass: "text-amber-600 bg-amber-50 border-amber-100" },
    { key: "execute", label: "提交测试用例执行结果", icon: Play, colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { key: "reset_progress", label: "重置测试用例执行进度", icon: RefreshCw, colorClass: "text-amber-600 bg-amber-50 border-amber-100" },
    { key: "ai_generate", label: "AI 智能推导用例与研判分析", icon: Sparkles, colorClass: "text-purple-600 bg-purple-50 border-purple-100" },
    { key: "mindmap", label: "脑图视图关联与结构修改", icon: RefreshCw, colorClass: "text-pink-600 bg-pink-50 border-pink-100" },
    { key: "notify", label: "推送飞书消息状态通知", icon: Send, colorClass: "text-rose-600 bg-rose-50 border-rose-100" },
    { key: "group_chat", label: "一键拉起工作群聊", icon: UserPlus, colorClass: "text-sky-600 bg-sky-50 border-sky-100" },
    { key: "delete", label: "删除用例/删除文件夹/批量删除", icon: Trash2, colorClass: "text-rose-600 bg-rose-50 border-rose-100" },
  ],
  [ProjectTab.CODE_CHANGES]: [
    { key: "create", label: "同步并拉取分支提交记录", icon: RefreshCw, colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { key: "edit", label: "大模型缺陷研判与智能缺陷/用例生成", icon: Sparkles, colorClass: "text-amber-600 bg-amber-50 border-amber-100" },
    { key: "delete", label: "编辑并保存代码仓关联配置", icon: Settings, colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  ],
  [ProjectTab.METRICS]: [],
  [ProjectTab.CONFIG]: [],
};

export default function UserGroupDialog({
  isOpen,
  mode,
  id,
  name,
  description,
  permittedTabs,
  permittedActions = {},
  onClose,
  onChange,
  onSave,
}: UserGroupDialogProps) {
  if (!isOpen) return null;

  const isLockedGroup = mode === "edit" && (id === "grp-dev" || id === "grp-qa");

  // Fallback: If no explicit permissions set, assume all tabs permitted by default
  const currentPermitted = permittedTabs || [
    ProjectTab.OVERVIEW,
    ProjectTab.REQUIREMENT,
    ProjectTab.DEFECT,
    ProjectTab.TESTCASE,
    ProjectTab.CODE_CHANGES,
    ProjectTab.METRICS
  ];

  const handleToggleTab = (tab: ProjectTab) => {
    let nextTabs: ProjectTab[];
    const nextActions = { ...permittedActions };

    if (currentPermitted.includes(tab)) {
      nextTabs = currentPermitted.filter(t => t !== tab);
      delete nextActions[tab]; // Remove actions when disabling tab
    } else {
      nextTabs = [...currentPermitted, tab];
      // Default to all actions when enabling tab
      nextActions[tab] = ["create", "edit", "delete"];
    }
    onChange({ permittedTabs: nextTabs, permittedActions: nextActions });
  };

  const handleToggleAction = (tab: ProjectTab, action: string) => {
    const nextActions = { ...permittedActions };
    const currentActions = nextActions[tab] || ["create", "edit", "delete"];

    let updatedActions: string[];
    if (currentActions.includes(action)) {
      updatedActions = currentActions.filter(a => a !== action);
    } else {
      updatedActions = [...currentActions, action];
    }

    nextActions[tab] = updatedActions;
    onChange({ permittedActions: nextActions });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in animate-duration-200" id="user-group-dialog">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[92vh] text-left">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <span className="inline-block h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></span>
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {mode === "create" ? "新增工作群组" : "编辑群组职能与权限"}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {mode === "create" ? "划分特定项目职责的开发、测试或仿真群组。" : `编辑工作群组 [${name}] 的核心职能及细粒度(增删改)权限控制。`}
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

        {/* Modal Body / Form Fields */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">

          <div className="space-y-4 pt-1 text-left">

            {/* Group Name Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                群组名称 <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  disabled={isLockedGroup}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-bold"
                  placeholder="如: 核心微服务开发项目组"
                  value={name}
                  onChange={(e) => onChange({ name: e.target.value })}
                />
              </div>
              {isLockedGroup ? (
                <p className="text-[9px] text-amber-600 font-bold pl-0.5 mt-1">⚠️ 系统内置默认骨架分组名称禁止重命名修改。</p>
              ) : (
                <p className="text-[9px] text-slate-400 pl-0.5 mt-1">请输入该业务层级或职能的唯一名称</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                群组描述
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-bold"
                  placeholder="如: 负责微服务核心数据库、中间件及多节点联动"
                  value={description}
                  onChange={(e) => onChange({ description: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5 mt-1">简短描述此群组在质控、测试、项目中的归属边界</p>
            </div>

            {/* Permitted Tabs / Menu Configuration */}
            <div className="space-y-3 text-left pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    功能菜单与细粒度按钮控制(增、删、改)
                  </label>
                </div>
                <span className="text-[8px] font-bold text-indigo-655 bg-indigo-50 px-1.5 py-0.5 rounded">
                  三权分立/细粒度授权
                </span>
              </div>
              <p className="text-[9px] text-slate-400">
                开启左侧菜单查看权限后，可勾选底部的细分功能权限（默认全部允许）。未勾选的操作按钮将在界面上自动置灰或隐藏：
              </p>

              <div className="space-y-3 mt-2">
                {AVAILABLE_MENU_PERMISSIONS.map(item => {
                  const Icon = item.icon;
                  const isChecked = currentPermitted.includes(item.tab);
                  const activeActions = permittedActions[item.tab] ?? ["create", "edit", "delete"];

                  return (
                    <div
                      key={item.tab}
                      className={`rounded-2xl border transition-all duration-150 ${
                        isChecked
                          ? "bg-indigo-50/20 border-indigo-100 shadow-3xs"
                          : "bg-white border-slate-100 opacity-70"
                      }`}
                    >
                      {/* Top row: Tab Switcher */}
                      <div className="flex items-center justify-between p-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                            isChecked
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100/55"
                              : "bg-slate-50 text-slate-400 border border-slate-100"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-black ${isChecked ? "text-indigo-900" : "text-slate-600"}`}>
                              {item.label}
                            </span>
                            <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                          </div>
                        </div>

                        {/* Switch button */}
                        <button
                          type="button"
                          onClick={() => handleToggleTab(item.tab)}
                          className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isChecked ? "bg-indigo-600" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-3xs ring-0 transition duration-200 ease-in-out ${
                              isChecked ? "translate-x-4.5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Expanded actions config */}
                      {isChecked && (
                        <div className="px-4 pb-3.5 pt-2 bg-slate-50/40 rounded-b-2xl border-t border-slate-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Settings className="h-3 w-3 text-indigo-400" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                              按钮及操作权限:
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {TAB_ACTION_CONFIG[item.tab] && TAB_ACTION_CONFIG[item.tab].length > 0 ? (
                              TAB_ACTION_CONFIG[item.tab].map(act => {
                                const ActIcon = act.icon;
                                const isActChecked = activeActions.includes(act.key);
                                return (
                                  <button
                                    type="button"
                                    key={act.key}
                                    onClick={() => handleToggleAction(item.tab, act.key)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                                      isActChecked
                                        ? "bg-white border-indigo-200 text-indigo-700 shadow-3xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                                    }`}
                                  >
                                    <ActIcon className={`h-3 w-3 ${isActChecked ? "text-indigo-600" : "text-slate-400"}`} />
                                    <span>{act.label}</span>
                                    <span className={`h-3 w-3 rounded-sm border flex items-center justify-center transition-all ${
                                      isActChecked
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "border-slate-200 bg-white"
                                    }`}>
                                      {isActChecked && <Check className="h-2 w-2 stroke-[3]" />}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-1.5 py-0.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-[10px] font-medium text-slate-400">
                                  该功能模块无细粒度增删改操作控制（纯只读多维分析展示）
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 px-5 py-2.5 transition-all cursor-pointer shadow-3xs"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 text-xs font-bold text-white px-5 py-2.5 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>保存群组及操作权限</span>
          </button>
        </div>

      </div>
    </div>
  );
}
