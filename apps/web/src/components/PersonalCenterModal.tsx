/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Smartphone,
  RefreshCw,
  Unlink,
  Sparkles,
  Check,
  SmartphoneIcon,
  User as UserIcon,
  ArrowLeft
} from "lucide-react";
import { User as SystemUser, UserGroup } from "../types";
import CustomSelect from "./CustomSelect";
import ConfirmDialog from "./ConfirmDialog";

interface PersonalCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser;
  userGroups: UserGroup[];
  users: SystemUser[];
  onUpdateUser: (updatedUser: SystemUser) => void;
  onUpdateUsersList: (updatedList: SystemUser[]) => void;
}

const getCleanName = (nameString: string) => {
  if (!nameString) return "";
  return nameString.split("(")[0].trim();
};

export default function PersonalCenterModal({
  isOpen,
  onClose,
  currentUser,
  userGroups,
  users,
  onUpdateUser,
  onUpdateUsersList
}: PersonalCenterModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "feishu">("profile");

  // Profile settings state
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [email, setEmail] = useState(currentUser.email || "");
  const [selectedGroup, setSelectedGroup] = useState(currentUser.group || "grp-dev");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);
  const [innerToast, setInnerToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);

  const triggerInnerToast = (message: string, type: "success" | "warning" = "success") => {
    setInnerToast({ message, type });
    setTimeout(() => setInnerToast(null), 3000);
  };

  React.useEffect(() => {
    setNickname(currentUser.nickname);
    setEmail(currentUser.email || "");
    setSelectedGroup(currentUser.group || "grp-dev");
  }, [currentUser]);

  // Unified SSO bind simulation state
  const [isBinding, setIsBinding] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const [bindMethod, setBindMethod] = useState<"qrcode" | "manual">("qrcode");
  const [qrState, setQrState] = useState<"waiting" | "scanning" | "completed">("waiting");

  const [bindingPlatform, setBindingPlatform] = useState<"feishu" | "wechat" | "dingtalk" | null>(null);
  const [manualInputId, setManualInputId] = useState("");
  const [unbindPlatform, setUnbindPlatform] = useState<"feishu" | "wechat" | "dingtalk" | null>(null);

  if (!isOpen) return null;

  const currentGroup = userGroups.find(g => g.id === currentUser.group);

  // 1. Password modification logical check
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPasswordSuccess(false);

    // Get current stored password for this user, default is '123456'
    const storedUser = users.find(u => u.id === currentUser.id);
    const actualOldPassword = (storedUser as any)?.password || "123456";

    if (oldPassword !== actualOldPassword) {
      setPwdError("❌ 原密码校验不正确，请重新输入。");
      return;
    }
    if (newPassword.trim().length < 4) {
      setPwdError("❌ 新安全密码字长不得低于 4 位。");
      return;
    }

    // Success in modifying password
    const updatedUserList = users.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, password: newPassword.trim() };
      }
      return u;
    });

    onUpdateUsersList(updatedUserList);

    // Update active current user as well
    const updatedCurrentUser = { ...currentUser, password: newPassword.trim() } as any;
    onUpdateUser(updatedCurrentUser);

    setPasswordSuccess(true);
    setOldPassword("");
    setNewPassword("");
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  // 2. Base info save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(false);

    if (!nickname.trim()) {
      triggerInnerToast("昵称不可为空", "warning");
      return;
    }

    const updatedUser: SystemUser = {
      ...currentUser,
      nickname: nickname.trim(),
      email: email.trim() || undefined,
      group: selectedGroup
    };

    onUpdateUser(updatedUser);

    // Sync into state users list
    const updatedUserList = users.map(u => u.id === currentUser.id ? { ...u, nickname: nickname.trim(), email: email.trim() || undefined, group: selectedGroup } : u);
    onUpdateUsersList(updatedUserList);

    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 2000);
  };

  // 3. Unified simulated binding
  const startSimulateQrScan = (platform: "feishu" | "wechat" | "dingtalk") => {
    setQrState("scanning");
    setIsBinding(true);

    // Wait 1.8s for mock QR Code capture on mobile app
    setTimeout(() => {
      setQrState("completed");
      const prefix =
        platform === "feishu" ? "ou_simulated_" :
        platform === "wechat" ? "wx_simulated_" :
        "dt_simulated_";
      const simulatedId = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

      const key =
        platform === "feishu" ? "feishuUserId" :
        platform === "wechat" ? "wechatUserId" :
        "dingtalkUserId";

      const updatedUser: SystemUser = {
        ...currentUser,
        [key]: simulatedId
      };

      onUpdateUser(updatedUser);
      const updatedUserList = users.map(u => u.id === currentUser.id ? { ...u, [key]: simulatedId } : u);
      onUpdateUsersList(updatedUserList);

      setIsBinding(false);
      setBindSuccess(true);
      setTimeout(() => {
        setBindSuccess(false);
        setQrState("waiting");
        setBindingPlatform(null); // Return to general list
      }, 1500);
    }, 1800);
  };

  const handleManualBind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindingPlatform || !manualInputId.trim()) return;

    setIsBinding(true);
    setTimeout(() => {
      const key =
        bindingPlatform === "feishu" ? "feishuUserId" :
        bindingPlatform === "wechat" ? "wechatUserId" :
        "dingtalkUserId";

      const updatedUser: SystemUser = {
        ...currentUser,
        [key]: manualInputId.trim()
      };

      onUpdateUser(updatedUser);
      const updatedUserList = users.map(u => u.id === currentUser.id ? { ...u, [key]: manualInputId.trim() } : u);
      onUpdateUsersList(updatedUserList);

      setIsBinding(false);
      setBindSuccess(true);
      setTimeout(() => {
        setBindSuccess(false);
        setBindingPlatform(null); // Return to list
        setManualInputId("");
      }, 1500);
    }, 800);
  };

  const handleUnbind = (platform: "feishu" | "wechat" | "dingtalk") => {
    setUnbindPlatform(platform);
    setShowUnbindConfirm(true);
  };

  const performUnbind = () => {
    if (!unbindPlatform) return;

    const key =
      unbindPlatform === "feishu" ? "feishuUserId" :
      unbindPlatform === "wechat" ? "wechatUserId" :
      "dingtalkUserId";

    const updatedUser: SystemUser = {
      ...currentUser,
      [key]: undefined
    };

    onUpdateUser(updatedUser);
    const updatedUserList = users.map(u => {
      if (u.id === currentUser.id) {
        const { [key]: deletedKey, ...rest } = u as any;
        return rest as SystemUser;
      }
      return u;
    });
    onUpdateUsersList(updatedUserList);
    setManualInputId("");

    const pName =
      unbindPlatform === "feishu" ? "飞书" :
      unbindPlatform === "wechat" ? "企业微信" :
      "钉钉";

    triggerInnerToast(`${pName}第三方账号已解除关联打通！`);
    setShowUnbindConfirm(false);
    setUnbindPlatform(null);
  };

  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in font-sans" id="personal-center-modal">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up text-left">

        {/* Modern Unified Minimal Light Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100/60 text-indigo-600 flex items-center justify-center text-base font-black shrink-0 uppercase tracking-wide shadow-3xs select-none">
              {getCleanName(currentUser.nickname).slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  设置
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                  {currentUser.role === "admin" ? "系统管理员" : "研发协作者"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span>成员: <strong className="font-semibold text-slate-650">{getCleanName(currentUser.nickname)}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>所属团队: <strong className="font-semibold text-slate-650">{currentGroup?.name || "未分配"}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors cursor-pointer border border-slate-200/70 shadow-3xs"
            title="关闭设置"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Minimal Tab Navigation (No emojis, thin clean design) */}
        <div className="flex border-b border-slate-150 px-6 shrink-0 gap-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2 text-xs font-bold transition-all relative border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 ${
              activeTab === "profile"
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <span>基础资料</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-2 text-xs font-bold transition-all relative border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 ${
              activeTab === "security"
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <span>登录安全</span>
          </button>
          <button
            onClick={() => setActiveTab("feishu")}
            className={`py-2 text-xs font-bold transition-all relative border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer ${
              activeTab === "feishu"
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            <span>三方绑定</span>
            <span className={`text-[8px] px-1.5 py-0.2 rounded font-black shrink-0 border ${
              (currentUser.feishuUserId || currentUser.wechatUserId || currentUser.dingtalkUserId)
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-slate-50 text-slate-400 border-slate-100"
            }`}>
              {(currentUser.feishuUserId || currentUser.wechatUserId || currentUser.dingtalkUserId) ? "已绑定" : "未绑定"}
            </span>
          </button>
        </div>

        {/* Optimized High-density Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === "profile" && (
            <div className="space-y-6 animate-fade-in">

              {/* Profile sub-form */}
              <div>
                <div className="pb-2.5 mb-4.5 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">常规</h4>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">电子邮件地址</label>
                      <input
                        type="email"
                        value={email}
                        disabled={currentUser.role !== "admin"}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none transition-all ${
                          currentUser.role === "admin"
                            ? "bg-white text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/40"
                            : "bg-slate-50 text-slate-400 cursor-not-allowed"
                        }`}
                        placeholder="e.g. user@veritab.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">中文昵称 / 姓名</label>
                      <input
                        type="text"
                        value={nickname}
                        disabled={currentUser.role !== "admin"}
                        onChange={(e) => setNickname(e.target.value)}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none transition-all ${
                          currentUser.role === "admin"
                            ? "bg-white text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/40"
                            : "bg-slate-50 text-slate-400 cursor-not-allowed"
                        }`}
                        placeholder="姓名..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5 block">职能工作组</label>
                    {currentUser.role === "admin" ? (
                      <CustomSelect
                        value={selectedGroup}
                        onChange={(val) => setSelectedGroup(val)}
                        options={userGroups.map(g => ({ value: g.id, label: g.name }))}
                        triggerClassName="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer hover:border-slate-300 text-left"
                      />
                    ) : (
                      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 flex items-center justify-between select-none">
                        <span>{userGroups.find(g => g.id === selectedGroup)?.name || "未分配"}</span>
                        <span className="text-[8.5px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">仅管理员可调整</span>
                      </div>
                    )}
                  </div>

                  {currentUser.role !== "admin" && (
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-slate-500 text-[10.5px] leading-relaxed select-none flex items-start gap-2">
                      <span className="text-indigo-500 text-sm mt-0.5">ℹ️</span>
                      <span>当前个人账户资料已锁定。根据质控体系安全合规政策，普通团队成员暂无私自修改中文姓名、电子邮件或工作组职能的权限。如需调整，请联系<strong>系统管理员</strong>进行统一配置。</span>
                    </div>
                  )}

                  {currentUser.role === "admin" && (
                    <div className="flex items-center justify-end pt-1.5">
                      <div className="flex items-center gap-2">
                        {profileSuccess && (
                          <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                            <Check className="h-3 w-3 shrink-0" />
                            <span>更新成功</span>
                          </span>
                        )}
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-3xs"
                        >
                          保存更改
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 animate-fade-in">
              {/* Password update sub-form */}
              <div>
                <div className="pb-2.5 mb-4.5 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">密码安全</h4>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">当前旧密码</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => {
                          setOldPassword(e.target.value);
                          setPwdError(null);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/40 text-slate-800 font-semibold"
                        placeholder="初始密码..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">设置新密码</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPwdError(null);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/40 text-slate-800 font-semibold"
                        placeholder="新密码最少4位"
                      />
                    </div>
                  </div>

                  {pwdError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold rounded-lg">
                      {pwdError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>密码更改成功，下次登录启用新密码</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>更改安全密码</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "feishu" && (
            <div className="space-y-4 animate-fade-in text-left">
              {bindingPlatform ? (
                /* Active Binding Platform Panel */
                <div className="space-y-4 animate-scale-up">
                  <div className="pb-2 flex items-center justify-between border-b border-slate-100">
                    <button
                      onClick={() => {
                        setBindingPlatform(null);
                        setManualInputId("");
                      }}
                      className="text-slate-450 hover:text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>返回账号列表</span>
                    </button>
                    <span className="text-xs font-black text-slate-800">
                      绑定{bindingPlatform === "feishu" ? "飞书 Feishu" : bindingPlatform === "wechat" ? "企业微信" : "钉钉 DingTalk"}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-12 gap-5 p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl">
                    {/* Left Column: QR Code */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white border border-slate-150 rounded-xl text-center shadow-3xs select-none">
                      {qrState === "waiting" && (
                        <div
                          className="relative cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all group"
                          onClick={() => startSimulateQrScan(bindingPlatform)}
                        >
                          <div className="w-24 h-24 bg-slate-50 border border-slate-150 rounded-lg flex flex-col items-center justify-center p-2 relative overflow-hidden">
                            <QrCode className="w-12 h-12 text-slate-600" />
                            <div className="absolute inset-0 bg-indigo-600/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Smartphone className="h-4 w-4 text-white animate-bounce" />
                              <span className="text-[8px] text-white font-bold mt-1">模拟扫码</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {qrState === "scanning" && (
                        <div className="w-24 h-24 flex flex-col items-center justify-center p-2 relative bg-indigo-50/30 rounded-lg border border-indigo-100/60">
                          <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
                          <span className="text-[8px] text-indigo-600 font-extrabold mt-1.5 animate-pulse">正在安全核验...</span>
                        </div>
                      )}

                      {qrState === "completed" && (
                        <div className="w-24 h-24 flex flex-col items-center justify-center p-2 relative bg-emerald-50 rounded-lg border border-emerald-100/60">
                          <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Check className="h-3 w-3 font-bold" />
                          </div>
                          <span className="text-[8px] text-emerald-600 font-bold mt-1.5">关联成功</span>
                        </div>
                      )}

                      <div className="mt-2.5 space-y-0.5">
                        <h5 className="text-[10px] font-bold text-slate-700">扫码快捷关联</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">
                          打开移动端客户端扫一扫完成绑定
                        </p>
                      </div>

                      <button
                        onClick={() => startSimulateQrScan(bindingPlatform)}
                        disabled={isBinding}
                        className="mt-2.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-[9.5px] rounded-lg transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
                      >
                        <Smartphone className="h-3 w-3 shrink-0" />
                        <span>模拟扫码绑定</span>
                      </button>
                    </div>

                    {/* Right Column: Manual ID */}
                    <div className="md:col-span-7 flex flex-col justify-between p-4 bg-white border border-slate-150 rounded-xl">
                      <form onSubmit={handleManualBind} className="space-y-4">
                        <div className="space-y-0.5">
                          <h5 className="text-[10px] font-bold text-slate-700">手动账号关联</h5>
                          <p className="text-[9px] text-slate-400">
                            在下方输入您在该第三方平台的唯一用户标识 (User ID)
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider pl-0.5">
                            {bindingPlatform === "feishu" ? "飞书 OpenID / User ID" : bindingPlatform === "wechat" ? "企业微信成员账号 ID" : "钉钉 UnionID / Staff ID"}
                          </label>
                          <input
                            type="text"
                            required
                            value={manualInputId}
                            onChange={(e) => setManualInputId(e.target.value)}
                            className="w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none transition-all focus:border-indigo-500"
                            placeholder={bindingPlatform === "feishu" ? "e.g. ou_wang123" : bindingPlatform === "wechat" ? "e.g. wx_wang123" : "e.g. dt_wang123"}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isBinding}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 font-bold text-xs text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-3xs transition-all"
                        >
                          {isBinding ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <span>确认绑定</span>
                          )}
                        </button>
                      </form>

                      {bindSuccess && (
                        <div className="mt-2.5 p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9.5px] font-bold rounded-lg flex items-center justify-center gap-1 animate-fade-in">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>三方账号绑定成功！</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Main Platforms Selection Grid */
                <div className="space-y-4 animate-fade-in">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">绑定三方账号免密登录</h4>
                    <p className="text-[10.5px] text-slate-400 mt-1">关联对应账号后，您可以在系统登录页直接进行扫码安全快捷登录，免去记忆密码负担。</p>
                  </div>

                  <div className="space-y-3">
                    {/* Feishu */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#3370FF]/5 border border-[#3370FF]/15 text-[#3370FF] rounded-lg flex items-center justify-center select-none font-bold text-xs">
                          飞书
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 select-none">
                            <span className="text-xs font-bold text-slate-800">飞书 (Feishu)</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${
                              currentUser.feishuUserId
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            }`}>
                              {currentUser.feishuUserId ? "已关联" : "未绑定"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {currentUser.feishuUserId
                              ? `绑定账号 ID: ${currentUser.feishuUserId}`
                              : "支持系统消息实时通知推送与扫码快捷登录"
                            }
                          </p>
                        </div>
                      </div>
                      {currentUser.feishuUserId ? (
                        <button
                          onClick={() => handleUnbind("feishu")}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-250 text-rose-600 font-bold text-[10.5px] rounded-lg cursor-pointer transition-colors flex items-center gap-1 hover:border-rose-300 shadow-3xs"
                        >
                          <Unlink className="h-3 w-3 shrink-0" />
                          <span>解除绑定</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setBindingPlatform("feishu")}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] rounded-lg cursor-pointer transition-all shadow-3xs"
                        >
                          <span>绑定账号</span>
                        </button>
                      )}
                    </div>

                    {/* WeChat Work */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#1AAD19]/5 border border-[#1AAD19]/15 text-[#1AAD19] rounded-lg flex items-center justify-center select-none font-bold text-xs">
                          企微
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 select-none">
                            <span className="text-xs font-bold text-slate-800">企业微信 (WeChat Work)</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${
                              currentUser.wechatUserId
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            }`}>
                              {currentUser.wechatUserId ? "已关联" : "未绑定"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {currentUser.wechatUserId
                              ? `绑定账号 ID: ${currentUser.wechatUserId}`
                              : "关联后通过微信/企业微信扫码即可免密登录"
                            }
                          </p>
                        </div>
                      </div>
                      {currentUser.wechatUserId ? (
                        <button
                          onClick={() => handleUnbind("wechat")}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-250 text-rose-600 font-bold text-[10.5px] rounded-lg cursor-pointer transition-colors flex items-center gap-1 hover:border-rose-300 shadow-3xs"
                        >
                          <Unlink className="h-3 w-3 shrink-0" />
                          <span>解除绑定</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setBindingPlatform("wechat")}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] rounded-lg cursor-pointer transition-all shadow-3xs"
                        >
                          <span>绑定账号</span>
                        </button>
                      )}
                    </div>

                    {/* DingTalk */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#0089FF]/5 border border-[#0089FF]/15 text-[#0089FF] rounded-lg flex items-center justify-center select-none font-bold text-xs">
                          钉钉
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 select-none">
                            <span className="text-xs font-bold text-slate-800">钉钉 (DingTalk)</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${
                              currentUser.dingtalkUserId
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            }`}>
                              {currentUser.dingtalkUserId ? "已关联" : "未绑定"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {currentUser.dingtalkUserId
                              ? `绑定账号 ID: ${currentUser.dingtalkUserId}`
                              : "绑定阿里钉钉，扫描网页端专属二维码快捷安全登入"
                            }
                          </p>
                        </div>
                      </div>
                      {currentUser.dingtalkUserId ? (
                        <button
                          onClick={() => handleUnbind("dingtalk")}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-250 text-rose-600 font-bold text-[10.5px] rounded-lg cursor-pointer transition-colors flex items-center gap-1 hover:border-rose-300 shadow-3xs"
                        >
                          <Unlink className="h-3 w-3 shrink-0" />
                          <span>解除绑定</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setBindingPlatform("dingtalk")}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] rounded-lg cursor-pointer transition-all shadow-3xs"
                        >
                          <span>绑定账号</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      <ConfirmDialog
        isOpen={showUnbindConfirm}
        title={`解除关联${unbindPlatform === "feishu" ? "飞书" : unbindPlatform === "wechat" ? "企业微信" : "钉钉"}`}
        message={`您确定要解绑当前关联的${unbindPlatform === "feishu" ? "飞书" : unbindPlatform === "wechat" ? "企业微信" : "钉钉"}账号吗？解除后，您将无法通过该三方通道直接进行免密快速登录。`}
        confirmText="确认解绑"
        cancelText="取消"
        type="warning"
        onConfirm={performUnbind}
        onCancel={() => {
          setShowUnbindConfirm(false);
          setUnbindPlatform(null);
        }}
      />

      {innerToast && (
        <div className="fixed bottom-6 right-6 z-[800] flex items-center gap-2 p-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg animate-fade-in text-[10px] font-bold leading-none select-none">
          <span className={`w-1.5 h-1.5 rounded-full ${innerToast.type === "success" ? "bg-emerald-400 animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span>{innerToast.message}</span>
        </div>
      )}

    </div>
  );
}
