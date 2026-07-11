/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  FolderGit2,
  BookmarkCheck,
  AlertOctagon,
  FileCheck2,
  BarChart4,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  FolderOpen,
  LogOut,
  ShieldCheck,
  GitCommit
} from "lucide-react";
import { ProjectTab, Project, User as SystemUser, SystemConfig, UserGroup } from "../types";

interface SidebarProps {
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  systemModel: string;
  currentUser: SystemUser;
  onCurrentUserChange: (user: SystemUser) => void;
  onOpenLoginModal: () => void;
  onOpenPersonalCenter: () => void;
  onLogout: () => void;
  systemConfig?: SystemConfig;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  userGroups?: UserGroup[];
}

export default function Sidebar({
  activeTab,
  onTabChange,
  projects,
  selectedProjectId,
  onProjectChange,
  systemModel,
  currentUser,
  onCurrentUserChange,
  onOpenLoginModal,
  onOpenPersonalCenter,
  onLogout,
  systemConfig,
  isCollapsed: propCollapsed,
  onToggleCollapse,
  userGroups = [],
}: SidebarProps) {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = (val: boolean) => {
    if (onToggleCollapse) {
      onToggleCollapse(val);
    } else {
      setLocalCollapsed(val);
    }
  };
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentProj = projects.find((p) => p.id === selectedProjectId);

  // Match profile information dynamically with user role
  const profileUser = {
    avatar: currentUser.nickname ? currentUser.nickname.charAt(0) : "W",
    name: currentUser.nickname || "未登录",
  };

  return (
    <aside
      className={`hidden md:flex relative min-h-screen bg-slate-50 border-r border-slate-200/70 flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? "w-16" : "w-64 lg:w-72"
      }`}
      id="veritab-sidebar-layout"
    >
      {/* Upper Area */}
      <div className="flex-1 flex flex-col pt-5">
        {/* Brand and Logo Header snippet */}
        <div className={`px-4 pb-4 flex items-center justify-between border-b border-slate-200/85 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white shadow-md shadow-indigo-600/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 font-sans">
                  {systemConfig?.projectName || "Veritab"}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-500">
                    {systemConfig?.projectDesc || "AI 协同质控大脑"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Dropdown Switcher (styled resembling search/box header cards) */}
        <div className="p-3">
          {!isCollapsed && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-white hover:bg-slate-100/60 rounded-xl p-3 border border-slate-200 text-left transition-all duration-200 shadow-sm cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none select-none"
                id="workspace-switcher-trigger"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-extrabold text-indigo-600 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>活动工作空间</span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 truncate mt-1">
                    {currentProj ? currentProj.name : "选择工作空间..."}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-50 animate-fade-in divide-y divide-slate-100">
                    <div className="max-h-56 overflow-y-auto py-1">
                      {projects.map((proj) => {
                        const isSelected = proj.id === selectedProjectId;
                        return (
                          <button
                            key={proj.id}
                            onClick={() => {
                              onProjectChange(proj.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`group w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left cursor-pointer transition-all ${
                              isSelected
                                ? "bg-indigo-50/80 text-indigo-750 text-indigo-700 font-extrabold"
                                : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700"
                              }`}>
                                <FolderGit2 className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate font-semibold">{proj.name}</span>
                            </div>
                            {isSelected && (
                              <span className="text-[9px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1">
                                活动
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tab Links Menu Section */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5" id="sidebar-tabs-navigation">
          {[
            { tab: ProjectTab.OVERVIEW, label: "空间概览", desc: "主控雷盘与仿真链路", icon: FolderGit2 },
            { tab: ProjectTab.REQUIREMENT, label: "需求管理", desc: "产品指标与智能用例", icon: BookmarkCheck },
            { tab: ProjectTab.DEFECT, label: "缺陷追踪", desc: "仿真故障与缺陷流转", icon: AlertOctagon },
            { tab: ProjectTab.TESTCASE, label: "测试用例", desc: "树形层次与脑图拓扑", icon: FileCheck2 },
            { tab: ProjectTab.CODE_CHANGES, label: "代码追踪", desc: "构建流水与代码变更", icon: GitCommit },
            { tab: ProjectTab.METRICS, label: "质量度量", desc: "颗粒堆叠与健康卡片", icon: BarChart4 },
            { tab: ProjectTab.CONFIG, label: "系统配置", desc: "AI网关与推送设置", icon: Settings },
          ].filter(({ tab }) => {
            // Only admin is allowed to see the CONFIG tab
            if (tab === ProjectTab.CONFIG) {
              return currentUser.role === "admin";
            }

            const visibleMenus = systemConfig?.visibleMenus || ["overview", "requirement", "defect", "testcase", "metrics", "config"];
            if (!visibleMenus.includes(tab)) {
              return false;
            }

            // Check group-specific visible menus (for non-admin users)
            if (currentUser.role !== "admin" && userGroups.length > 0 && currentUser.group) {
              const myGroup = userGroups.find(g => g.id === currentUser.group);
              if (myGroup && myGroup.permittedTabs) {
                return myGroup.permittedTabs.includes(tab);
              }
            }

            return true;
          }).map(({ tab, label, desc, icon: Icon }) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`w-full flex items-center transition-all duration-200 rounded-xl group relative cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none select-none ${
                  isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3 text-left"
                } ${
                  isSelected
                    ? "bg-indigo-50/60 border border-indigo-100/50 text-indigo-700 shadow-sm"
                    : "text-slate-550 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent"
                }`}
                title={isCollapsed ? label : undefined}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />

                {!isCollapsed && (
                  <span className="text-xs font-bold truncate leading-none flex-1 text-left">{label}</span>
                )}

                {/* Left indicators */}
                {isSelected && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-md"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Collapse arrow toggle handler floating on the upper splitter */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-[74px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-800 shadow-sm cursor-pointer transition-colors z-40 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none select-none"
        title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        id="sidebar-collapse-scaler-handle"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Dynamic User switcher & role indicator */}
      <div className="p-3 border-t border-slate-200/80">
        {isCollapsed ? (
          <div className="relative group flex justify-center">
            <div
              onClick={onOpenPersonalCenter}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-indigo-55/10 hover:bg-slate-100 border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
              title="查看个人安全凭证与企业飞书授权"
            >
              <div className="relative shrink-0 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] shadow-3xs transition-colors">
                {profileUser.avatar}
                {currentUser.feishuUserId && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[6px] text-white font-bold">
                    L
                  </span>
                )}
              </div>
            </div>
            {/* Quick float action for collapsed state logout */}
            <button
              onClick={onLogout}
              className="absolute -top-1 right-2 hidden group-hover:flex h-4.5 w-4.5 bg-rose-600 text-white rounded-full items-center justify-center hover:bg-rose-700 transition-all shadow-sm cursor-pointer border border-white"
              title="一键安全退出"
            >
              <LogOut className="h-2 w-2" />
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between shadow-3xs group/card hover:bg-slate-100/50 transition-colors">
            {/* Left: User profile details clickable to open personal center */}
            <button
              onClick={onOpenPersonalCenter}
              className="flex-1 flex items-center gap-2 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none select-none group/profile min-w-0"
              title="点击打开个人中心 (维护个人资料与绑定飞书)"
            >
              <div className="relative shrink-0 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-indigo-600 group-hover/profile:bg-indigo-700 text-white font-black text-xs shadow-3xs transition-colors">
                {profileUser.avatar}
                {currentUser.feishuUserId ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[7px] text-white font-bold" title="飞书账号绑定已打通">
                    L
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-amber-450 border border-white"></span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-slate-800 truncate group-hover/profile:text-indigo-600 transition-colors">{profileUser.name}</span>
                  {currentUser.feishuUserId && (
                    <span className="text-[7.5px] bg-emerald-150 bg-emerald-100 text-emerald-800 px-1 rounded font-black shrink-0 leading-tight">
                      已绑
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-400 font-extrabold mt-0.5 truncate leading-none">
                  {currentUser.role === "admin" ? "系统管理员" : "研发协作者"}
                </p>
              </div>
            </button>

            {/* Split vertical divider */}
            <div className="h-6 w-[1px] bg-slate-200 mx-2 shrink-0"></div>

            {/* Right: Integrated elegant logout action */}
            <button
              onClick={onLogout}
              className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer flex flex-col items-center justify-center gap-0.5 text-[8.5px] font-black outline-none focus:outline-none"
              title="安全退出系统"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-[8px] leading-tight font-extrabold">退出</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
