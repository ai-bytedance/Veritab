/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, UserCheck, Lock, Mail, Key, Briefcase, X, Check } from "lucide-react";
import { UserGroup } from "../types";
import CustomSelect from "./CustomSelect";

interface UserManagementDialogProps {
  isOpen: boolean;
  mode: "create" | "edit";
  username: string;
  nickname: string;
  password: string;
  email: string;
  feishuUserId: string;
  group: string;
  userGroups: UserGroup[];
  isAdmin: boolean;
  onClose: () => void;
  onChange: (fields: Partial<{
    username: string;
    nickname: string;
    password: string;
    email: string;
    feishuUserId: string;
    group: string;
  }>) => void;
  onSave: () => void;
}

export default function UserManagementDialog({
  isOpen,
  mode,
  username,
  nickname,
  password,
  email,
  feishuUserId,
  group,
  userGroups,
  isAdmin,
  onClose,
  onChange,
  onSave,
}: UserManagementDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in animate-duration-200" id="user-management-dialog">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[92vh] text-left">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <span className="inline-block h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></span>
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {mode === "create" ? "注册新团队成员" : "编辑成员详细资料"}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {mode === "create" ? "为系统设置新的研发、测试或管理协作席位。" : `更新成员 [${username}] 的账号属性与消息通知配置。`}
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

          <div className="grid gap-4 sm:grid-cols-2 pt-1 text-left">

            {/* Username Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                登录账号 <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  disabled={mode === "edit" || !isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-bold"
                  placeholder="如: alex.dev"
                  value={username}
                  onChange={(e) => onChange({ username: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5">字母、数字、点(.)组成，不可重复</p>
            </div>

            {/* Nickname Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                姓名 <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-bold"
                  placeholder="如: 张小伟"
                  value={nickname}
                  onChange={(e) => onChange({ nickname: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5">真实称谓或工作常用姓名</p>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                登录密码 <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-mono font-bold"
                  placeholder="默认 123456"
                  value={password}
                  onChange={(e) => onChange({ password: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5">账户在本地系统的认证密码</p>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-bold"
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => onChange({ email: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5">用于投递日常报告和质控看板汇总</p>
            </div>

            {/* Feishu ID Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                飞书ID
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  disabled={mode === "edit"}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-mono font-bold"
                  placeholder="如: ou_xxxxx"
                  value={feishuUserId}
                  onChange={(e) => onChange({ feishuUserId: e.target.value })}
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5">
                {mode === "edit" ? "🔒 飞书ID创建后不可修改" : "✍️ 可输入飞书 ID/Open ID，便于消息通知中 @ 本人"}
              </p>
            </div>

            {/* Group Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                所属群组
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400 z-10" />
                <CustomSelect
                  value={group}
                  onChange={(val) => onChange({ group: val })}
                  options={[
                    { value: "", label: "暂无群组 (未分配)" },
                    ...userGroups.map(g => ({ value: g.id, label: g.name }))
                  ]}
                  triggerClassName="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all cursor-pointer font-bold shadow-3xs hover:border-slate-300 text-left disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[9px] text-slate-400 pl-0.5">用于快捷按组派发用例及缺陷任务</p>
            </div>

          </div>

        </div>

        {/* Modal Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <span className="text-[9px] text-slate-400">
            {isAdmin ? "" : "🔒 自主资料更新只读模式"}
          </span>
          <div className="flex gap-2">
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
              <span>保存成员资料</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
