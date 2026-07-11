/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  User as SystemUser,
  SystemConfig,
  Project
} from "../types";
import {
  Save,
  ShieldCheck,
  CheckCircle,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  LayoutGrid,
  Info,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import PromptTemplateSection from "./PromptTemplateSection";
import RemoteMemberManagement from "./RemoteMemberManagement";
import { MemberApiScope } from "../features/members/api/types";
import RemoteNotificationChannels from "./RemoteNotificationChannels";
import { RequirementApiScope } from "../features/requirements/api/types";

interface SystemConfigPanelProps {
  systemConfig: SystemConfig;
  onUpdateConfig: (cfg: SystemConfig) => Promise<void>;
  projects: Project[];
  currentUser: SystemUser;
  memberApiScope: MemberApiScope;
  notificationApiScope: RequirementApiScope;
}

export default function SystemConfigPanel({
  systemConfig,
  onUpdateConfig,
  projects,
  currentUser,
  memberApiScope,
  notificationApiScope,
}: SystemConfigPanelProps) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Tab State
  const [settingsTab, setSettingsTab] = useState<"project" | "prompt" | "navigation" | "notifications" | "users">("project");

  // Project Brand Info states
  const [projectName, setProjectName] = useState(systemConfig.projectName || "Veritab");
  const [projectDesc, setProjectDesc] = useState(systemConfig.projectDesc || "AI 协同质控大脑");

  React.useEffect(() => {
    setProjectName(systemConfig.projectName || "Veritab");
    setProjectDesc(systemConfig.projectDesc || "AI 协同质控大脑");
  }, [systemConfig.projectName, systemConfig.projectDesc]);

  const [visibleMenus, setVisibleMenus] = useState<string[]>(() => {
    const list = systemConfig.visibleMenus || ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"];
    if (!list.includes("code_changes")) {
      return [...list, "code_changes"];
    }
    return list;
  });

  React.useEffect(() => {
    setProjectName(systemConfig.projectName || "Veritab");
    setProjectDesc(systemConfig.projectDesc || "AI 协同质控大脑");
    if (systemConfig.visibleMenus) {
      const list = systemConfig.visibleMenus;
      if (!list.includes("code_changes")) {
        setVisibleMenus([...list, "code_changes"]);
      } else {
        setVisibleMenus(list);
      }
    }
  }, [systemConfig]);


  const handleToggleMenu = (menuKey: string) => {
    if (!isAdmin) {
      showToast("⚠️ 操作失败：只有管理员才能微调可见菜单。", "error");
      return;
    }
    if (menuKey === "config") {
      showToast("🔒 系统安全限制：系统配置与权限模块必须常驻，不可被隐藏。", "error");
      return;
    }

    setVisibleMenus(prev => {
      if (prev.includes(menuKey)) {
        if (prev.filter(x => x !== menuKey).length === 0) {
          showToast("⚠️ 请至少保留一个可见的主菜单看板。", "error");
          return prev;
        }
        return prev.filter(x => x !== menuKey);
      } else {
        return [...prev, menuKey];
      }
    });
  };

  const handleSaveMenuConfig = async () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能微调全局可用导航菜单权限。", "error");
      return;
    }
    // Automatically force 'config' tab to remain in the stored menus
    const finalSet = new Set([...visibleMenus, "config"]);
    const savedList = Array.from(finalSet);

    try {
      await onUpdateConfig({ ...systemConfig, visibleMenus: savedList });
      showToast("🟢 平台可用菜单已保存。", "success");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "菜单配置保存失败。", "error");
    }
  };

  const handleSaveProjectInfo = async () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能更新项目基本信息。", "error");
      return;
    }
    if (!projectName.trim()) {
      showToast("⚠️ 保存失败：项目名称不能为空！", "error");
      return;
    }
    try {
      await onUpdateConfig({ ...systemConfig, projectName: projectName.trim(), projectDesc: projectDesc.trim() });
      showToast("🟢 平台基本信息已保存。", "success");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "平台信息保存失败。", "error");
    }
  };

  const isAdmin = currentUser.role === "admin";

  return (
    <div className="space-y-6 w-full font-sans" id="system-config-container">
      {/* Premium fixed Top-Center Toast feedback */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-md shadow-xl animate-fade-in animate-in slide-in-from-top-4 duration-300 max-w-md w-[calc(100%-2rem)] md:w-max transition-all ${
          toast.type === "success"
            ? "bg-emerald-50/95 border-emerald-100 text-emerald-900 shadow-emerald-100/10"
            : "bg-rose-50/95 border-rose-100 text-rose-900 shadow-rose-100/10"
        }`}>
          <div className={`p-1.5 rounded-xl shrink-0 ${
            toast.type === "success"
              ? "bg-emerald-100 text-emerald-600"
              : "bg-rose-100 text-rose-600"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 text-xs font-bold leading-relaxed pr-1">
            {toast.message}
          </div>
        </div>
      )}

      {/* Tab Switcher Area */}
      <div className="flex items-center overflow-x-auto scrollbar-none border border-slate-200 bg-slate-100/70 p-1 rounded-2xl max-w-4xl w-full select-none gap-0.5">
        <button
          onClick={() => setSettingsTab("project")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "project"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <Info className="h-4 w-4" />
          <span>项目设置</span>
        </button>
        <button
          onClick={() => setSettingsTab("prompt")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "prompt"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>AI 指令模板</span>
        </button>
        <button
          onClick={() => setSettingsTab("navigation")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "navigation"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>可用菜单</span>
        </button>
        <button
          onClick={() => setSettingsTab("notifications")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "notifications" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>通知渠道</span>
        </button>
        <button
          onClick={() => setSettingsTab("users")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "users"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>成员与群组</span>
        </button>
      </div>

      {settingsTab === "project" && (
        <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-project-tab">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Info className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  项目基本信息
                </h3>
                <p className="text-[11px] text-slate-400">
                  配置项目名称与描述，更新后同步展示在侧边栏和系统模块中。
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block pl-0.5">
                    项目名称 <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">必填</span>
                </div>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="请输入项目名称，如：Veritab"
                />
                <p className="text-[10px] text-slate-400 pl-0.5 leading-relaxed">
                  提示：此名称展示在左侧导航栏最上方，支持中文、英文及常用符号。
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block pl-0.5">
                    项目描述
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">可选</span>
                </div>
                <textarea
                  disabled={!isAdmin}
                  className="w-full h-24 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 leading-relaxed resize-none"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="请输入项目描述，如：AI 协同质控大脑"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-50">
              <span className="text-[10px] text-slate-400 font-medium">
                {!isAdmin && "只读模式：无权更新此配置。"}
              </span>
              <button
                onClick={handleSaveProjectInfo}
                disabled={!isAdmin}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>保存项目信息</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "prompt" && (
        <PromptTemplateSection
          systemConfig={systemConfig}
          onUpdateConfig={onUpdateConfig}
          isAdmin={isAdmin}
          showToast={showToast}
        />
      )}

      {settingsTab === "navigation" && (
        <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-navigation-tab">
          {/* Module 2.5: Menu visibility settings */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 animate-fade-in" id="menu-visibility-container">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <LayoutGrid className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  导航菜单展示配置
                </h3>
                <p className="text-[11px] text-slate-400">
                  配置全局可见的功能菜单，可隐藏无需使用的模块以简化界面。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
              {[
                { key: "overview", name: "空间概览" },
                { key: "requirement", name: "需求管理" },
                { key: "defect", name: "缺陷追踪" },
                { key: "testcase", name: "测试用例" },
                { key: "code_changes", name: "代码追踪" },
                { key: "metrics", name: "质量度量" },
                { key: "config", name: "系统配置", locked: true },
              ].map((m) => {
                const isSelected = visibleMenus.includes(m.key);
                return (
                  <button
                    key={m.key}
                    disabled={!isAdmin || m.locked}
                    onClick={() => handleToggleMenu(m.key)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all relative flex items-center justify-between gap-3 ${
                      !isAdmin || m.locked ? "opacity-75" : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/20 text-teal-950"
                        : "border-slate-100 bg-slate-50/10 text-slate-700 hover:border-slate-200"
                    }`}
                  >
                    <span className="text-xs font-black">{m.name}</span>
                    <div>
                      {isSelected ? (
                        m.locked ? (
                          <span className="text-[8px] bg-slate-200 text-slate-600 font-extrabold px-1.5 py-0.5 rounded">
                            锁定常驻
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-teal-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-3xs">
                            <Eye className="h-2 w-2" />
                            显示中
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[8px] bg-slate-100 text-slate-400 font-extrabold px-1.5 py-0.5 rounded">
                          <EyeOff className="h-2 w-2" />
                          已隐藏
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-50">
              <span className="text-[10px] text-slate-400 font-medium">
                {isAdmin ? "提示：保存后将刷新全局侧边栏和可见功能模块。" : "只读模式：无权配置菜单显示范围。"}
              </span>
              <button
                onClick={handleSaveMenuConfig}
                disabled={!isAdmin}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>保存菜单可见性</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "users" && (
        <div className="w-full animate-fade-in animate-in fade-in duration-200" id="system-config-users-tab">
          <RemoteMemberManagement scope={memberApiScope} currentUser={currentUser} />
        </div>
      )}
      {settingsTab === "notifications" && <RemoteNotificationChannels scope={notificationApiScope} />}
    </div>
  );
}
