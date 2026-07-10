/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  UserCheck,
  Edit2,
  Check,
  X,
  AlertCircle,
  Key,
  Mail,
  Lock,
  User,
  Briefcase,
  Search
} from "lucide-react";
import { User as SystemUser, UserGroup, ProjectTab } from "../types";
import UserManagementDialog from "./UserManagementDialog";
import UserGroupDialog from "./UserGroupDialog";

interface UserManagementSectionProps {
  users: SystemUser[];
  onAddUser: (u: SystemUser) => void;
  onDeleteUser: (id: string) => void;
  onToggleUserStatus: (id: string) => void;
  onUpdateUser: (u: SystemUser) => void;
  userGroups: UserGroup[];
  onAddUserGroup: (g: UserGroup) => void;
  onDeleteUserGroup: (id: string) => void;
  onUpdateUserGroup: (g: UserGroup) => void;
  isAdmin: boolean;
  currentUser: SystemUser;
}

export default function UserManagementSection({
  users,
  onAddUser,
  onDeleteUser,
  onToggleUserStatus,
  onUpdateUser,
  userGroups,
  onAddUserGroup,
  onDeleteUserGroup,
  onUpdateUserGroup,
  isAdmin,
  currentUser,
}: UserManagementSectionProps) {
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);

  const showToast = (message: string, type: "error" | "success" | "warning" = "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Unified Dialog Modals States
  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    // Form fields
    id?: string;
    username: string;
    nickname: string;
    password: string;
    email: string;
    feishuUserId: string;
    group: string;
  } | null>(null);

  const [groupModal, setGroupModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    // Form fields
    id?: string;
    name: string;
    description: string;
    permittedTabs?: ProjectTab[];
    permittedActions?: Record<string, string[]>;
  } | null>(null);

  // Group selecting state (for viewing team lists and scheduling members)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedUserIdsToGroup, setSelectedUserIdsToGroup] = useState<string[]>([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");

  // Direct Inline Confirm Delete States to prevent iframe-blocked window.confirm dialogues
  const [deleteConfUserId, setDeleteConfUserId] = useState<string | null>(null);
  const [deleteConfGroupId, setDeleteConfGroupId] = useState<string | null>(null);

  // Trigger modal for Create User
  const openCreateUserModal = () => {
    if (!isAdmin) {
      showToast("⚠️ 权限不足：仅系统超级管理员能新增注册成员！", "warning");
      return;
    }
    setUserModal({
      isOpen: true,
      mode: "create",
      username: "",
      nickname: "",
      password: "",
      email: "",
      feishuUserId: "",
      group: "",
    });
  };

  // Trigger modal for Edit User
  const openEditUserModal = (u: SystemUser) => {
    const isSelf = u.id === currentUser.id;
    if (!isAdmin && !isSelf) {
      showToast("⚠️ 权限受限：仅管理员或本人可编辑个人资料", "warning");
      return;
    }
    setUserModal({
      isOpen: true,
      mode: "edit",
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      password: u.password || "123456",
      email: u.email || "",
      feishuUserId: u.feishuUserId || "",
      group: u.group,
    });
  };

  // Trigger modal for Create Group
  const openCreateGroupModal = () => {
    if (!isAdmin) {
      showToast("⚠️ 权限不足：仅系统超级管理员可增加工作组架构！", "warning");
      return;
    }
    setGroupModal({
      isOpen: true,
      mode: "create",
      name: "",
      description: "",
      permittedTabs: [
        ProjectTab.OVERVIEW,
        ProjectTab.REQUIREMENT,
        ProjectTab.DEFECT,
        ProjectTab.TESTCASE,
        ProjectTab.CODE_CHANGES,
        ProjectTab.METRICS
      ],
      permittedActions: {},
    });
  };

  // Trigger modal for Edit Group
  const openEditGroupModal = (g: UserGroup) => {
    if (!isAdmin) {
      showToast("⚠️ 权限不足：仅系统超级管理员可修改群组结构属性！", "warning");
      return;
    }
    setGroupModal({
      isOpen: true,
      mode: "edit",
      id: g.id,
      name: g.name,
      description: g.description,
      permittedTabs: g.permittedTabs || [
        ProjectTab.OVERVIEW,
        ProjectTab.REQUIREMENT,
        ProjectTab.DEFECT,
        ProjectTab.TESTCASE,
        ProjectTab.CODE_CHANGES,
        ProjectTab.METRICS
      ],
      permittedActions: g.permittedActions || {},
    });
  };

  // Handle User Save Action (for both creation and editing)
  const handleSaveUser = () => {
    if (!userModal) return;

    const { mode, id, username, nickname, password, email, feishuUserId, group } = userModal;

    if (!username.trim() || !nickname.trim()) {
      showToast("⚠️ 请完整录入成员登录用户名与姓名！", "warning");
      return;
    }

    if (mode === "create") {
      // Duplication check
      if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        showToast("⚠️ 该账号用户名已被登记，请使用其他名称", "error");
        return;
      }

      const created: SystemUser = {
        id: `usr-${Date.now()}`,
        username: username.trim(),
        nickname: nickname.trim(),
        password: password.trim() || "123456",
        email: email.trim() || undefined,
        feishuUserId: feishuUserId.trim() || undefined,
        group,
        status: "active",
        role: "member"
      };

      onAddUser(created);
      showToast(`✅ 成员 ${created.nickname} 已成功注册`, "success");
    } else {
      // Find original user info
      const original = users.find(u => u.id === id);
      if (!original) return;

      const updated: SystemUser = {
        ...original,
        nickname: nickname.trim(),
        password: password.trim() || "123456",
        email: email.trim() || undefined,
        feishuUserId: feishuUserId.trim() || undefined,
        group,
      };

      onUpdateUser(updated);
      showToast(`✅ 成员 ${updated.nickname} 的资料已更新`, "success");
    }

    setUserModal(null);
  };

  // Handle Group Save Action (for both creation and editing)
  const handleSaveGroup = () => {
    if (!groupModal) return;

    const { mode, id, name, description, permittedTabs, permittedActions } = groupModal;

    if (!name.trim()) {
      showToast("⚠️ 工作分组名称不能为空！", "warning");
      return;
    }

    if (mode === "create") {
      const created: UserGroup = {
        id: `grp-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || "暂无分组职责介绍",
        permittedTabs: permittedTabs || [
          ProjectTab.OVERVIEW,
          ProjectTab.REQUIREMENT,
          ProjectTab.DEFECT,
          ProjectTab.TESTCASE,
          ProjectTab.CODE_CHANGES,
          ProjectTab.METRICS
        ],
        permittedActions: permittedActions || {},
      };
      onAddUserGroup(created);
      showToast(`✅ 新增工作群组 “${created.name}”`, "success");
    } else {
      if (!id) return;
      onUpdateUserGroup({
        id,
        name: name.trim(),
        description: description.trim(),
        permittedTabs: permittedTabs || [
          ProjectTab.OVERVIEW,
          ProjectTab.REQUIREMENT,
          ProjectTab.DEFECT,
          ProjectTab.TESTCASE,
          ProjectTab.CODE_CHANGES,
          ProjectTab.METRICS
        ],
        permittedActions: permittedActions || {},
      });
      showToast(`✅ 群组 “${name}” 信息已更新保存`, "success");
    }

    setGroupModal(null);
  };

  return (
    <div className="relative" id="user-management-section-wrapper">

      {/* Toast Notice portal */}
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-lg animate-fade-in transition-all border bg-white border-slate-100 text-slate-800">
          {toast.type === "success" && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />}
          {toast.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Grid wrapper */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Module 1: Register/View members */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                  <Users className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    用户列表
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    管理系统注册成员，可指派需求分析、缺陷流转 or 用例归属。
                  </p>
                </div>
              </div>

              {/* Trigger button */}
              <div className="relative group inline-block">
                <button
                  onClick={openCreateUserModal}
                  disabled={!isAdmin}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:scale-100 text-[11px] font-black text-white px-3 py-1.5 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加成员</span>
                </button>
                {!isAdmin && (
                  <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    ⚠️ 只有管理员才能添加新成员
                  </div>
                )}
              </div>
            </div>

            {/* High-density, minimalist user table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/20 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200" id="user-management-scrollable-list">
              <table className="w-full min-w-[500px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3">成员姓名 / 账号</th>
                    <th className="py-2.5 px-3">角色</th>
                    <th className="py-2.5 px-3">所属群组</th>
                    <th className="py-2.5 px-3">联络信息</th>
                    <th className="py-2.5 px-3">账号状态</th>
                    <th className="py-2.5 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 text-[11px]">
                  {users.map((u) => {
                    const grp = userGroups.find(g => g.id === u.group);
                    const isSelf = u.id === currentUser.id;
                    const isConfirmingDelete = deleteConfUserId === u.id;
                    const initials = u.nickname ? u.nickname.slice(0, 1).toUpperCase() : u.username.slice(0, 1).toUpperCase();

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/40 transition-colors duration-150"
                      >
                        {/* Member */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0 select-none">
                              <div className="h-6.5 w-6.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-[9px] uppercase">
                                {initials}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 block h-1.5 w-1.5 rounded-full border border-white ring-0 ${
                                u.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-800 truncate">{u.nickname}</span>
                                {isSelf && (
                                  <span className="shrink-0 inline-flex items-center px-1 py-0.2 rounded text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    你
                                  </span>
                                )}
                              </div>
                              <span className="block text-[9.5px] text-slate-400 font-mono leading-none">@{u.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            u.role === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                          }`}>
                            {u.role === "admin" ? "管理员" : "成员"}
                          </span>
                        </td>

                        {/* Group */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-600">
                            {grp ? grp.name : <span className="text-slate-300 italic">未分配</span>}
                          </span>
                        </td>

                        {/* Email / Feishu */}
                        <td className="py-2 px-3 min-w-0">
                          <div className="space-y-0.5">
                            {u.email ? (
                              <div className="flex items-center gap-1 text-slate-500">
                                <Mail className="h-2.5 w-2.5 shrink-0 opacity-70 text-slate-400" />
                                <span className="truncate max-w-[120px] font-medium text-[10px]">{u.email}</span>
                              </div>
                            ) : null}
                            {u.feishuUserId ? (
                              <div className="flex items-center gap-1 text-slate-500">
                                <span className="text-[8px] font-black px-1 py-0.2 rounded bg-sky-50 text-sky-600 border border-sky-100 scale-90 origin-left">飞书</span>
                                <span className="truncate max-w-[120px] text-[9.5px] font-mono text-slate-400">{u.feishuUserId}</span>
                              </div>
                            ) : !u.email && (
                              <span className="italic text-slate-300">未绑定</span>
                            )}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="relative group inline-block">
                            <button
                              onClick={() => {
                                if (!isAdmin) {
                                  showToast("⚠️ 权限受限：只有管理员可以启用/禁用用户", "warning");
                                  return;
                                }
                                if (isSelf) {
                                  showToast("⚠️ 无法操作：不能禁用当前的登录账号", "warning");
                                  return;
                                }
                                onToggleUserStatus(u.id);
                                showToast(`已切换账号 ${u.nickname} 的使用状态`, "success");
                              }}
                              disabled={!isAdmin && !isSelf}
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                (!isAdmin && !isSelf)
                                  ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60"
                                  : u.status === "active"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60 cursor-pointer"
                                  : "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100/60 cursor-pointer"
                              }`}
                            >
                              {u.status === "active" ? "正常" : "禁用"}
                            </button>
                            {!isAdmin && !isSelf && (
                              <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                ⚠️ 只有管理员才能修改其他成员状态
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {isConfirmingDelete ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-100 p-0.5 rounded-md animate-fade-in">
                              <span className="text-[9px] text-rose-600 font-bold px-1">注销？</span>
                              <button
                                onClick={() => {
                                  onDeleteUser(u.id);
                                  setDeleteConfUserId(null);
                                  showToast("✅ 已成功注销该成员", "success");
                                }}
                                className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black hover:bg-rose-700 cursor-pointer"
                              >
                                是
                              </button>
                              <button
                                onClick={() => setDeleteConfUserId(null)}
                                className="text-[9px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold hover:bg-slate-50 cursor-pointer"
                              >
                                否
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              {/* Reset password */}
                              <div className="relative group inline-block">
                                <button
                                  type="button"
                                  onClick={isAdmin ? () => {
                                    onUpdateUser({
                                      ...u,
                                      password: "123456"
                                    });
                                    showToast(`✅ 已成功重置 ${u.nickname} 的登录密码为 123456`, "success");
                                  } : undefined}
                                  disabled={!isAdmin}
                                  className={`p-1 rounded transition-colors ${
                                    isAdmin
                                      ? "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer"
                                      : "text-slate-200 cursor-not-allowed"
                                  }`}
                                  title="重置登录密码为 123456"
                                >
                                  <Key className="h-3 w-3 shrink-0" />
                                </button>
                                {!isAdmin && (
                                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    ⚠️ 只有管理员才能重置密码
                                  </div>
                                )}
                              </div>

                              {/* Edit */}
                              <div className="relative group inline-block">
                                <button
                                  onClick={() => openEditUserModal(u)}
                                  disabled={!isAdmin && !isSelf}
                                  className={`p-1 rounded transition-colors ${
                                    (!isAdmin && !isSelf)
                                      ? "text-slate-200 cursor-not-allowed opacity-60"
                                      : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer"
                                  }`}
                                  title="编辑成员信息"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                {!isAdmin && !isSelf && (
                                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    ⚠️ 无权编辑其他成员资料
                                  </div>
                                )}
                              </div>

                              {/* Delete */}
                              <div className="relative group inline-block">
                                <button
                                  onClick={() => {
                                    if (!isAdmin) {
                                      showToast("⚠️ 权限受限：只有管理员能注销删除成员", "warning");
                                      return;
                                    }
                                    if (isSelf) {
                                      showToast("⚠️ 无法操作：不能注销自己当前的活动管理员账号", "warning");
                                      return;
                                    }
                                    setDeleteConfUserId(u.id);
                                  }}
                                  disabled={!isAdmin || isSelf}
                                  className={`p-1 rounded transition-colors ${
                                    (!isAdmin || isSelf)
                                      ? "text-slate-200 cursor-not-allowed opacity-60"
                                      : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  }`}
                                  title="注销此成员"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                                {!isAdmin && (
                                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    ⚠️ 只有管理员才能删除成员
                                  </div>
                                )}
                                {isAdmin && isSelf && (
                                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    ⚠️ 不能注销自己当前的活动管理员账户
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium text-center pt-2 select-none border-t border-slate-50">
            💡 点击右上角「添加成员」可以快捷开设超级管理员/测试协作席位
          </div>
        </div>

        {/* Module 2: Custom user groups */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <UserCheck className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    成员群组
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    按职能或角色自定义的工作群组。点击群组进行组员的快速调度。
                  </p>
                </div>
              </div>

              <div className="relative group inline-block">
                <button
                  onClick={openCreateGroupModal}
                  disabled={!isAdmin}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:scale-100 text-[11px] font-black text-white px-3 py-1.5 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加群组</span>
                </button>
                {!isAdmin && (
                  <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    ⚠️ 只有管理员才能添加工作群组
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {userGroups.map(g => {
                const isSelected = selectedGroupId === g.id;
                const groupMembers = users.filter(u => u.group === g.id);
                const isConfirmingGroupDelete = deleteConfGroupId === g.id;

                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      setSelectedGroupId(isSelected ? null : g.id);
                      setSelectedUserIdsToGroup([]);
                      setGroupMemberSearch("");
                    }}
                    className={`p-3 border rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "border-orange-250 border-orange-300 bg-orange-50/20 shadow-xs"
                        : "border-slate-100 bg-slate-50/10 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 pr-2 space-y-1">
                        <div className="text-xs font-bold text-slate-850 flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400 font-bold text-[10px]">群组名称:</span>
                          <span className="font-black text-[12.5px] text-slate-850">{g.name}</span>
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.2 rounded-full font-bold shrink-0">
                            {groupMembers.length} 人
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-605 leading-relaxed font-semibold flex items-start gap-1">
                          <span className="text-slate-400 font-bold text-[10px] shrink-0 mt-0.5">群组描述:</span>
                          <span className="line-clamp-2 text-slate-500 font-medium">{g.description}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isConfirmingGroupDelete ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-1 rounded-lg">
                            <span className="text-[8px] text-rose-600 font-bold">删组后组员划归至默认开发组，确定？</span>
                            <button
                              onClick={() => {
                                onDeleteUserGroup(g.id);
                                setDeleteConfGroupId(null);
                                if (selectedGroupId === g.id) setSelectedGroupId(null);
                                showToast("✅ 群组已成功删除销毁", "success");
                              }}
                              className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black hover:bg-rose-700 cursor-pointer"
                            >
                              确定
                            </button>
                            <button
                              onClick={() => setDeleteConfGroupId(null)}
                              className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold hover:bg-slate-200 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="relative group inline-block">
                              <button
                                onClick={() => openEditGroupModal(g)}
                                disabled={!isAdmin}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                                  isAdmin
                                    ? "text-indigo-500 hover:text-indigo-650 cursor-pointer"
                                    : "text-slate-350 cursor-not-allowed"
                                }`}
                                title={isAdmin ? "编辑部门组信息" : "无编辑权限"}
                              >
                                编辑
                              </button>
                              {!isAdmin && (
                                <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                  ⚠️ 只有管理员才能编辑群组
                                </div>
                              )}
                            </div>

                            <div className="relative group inline-block">
                              <button
                                onClick={() => {
                                  if (!isAdmin) {
                                    showToast("⚠️ 权限受限：只有超级管理员能删除群组", "warning");
                                    return;
                                  }
                                  if (g.id === "grp-dev" || g.id === "grp-qa") {
                                    showToast("⚠️ 安全限制：默认系统工作组 (开发、质量保障) 是骨架结构，不可删除", "warning");
                                    return;
                                  }
                                  setDeleteConfGroupId(g.id);
                                }}
                                disabled={!isAdmin || g.id === "grp-dev" || g.id === "grp-qa"}
                                className={`p-1 rounded transition-colors ${
                                  (!isAdmin || g.id === "grp-dev" || g.id === "grp-qa")
                                    ? "text-slate-200 cursor-not-allowed opacity-60"
                                    : "text-slate-300 hover:text-rose-500 cursor-pointer"
                                }`}
                                title={
                                  g.id === "grp-dev" || g.id === "grp-qa"
                                    ? "骨架工作组不可删除"
                                    : isAdmin
                                    ? "解散删除此工作组"
                                    : "无注销权限"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              {!isAdmin && (
                                <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                  ⚠️ 只有管理员才能删除群组
                                </div>
                              )}
                              {isAdmin && (g.id === "grp-dev" || g.id === "grp-qa") && (
                                <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                  ⚠️ 默认核心系统工作组禁止删除
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected group detail membership editor */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-3" onClick={(e) => e.stopPropagation()}>

                        {/* Team Members List inside group */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-black text-slate-500">
                            工作组内成员名单 ({groupMembers.length} 人):
                          </div>

                          {groupMembers.length === 0 ? (
                            <div className="text-[10px] text-slate-400 italic bg-slate-100/30 rounded-lg p-2 text-center">
                              工作组内暂时没有划归人员，在下方选择并调动成员即可。
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {groupMembers.map(member => (
                                <span
                                  key={member.id}
                                  className="inline-flex items-center gap-1.5 text-[10px] bg-white border border-slate-100 text-slate-700 pl-2.5 pr-1 py-0.5 rounded-full shadow-3xs"
                                >
                                  <span className="font-bold">{member.nickname}</span>
                                  <button
                                    onClick={() => {
                                      if (!isAdmin) {
                                        showToast("⚠️ 权限未授：只有管理员可以调整成员工作分组", "warning");
                                        return;
                                      }
                                      onUpdateUser({
                                        ...member,
                                        group: "grp-dev" // Assign to fallback Dev Group
                                      });
                                      showToast(`已将成员 ${member.nickname} 移回开发组（默认）`, "success");
                                    }}
                                    className="text-[13px] leading-none text-slate-400 hover:text-rose-500 hover:bg-slate-105 font-black ml-1 px-1 rounded-full cursor-pointer"
                                    title="移出该群组并归属于默认开发组织"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pull other team members into this group dynamically */}
                        <div className="pt-2.5 border-t border-dashed border-slate-200 space-y-2">
                          <div className="text-[9.5px] font-black text-slate-400 uppercase flex items-center justify-between">
                            <span>直接选择并调度已有成员划入此群组 (支持多选)</span>
                            {!isAdmin && <span className="text-amber-600 font-bold">🔒 只读模式</span>}
                          </div>
                          {users.filter(u => u.group !== g.id).length === 0 ? (
                            <div className="text-[10px] text-slate-400 italic bg-slate-50 rounded-lg p-2 text-center">
                              系统内所有成员均已在此群组内
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {users.filter(u => u.group !== g.id).length > 5 && (
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder={isAdmin ? "搜索可选成员姓名或账号..." : "只读：搜索可选成员姓名或账号..."}
                                    value={groupMemberSearch}
                                    disabled={!isAdmin}
                                    onChange={(e) => setGroupMemberSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 transition-all duration-150 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200">
                                {(() => {
                                  const filteredList = users
                                    .filter(u => u.group !== g.id)
                                    .filter(u => {
                                      if (!groupMemberSearch) return true;
                                      const query = groupMemberSearch.toLowerCase();
                                      return u.nickname.toLowerCase().includes(query) || u.username.toLowerCase().includes(query);
                                    });

                                  if (filteredList.length === 0) {
                                    return (
                                      <div className="text-[10px] text-slate-400 italic py-3 text-center w-full">
                                        未找到匹配的可分配成员
                                      </div>
                                    );
                                  }

                                  return filteredList.map(u => {
                                    const isMemberSelected = selectedUserIdsToGroup.includes(u.id);
                                    return (
                                      <button
                                        type="button"
                                        key={u.id}
                                        disabled={!isAdmin}
                                        onClick={isAdmin ? () => {
                                          setSelectedUserIdsToGroup(prev =>
                                            prev.includes(u.id)
                                              ? prev.filter(id => id !== u.id)
                                              : [...prev, u.id]
                                          );
                                        } : undefined}
                                        className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-150 ${
                                          !isAdmin
                                            ? "bg-slate-100 border-slate-250 text-slate-400 cursor-not-allowed opacity-60"
                                            : isMemberSelected
                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-3xs cursor-pointer"
                                            : "bg-white border-slate-200/60 text-slate-600 hover:border-slate-300 cursor-pointer"
                                        }`}
                                      >
                                        <span className="font-extrabold">{u.nickname}</span>
                                        <span className="text-[8.5px] opacity-60">({userGroups.find(xg => xg.id === u.group)?.name || "暂无群组"})</span>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                              <div className="relative group inline-block w-full">
                                <button
                                  type="button"
                                  disabled={!isAdmin}
                                  onClick={isAdmin ? () => {
                                    if (selectedUserIdsToGroup.length === 0) {
                                      showToast("⚠️ 请先点击选择要调动的成员！", "warning");
                                      return;
                                    }
                                    selectedUserIdsToGroup.forEach(userId => {
                                      const targetUser = users.find(u => u.id === userId);
                                      if (targetUser) {
                                        onUpdateUser({
                                          ...targetUser,
                                          group: g.id
                                        });
                                      }
                                    });
                                    const count = selectedUserIdsToGroup.length;
                                    setSelectedUserIdsToGroup([]);
                                    showToast(`✅ 已成功调度 ${count} 位成员归入 “${g.name}”`, "success");
                                  } : undefined}
                                  className={`w-full px-4 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 ${
                                    isAdmin
                                      ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white cursor-pointer"
                                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  <span>确认将选中的 {selectedUserIdsToGroup.length} 位成员调入本组</span>
                                </button>
                                {!isAdmin && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    ⚠️ 只有管理员才能调配群组内成员
                                  </div>
                                )}
                              </div>
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
          <div className="text-[10px] text-slate-400 font-medium text-center pt-2 select-none border-t border-slate-50">
            💡 点击右上角「添加群组」可以快捷创建特定的测试/技术或项目分组
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* 1. MODULAR USER DIALOG MODAL (Create/Edit) */}
      {/* ========================================== */}
      <UserManagementDialog
        isOpen={!!userModal?.isOpen}
        mode={userModal?.mode || "create"}
        username={userModal?.username || ""}
        nickname={userModal?.nickname || ""}
        password={userModal?.password || ""}
        email={userModal?.email || ""}
        feishuUserId={userModal?.feishuUserId || ""}
        group={userModal?.group || ""}
        userGroups={userGroups}
        isAdmin={isAdmin}
        onClose={() => setUserModal(null)}
        onChange={(fields) => {
          if (userModal) {
            setUserModal({ ...userModal, ...fields });
          }
        }}
        onSave={handleSaveUser}
      />

      {/* ========================================== */}
      {/* 2. MODULAR GROUP DIALOG MODAL (Create/Edit) */}
      {/* ========================================== */}
      <UserGroupDialog
        isOpen={!!groupModal?.isOpen}
        mode={groupModal?.mode || "create"}
        id={groupModal?.id}
        name={groupModal?.name || ""}
        description={groupModal?.description || ""}
        permittedTabs={groupModal?.permittedTabs}
        permittedActions={groupModal?.permittedActions}
        onClose={() => setGroupModal(null)}
        onChange={(fields) => {
          if (groupModal) {
            setGroupModal({ ...groupModal, ...fields });
          }
        }}
        onSave={handleSaveGroup}
      />

    </div>
  );
}
