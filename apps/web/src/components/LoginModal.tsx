/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
  Info,
  QrCode,
  Smartphone,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { User as SystemUser, UserGroup, SystemConfig } from "../types";
import { ApiError, authApi, isRemoteApiMode } from "../api/httpClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: SystemUser[];
  userGroups: UserGroup[];
  currentUser: SystemUser;
  onLogin: (user: SystemUser) => void;
  isForced?: boolean; // If true, can't be closed without logging in
  systemConfig?: SystemConfig;
}

export default function LoginModal({
  isOpen,
  onClose,
  users,
  userGroups,
  currentUser,
  onLogin,
  isForced = false,
  systemConfig
}: LoginModalProps) {
  const remoteMode = isRemoteApiMode();
  // Real Interactive Input States
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState<SystemUser | null>(null);
  const [loginMethod, setLoginMethod] = useState<"password" | "sso">("password");

  // Third-party Active SSO Platform Selection state
  const [ssoPlatform, setSsoPlatform] = useState<"feishu" | "wechat" | "dingtalk">("feishu");

  // Determine which SSO methods are enabled
  const isFeishuEnabled = !remoteMode && systemConfig?.feishuLoginEnabled !== false;
  const isWeChatEnabled = !remoteMode && !!systemConfig?.wechatLoginEnabled;
  const isDingTalkEnabled = !remoteMode && !!systemConfig?.dingtalkLoginEnabled;

  const anySsoEnabled = isFeishuEnabled || isWeChatEnabled || isDingTalkEnabled;

  // Sync default enabled platform on mount/config change
  useEffect(() => {
    if (systemConfig) {
      if (systemConfig.feishuLoginEnabled) {
        setSsoPlatform("feishu");
      } else if (systemConfig.wechatLoginEnabled) {
        setSsoPlatform("wechat");
      } else if (systemConfig.dingtalkLoginEnabled) {
        setSsoPlatform("dingtalk");
      }
    }
  }, [systemConfig]);

  // Get active users who have bound ID for specified SSO platform
  const getBoundSsoUsers = (platform: "feishu" | "wechat" | "dingtalk") => {
    return users.filter(u => {
      if (u.status === "disabled") return false;
      if (platform === "feishu") return !!u.feishuUserId;
      if (platform === "wechat") return !!u.wechatUserId;
      if (platform === "dingtalk") return !!u.dingtalkUserId;
      return false;
    });
  };

  const handleSimulatedSsoLogin = (selectedUser: SystemUser, platform: "feishu" | "wechat" | "dingtalk") => {
    setIsAuthenticating(true);
    setSuccessUser(selectedUser);
    setErrorMessage(null);

    setTimeout(() => {
      setIsAuthenticating(false);
      setShowSuccess(true);

      setTimeout(() => {
        onLogin(selectedUser);
        setShowSuccess(false);
        onClose();
        setSuccessUser(null);
      }, 800);
    }, 1000);
  };

  // Prefill the username and password with the system administrator on open
  useEffect(() => {
    if (isOpen) {
      if (remoteMode) {
        setUsernameInput("");
        setPassword("");
        setErrorMessage(null);
        setShowSuccess(false);
        setLoginMethod("password");
        return;
      }
      const adminUser = users.find(u => u.role === "admin");
      if (adminUser) {
        setUsernameInput(adminUser.username);
        setPassword(adminUser.password || "123456");
      } else {
        setUsernameInput("");
        setPassword("");
      }
      setErrorMessage(null);
      setShowSuccess(false);

      // Auto switch to password if no SSO is enabled
      if (!anySsoEnabled) {
        setLoginMethod("password");
      }
    }
  }, [isOpen, users, anySsoEnabled, remoteMode]);

  if (!isOpen) return null;

  // Password login verification
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const lookupUsername = usernameInput.trim().toLowerCase();
    if (!lookupUsername) {
      setErrorMessage("请输入系统授权用户名。");
      return;
    }

    if (remoteMode) {
      setIsAuthenticating(true);
      try {
        const result = await authApi.login(usernameInput.trim(), password);
        const authenticatedUser: SystemUser = {
          id: result.user.id,
          username: result.user.username,
          nickname: result.user.displayName,
          email: result.user.email,
          group: "server-managed",
          status: "active",
          // The NestJS Guard remains authoritative; admin UI requires an explicit server permission adapter.
          role: "member",
        };
        setSuccessUser(authenticatedUser);
        setShowSuccess(true);
        onLogin(authenticatedUser);
        onClose();
      } catch (error) {
        setErrorMessage(error instanceof ApiError ? error.message : "登录服务暂时不可用，请稍后重试。");
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    let matchedUser = users.find(u => u.username.trim().toLowerCase() === lookupUsername);

    if (!matchedUser) {
      setErrorMessage("该登录账户不存在，请检查用户名是否输入正确。");
      return;
    }

    // Checking if account is disabled by Admin
    if (matchedUser.status === "disabled") {
      setErrorMessage(`账户【${matchedUser.nickname}】已被系统管理员禁用，无法登入。`);
      return;
    }

    // Verify password, default is "123456"
    const actualPassword = matchedUser.password || "123456";
    if (password !== actualPassword) {
      setErrorMessage("账号或密码不正确，请重新输入。");
      return;
    }

    // Simulated authenticating latency
    setIsAuthenticating(true);
    setSuccessUser(matchedUser);

    setTimeout(() => {
      setIsAuthenticating(false);
      setShowSuccess(true);

      setTimeout(() => {
        onLogin(matchedUser);
        setShowSuccess(false);
        setPassword("");
        onClose();
        setSuccessUser(null);
      }, 800);
    }, 450);
  };

  const enabledSsoCount = (isFeishuEnabled ? 1 : 0) + (isWeChatEnabled ? 1 : 0) + (isDingTalkEnabled ? 1 : 0);

  // Active brand color settings for scanning view UI
  const getBrandDetails = (platform: "feishu" | "wechat" | "dingtalk") => {
    switch (platform) {
      case "feishu":
        return {
          name: "飞书",
          color: "text-[#3370FF]",
          bg: "bg-[#3370FF]/5",
          border: "border-[#3370FF]/25",
          btnBg: "bg-[#3370FF] hover:bg-[#255fd4]",
          qrSimulate: "模拟飞书扫码",
          subtext: "打开飞书客户端扫一扫，安全免密登录"
        };
      case "wechat":
        return {
          name: "企业微信",
          color: "text-[#1AAD19]",
          bg: "bg-[#1AAD19]/5",
          border: "border-[#1AAD19]/25",
          btnBg: "bg-[#1AAD19] hover:bg-[#158f14]",
          qrSimulate: "模拟企业微信扫码",
          subtext: "打开企业微信 App 扫一扫完成身份校验"
        };
      case "dingtalk":
        return {
          name: "钉钉",
          color: "text-[#0089FF]",
          bg: "bg-[#0089FF]/5",
          border: "border-[#0089FF]/25",
          btnBg: "bg-[#0089FF] hover:bg-[#0076db]",
          qrSimulate: "模拟钉钉扫码",
          subtext: "打开钉钉移动端扫一扫，核验身份快速登录"
        };
    }
  };

  const currentBrand = getBrandDetails(ssoPlatform);

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in font-sans" id="veritab-login-modal">
      <div className="relative bg-white w-full max-w-[480px] rounded-2xl shadow-xl border border-slate-150/70 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-left">

        {/* Top-Right Close Button (Disabled if forced) */}
        {!isForced && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4.5 p-1.5 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer z-50 animate-fade-in"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}

        {/* Brand Header Section with ample spacing */}
        <div className="px-6 pt-9 pb-8 md:px-8 md:pt-10 md:pb-8 text-center select-none border-b border-slate-100 bg-white">
          {/* Elegant Logo Icon */}
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm mb-4.5">
            <ShieldCheck className="h-7 w-7 text-indigo-600 animate-pulse" />
          </div>
          {/* Main Title - enlarged and stylish */}
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-snug">
            {systemConfig?.projectName || "Veritab 敏捷研发管理平台"}
          </h2>
        </div>

        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
          {/* Login Tabs Switcher */}
          {!showSuccess && anySsoEnabled && (
            <div className="flex border border-slate-150/55 bg-slate-50/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLoginMethod("password")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  loginMethod === "password"
                    ? "bg-white text-indigo-600 shadow-2xs border border-slate-100"
                    : "text-slate-450 hover:text-slate-700"
                }`}
              >
                密码账户登录
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("sso")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  loginMethod === "sso"
                    ? "bg-white text-indigo-600 shadow-2xs border border-slate-100"
                    : "text-slate-450 hover:text-slate-700"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>扫码安全登录</span>
              </button>
            </div>
          )}

          {/* Success Banner */}
          {showSuccess ? (
            <div className="py-8 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center space-y-2 text-center animate-scale-up">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">登录校验通过</h4>
                <p className="text-[10.5px] text-emerald-600 font-medium mt-0.5">
                  正在加载 【{successUser?.nickname}】 的工作环境...
                </p>
              </div>
            </div>
          ) : loginMethod === "sso" && anySsoEnabled ? (
            /* Multi-Platform SSO Scan Panel */
            <div className="space-y-4 animate-fade-in text-center flex flex-col items-center">

              {/* SSO Switcher Buttons if multiple platforms enabled */}
              {enabledSsoCount > 1 && (
                <div className="flex gap-1 bg-slate-50 border border-slate-150/60 p-0.5 rounded-lg w-full">
                  {isFeishuEnabled && (
                    <button
                      type="button"
                      onClick={() => setSsoPlatform("feishu")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                        ssoPlatform === "feishu"
                          ? "bg-white text-[#3370FF] shadow-3xs border border-slate-100"
                          : "text-slate-450 hover:text-slate-700"
                      }`}
                    >
                      飞书登录
                    </button>
                  )}
                  {isWeChatEnabled && (
                    <button
                      type="button"
                      onClick={() => setSsoPlatform("wechat")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                        ssoPlatform === "wechat"
                          ? "bg-white text-[#1AAD19] shadow-3xs border border-slate-100"
                          : "text-slate-450 hover:text-slate-700"
                      }`}
                    >
                      企业微信
                    </button>
                  )}
                  {isDingTalkEnabled && (
                    <button
                      type="button"
                      onClick={() => setSsoPlatform("dingtalk")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-center ${
                        ssoPlatform === "dingtalk"
                          ? "bg-white text-[#0089FF] shadow-3xs border border-slate-100"
                          : "text-slate-450 hover:text-slate-700"
                      }`}
                    >
                      钉钉登录
                    </button>
                  )}
                </div>
              )}

              {/* QR Code Container styled with platform colors */}
              <div className={`p-4 bg-white border ${currentBrand.border} rounded-2xl shadow-3xs relative group max-w-[200px] mx-auto transition-all`}>
                <div className="w-36 h-36 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center p-3 relative overflow-hidden select-none">
                  {isAuthenticating ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
                      <span className="text-[9px] text-indigo-600 font-bold animate-pulse">正在安全核验...</span>
                    </div>
                  ) : (
                    <>
                      <QrCode className={`w-20 h-20 ${currentBrand.color}`} />
                      <div className={`absolute inset-0 ${currentBrand.btnBg}/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <Smartphone className="h-5 w-5 text-white animate-bounce" />
                        <span className="text-[8px] text-white font-bold mt-1">{currentBrand.qrSimulate}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2 text-[9px] text-slate-450 font-bold">{currentBrand.name}客户端扫码快速登录</div>
              </div>

              {/* Bound Users Closed Loop Check */}
              {getBoundSsoUsers(ssoPlatform).length === 0 ? (
                <div className="w-full p-4 bg-amber-50/50 border border-amber-100/80 rounded-xl text-center space-y-1">
                  <p className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
                    <span>⚠️ 当前系统暂无已绑定{currentBrand.name}的账户</span>
                  </p>
                  <p className="text-[10px] text-amber-600/90 leading-relaxed">
                    请先使用「密码账户登录」，登入后点击右上角【设置】，在【三方绑定】中关联账号，即可通过该客户端扫码免密安全登入。
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-2 text-left">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 select-none">
                    <span className="h-px bg-slate-100 flex-1" />
                    <span>快捷模拟扫码 (联调闭环校验)</span>
                    <span className="h-px bg-slate-100 flex-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-0.5">
                    {getBoundSsoUsers(ssoPlatform).map(u => {
                      const boundId =
                        ssoPlatform === "feishu" ? u.feishuUserId :
                        ssoPlatform === "wechat" ? u.wechatUserId :
                        u.dingtalkUserId;
                      const avatarBg =
                        ssoPlatform === "feishu" ? "bg-[#3370FF]/5 text-[#3370FF]" :
                        ssoPlatform === "wechat" ? "bg-[#1AAD19]/5 text-[#1AAD19]" :
                        "bg-[#0089FF]/5 text-[#0089FF]";
                      const hoverBorder =
                        ssoPlatform === "feishu" ? "hover:border-[#3370FF]/60 hover:bg-[#3370FF]/5" :
                        ssoPlatform === "wechat" ? "hover:border-[#1AAD19]/60 hover:bg-[#1AAD19]/5" :
                        "hover:border-[#0089FF]/60 hover:bg-[#0089FF]/5";

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSimulatedSsoLogin(u, ssoPlatform)}
                          disabled={isAuthenticating}
                          className={`p-2 border border-slate-150 bg-white rounded-xl text-[10.5px] font-bold text-slate-700 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${hoverBorder}`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 uppercase border border-slate-100 ${avatarBg}`}>
                            {u.nickname.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="truncate text-[11px] font-bold text-slate-800">{u.nickname}</div>
                            <div className="text-[8px] font-mono text-slate-400 truncate mt-0.5">ID: {boundId}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Password Login Form */
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-4">

                {/* Username Input Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block pl-0.5">系统用户名</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="请输入授权用户名..."
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100/30 transition-all text-slate-800 placeholder-slate-400 shadow-3xs"
                    />
                    <UserIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Password Input Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-xs font-bold text-slate-600 block">系统安全密码</label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="请输入安全密码..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100/30 transition-all text-slate-800 placeholder-slate-400 shadow-3xs"
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl flex items-start gap-2 animate-fade-in font-bold leading-normal">
                  <span className="shrink-0 text-rose-500">⚠️</span>
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-100 active:scale-[0.98] shadow-md select-none mt-2"
              >
                {isAuthenticating ? (
                  <div className="h-4 w-4 border-2 border-t-indigo-200 border-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>立即登录</span>
                    <ArrowRight className="h-4 w-4 text-white" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Action footer */}
        {!isForced && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end text-[10px] text-slate-400 font-medium">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 transition-colors font-bold cursor-pointer"
            >
              暂不登录
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
