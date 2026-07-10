/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Settings,
  Save,
  QrCode,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { SystemConfig, User } from "../types";

interface SsoConfigSectionProps {
  systemConfig: SystemConfig;
  onUpdateConfig: (cfg: SystemConfig) => void;
  isAdmin: boolean;
  users: User[];
}

export default function SsoConfigSection({
  systemConfig,
  onUpdateConfig,
  isAdmin,
  users,
}: SsoConfigSectionProps) {
  // SSO Enable Toggles
  const [feishuEnabled, setFeishuEnabled] = useState(systemConfig.feishuLoginEnabled ?? true);
  const [dingtalkEnabled, setDingtalkEnabled] = useState(systemConfig.dingtalkLoginEnabled ?? true);
  const [wechatEnabled, setWechatEnabled] = useState(systemConfig.wechatLoginEnabled ?? true);

  // Configuration Fields
  const [feishuAppId, setFeishuAppId] = useState(systemConfig.feishuLoginAppId || "cli_mock_feishu_appid_123");
  const [feishuAppSecret, setFeishuAppSecret] = useState(systemConfig.feishuLoginAppSecret || "mock_secret_feishu_456");

  const [dingtalkAppKey, setDingtalkAppKey] = useState(systemConfig.dingtalkLoginAppKey || "ding_mock_appkey_789");
  const [dingtalkAppSecret, setDingtalkAppSecret] = useState(systemConfig.dingtalkLoginAppSecret || "mock_secret_dingtalk_abc");

  const [wechatCorpId, setWechatCorpId] = useState(systemConfig.wechatLoginCorpId || "ww_mock_corpid_def");
  const [wechatAgentId, setWechatAgentId] = useState(systemConfig.wechatLoginAgentId || "1000002");
  const [wechatSecret, setWechatSecret] = useState(systemConfig.wechatLoginSecret || "mock_secret_wechat_ghi");

  // Feedback Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Interactive Debugger State
  const [debugPlatform, setDebugPlatform] = useState<"feishu" | "dingtalk" | "wechat">("feishu");
  const [debugUser, setDebugUser] = useState<string>(users[0]?.id || "");
  const [debugStep, setDebugStep] = useState<number>(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleSaveConfigs = () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能修改三方扫码登录参数！", "error");
      return;
    }
    try {
      onUpdateConfig({
        ...systemConfig,
        feishuLoginEnabled: feishuEnabled,
        dingtalkLoginEnabled: dingtalkEnabled,
        wechatLoginEnabled: wechatEnabled,
        feishuLoginAppId: feishuAppId,
        feishuLoginAppSecret: feishuAppSecret,
        dingtalkLoginAppKey: dingtalkAppKey,
        dingtalkLoginAppSecret: dingtalkAppSecret,
        wechatLoginCorpId: wechatCorpId,
        wechatLoginAgentId: wechatAgentId,
        wechatLoginSecret: wechatSecret,
      });
      showToast("🟢 飞书、钉钉、企业微信「三方扫码登录」网关参数已成功保存上线！", "success");
    } catch (err: any) {
      showToast(`⚠️ 保存失败: ${err.message || "未知错误"}`, "error");
    }
  };

  // Run Step-by-Step Interactive Integration Debugging
  const startDebugFlow = () => {
    if (isDebugging) return;

    const selectedUserObj = users.find(u => u.id === debugUser);
    if (!selectedUserObj) {
      showToast("⚠️ 请先在联调面板中选择一个用于测试的系统账号！", "error");
      return;
    }

    const boundId =
      debugPlatform === "feishu" ? selectedUserObj.feishuUserId :
      debugPlatform === "dingtalk" ? selectedUserObj.dingtalkUserId :
      selectedUserObj.wechatUserId;

    if (!boundId) {
      showToast(`⚠️ 账号【${selectedUserObj.nickname}】尚未绑定该平台的第三方ID，请先绑定后再行测试！`, "error");
      return;
    }

    const platformName =
      debugPlatform === "feishu" ? "飞书 Feishu" :
      debugPlatform === "dingtalk" ? "钉钉 DingTalk" :
      "企业微信 WeChat Work";

    const isPlatformEnabled =
      debugPlatform === "feishu" ? feishuEnabled :
      debugPlatform === "dingtalk" ? dingtalkEnabled :
      wechatEnabled;

    if (!isPlatformEnabled) {
      showToast(`⚠️ 【${platformName}】扫码登录在配置中已被关闭，请先开启后再进行联调！`, "error");
      return;
    }

    setIsDebugging(true);
    setDebugStep(1);
    setDebugLogs([`[INFO] 正在启动 ${platformName} 扫码登录接入测试工程...`]);

    const addLog = (text: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setDebugLogs(prev => [...prev, text]);
          resolve();
        }, delay);
      });
    };

    // Simulated multi-step oauth handshaking
    addLog(`[STEP 1] 构造授权认证链接 (Authorize Redirect Link)...`, 800)
      .then(() => {
        const mockUrl =
          debugPlatform === "feishu" ? `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${feishuAppId}&redirect_uri=https://veritab.com/sso/callback` :
          debugPlatform === "dingtalk" ? `https://login.dingtalk.com/oauth2/auth?client_id=${dingtalkAppKey}&redirect_uri=https://veritab.com/sso/callback` :
          `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${wechatCorpId}&agentid=${wechatAgentId}&redirect_uri=https://veritab.com/sso/callback`;
        return addLog(`[SSO URL] ${mockUrl}`, 400);
      })
      .then(() => {
        setDebugStep(2);
        return addLog(`[STEP 2] 模拟用户在客户端进行扫码授权认证。测试账号: ${selectedUserObj.nickname} (${selectedUserObj.username})`, 1000);
      })
      .then(() => {
        const mockCode = `auth_code_mock_${Math.floor(100000 + Math.random() * 900000)}`;
        return addLog(`[CALLBACK] 授权码验证成功，完成回调重定向 -> 携带授权码 Code: ${mockCode}`, 900);
      })
      .then(() => {
        setDebugStep(3);
        return addLog(`[STEP 3] 服务端通过 Code 换取当前平台的用户身份。`, 1000);
      })
      .then(() => {
        return addLog(`[API POST] 请求获取用户信息 API，已验证签名秘钥。`, 500);
      })
      .then(() => {
        return addLog(`[SUCCESS] 拿到当前用户的 UnionID/OpenID 标识: ${boundId}`, 700);
      })
      .then(() => {
        setDebugStep(4);
        return addLog(`[STEP 4] 匹配系统内置账号映射，进行登录会话注入。`, 800);
      })
      .then(() => {
        return addLog(`[LOGIN] 成功匹配系统用户 ID: ${selectedUserObj.id}, 昵称: ${selectedUserObj.nickname}`, 500);
      })
      .then(() => {
        setDebugStep(5);
        addLog(`[DONE] 🎉 恭喜，${platformName} 扫码登录全链路联调检测通过！安全认证通过，登录成功。`, 600);
        setIsDebugging(false);
      });
  };

  return (
    <div className="space-y-6 relative" id="sso-config-panel-section">
      {/* Premium Toast feedback */}
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

      {/* Header Info */}
      <div className="flex items-center gap-2 border-b border-slate-50 pb-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs">
        <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <QrCode className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            三方扫码登录网关配置
          </h3>
          <p className="text-[11px] text-slate-400">
            合理设计并管理企业微信、钉钉与飞书的扫码快捷登录参数。配置开启后可在登录页自由切换。
          </p>
        </div>
      </div>

      {/* Grid of Three Platforms */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Feishu Config Card */}
        <div className={`rounded-2xl border bg-white p-5 shadow-3xs space-y-4 flex flex-col justify-between transition-all duration-200 ${
          feishuEnabled ? "border-indigo-150" : "border-slate-100 opacity-80"
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3370FF]" />
                <span className="text-xs font-bold text-slate-850">飞书 (Feishu) 扫码</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={feishuEnabled}
                  onChange={(e) => {
                    if (!isAdmin) {
                      showToast("⚠️ 只读警告：普通成员无权修改登录开关。", "error");
                      return;
                    }
                    setFeishuEnabled(e.target.checked);
                  }}
                  className="sr-only peer"
                  disabled={!isAdmin}
                />
                <div className="w-8 h-4.5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#3370FF]"></div>
              </label>
            </div>

            {feishuEnabled ? (
              <div className="space-y-3.5 animate-fade-in text-left">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">App ID (Client ID)</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                    value={feishuAppId}
                    onChange={(e) => setFeishuAppId(e.target.value)}
                    placeholder="请输入 App ID..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">App Secret (Client Secret)</label>
                  <input
                    type="password"
                    disabled={!isAdmin}
                    className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                    value={feishuAppSecret}
                    onChange={(e) => setFeishuAppSecret(e.target.value)}
                    placeholder="请输入 App Secret..."
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                此扫码登录方式已禁用
              </div>
            )}
          </div>
          <div className="text-[9px] text-slate-400 font-medium pt-2 border-t border-slate-50">
            支持标准自建应用或应用商店托管自研。
          </div>
        </div>

        {/* DingTalk Config Card */}
        <div className={`rounded-2xl border bg-white p-5 shadow-3xs space-y-4 flex flex-col justify-between transition-all duration-200 ${
          dingtalkEnabled ? "border-indigo-150" : "border-slate-100 opacity-80"
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0089FF]" />
                <span className="text-xs font-bold text-slate-850">钉钉 (DingTalk) 扫码</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dingtalkEnabled}
                  onChange={(e) => {
                    if (!isAdmin) {
                      showToast("⚠️ 只读警告：普通成员无权修改登录开关。", "error");
                      return;
                    }
                    setDingtalkEnabled(e.target.checked);
                  }}
                  className="sr-only peer"
                  disabled={!isAdmin}
                />
                <div className="w-8 h-4.5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0089FF]"></div>
              </label>
            </div>

            {dingtalkEnabled ? (
              <div className="space-y-3.5 animate-fade-in text-left">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">App Key (Client ID)</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                    value={dingtalkAppKey}
                    onChange={(e) => setDingtalkAppKey(e.target.value)}
                    placeholder="请输入 App Key..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">App Secret</label>
                  <input
                    type="password"
                    disabled={!isAdmin}
                    className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                    value={dingtalkAppSecret}
                    onChange={(e) => setDingtalkAppSecret(e.target.value)}
                    placeholder="请输入 App Secret..."
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                此扫码登录方式已禁用
              </div>
            )}
          </div>
          <div className="text-[9px] text-slate-400 font-medium pt-2 border-t border-slate-50">
            支持基于企业内开发、H5微应用授权。
          </div>
        </div>

        {/* WeChat Config Card */}
        <div className={`rounded-2xl border bg-white p-5 shadow-3xs space-y-4 flex flex-col justify-between transition-all duration-200 ${
          wechatEnabled ? "border-indigo-150" : "border-slate-100 opacity-80"
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1AAD19]" />
                <span className="text-xs font-bold text-slate-850">企业微信 扫码</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={wechatEnabled}
                  onChange={(e) => {
                    if (!isAdmin) {
                      showToast("⚠️ 只读警告：普通成员无权修改登录开关。", "error");
                      return;
                    }
                    setWechatEnabled(e.target.checked);
                  }}
                  className="sr-only peer"
                  disabled={!isAdmin}
                />
                <div className="w-8 h-4.5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#1AAD19]"></div>
              </label>
            </div>

            {wechatEnabled ? (
              <div className="space-y-3.5 animate-fade-in text-left">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">Corp ID (企业唯一ID)</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                    value={wechatCorpId}
                    onChange={(e) => setWechatCorpId(e.target.value)}
                    placeholder="请输入 Corp ID..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">Agent ID</label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                      value={wechatAgentId}
                      onChange={(e) => setWechatAgentId(e.target.value)}
                      placeholder="如 1000002"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 block pl-0.5">Secret</label>
                    <input
                      type="password"
                      disabled={!isAdmin}
                      className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-mono"
                      value={wechatSecret}
                      onChange={(e) => setWechatSecret(e.target.value)}
                      placeholder="应用Secret..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                此扫码登录方式已禁用
              </div>
            )}
          </div>
          <div className="text-[9px] text-slate-400 font-medium pt-2 border-t border-slate-50">
            通过企业微信官方自建应用完成统一单点登录认证。
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
        <span className="text-[10px] text-slate-400 font-medium leading-relaxed pl-0.5">
          {isAdmin ? "提示：配置完成后请点击「保存扫码登录配置」立即同步，工作区登录页将立即完成自动开启渲染。" : "只读模式：普通研发协作者无法更改三方SSO授权密钥。"}
        </span>
        <button
          onClick={handleSaveConfigs}
          disabled={!isAdmin}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Save className="h-3.5 w-3.5" />
          <span>保存扫码登录配置</span>
        </button>
      </div>

      {/* Advanced Interactive Integration Debugger Card */}
      <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-3xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
          <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Smartphone className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              🛠️ 三方扫码 SSO 接口调试与联调沙盒
            </h4>
            <p className="text-[10.5px] text-slate-400 leading-normal">
              提供标准 Code 与 Token 握手闭环调试模拟，供研发质控工程师排查 OAuth 回调机制。
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-12">
          {/* Controls */}
          <div className="md:col-span-5 space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase pl-0.5">1. 选择调试平台</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "feishu", label: "飞书", bg: "bg-[#3370FF]" },
                  { id: "dingtalk", label: "钉钉", bg: "bg-[#0089FF]" },
                  { id: "wechat", label: "企微", bg: "bg-[#1AAD19]" }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setDebugPlatform(p.id as any);
                      setDebugStep(0);
                      setDebugLogs([]);
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border text-center ${
                      debugPlatform === p.id
                        ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                        : "bg-slate-50/50 text-slate-500 border-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase pl-0.5">2. 绑定模拟账号</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-none"
                value={debugUser}
                onChange={(e) => {
                  setDebugUser(e.target.value);
                  setDebugStep(0);
                  setDebugLogs([]);
                }}
              >
                {users.map(u => {
                  const boundStr =
                    debugPlatform === "feishu" ? (u.feishuUserId ? "已绑定飞书" : "未绑定ID") :
                    debugPlatform === "dingtalk" ? (u.dingtalkUserId ? "已绑定钉钉" : "未绑定ID") :
                    (u.wechatUserId ? "已绑定企微" : "未绑定ID");

                  return (
                    <option key={u.id} value={u.id}>
                      {u.nickname} ({boundStr})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={startDebugFlow}
              disabled={isDebugging}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isDebugging ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>正在执行联调测试...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>启动 SSO 接口闭环模拟测试</span>
                </>
              )}
            </button>

            {/* Steps visualizer */}
            <div className="pt-2 space-y-1.5 select-none">
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider pl-0.5">联调握手状态</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(step => {
                  const isActive = debugStep >= step;
                  const isCurrent = debugStep === step;
                  return (
                    <div key={step} className="flex-1 flex items-center gap-1">
                      <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        isCurrent ? "bg-amber-500 animate-pulse" :
                        isActive ? "bg-indigo-600" : "bg-slate-200"
                      }`} />
                      {step < 5 && <ChevronRight className="h-2 w-2 text-slate-300" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 px-0.5 font-bold">
                <span>1. 生成URL</span>
                <span>扫码成功</span>
                <span>TOKEN校验</span>
                <span>5. 登录会话</span>
              </div>
            </div>
          </div>

          {/* Simulated Terminal Console Output */}
          <div className="md:col-span-7 flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-950 p-4 font-mono text-[10.5px] min-h-[180px] text-slate-350 shadow-inner">
            <div className="space-y-1 max-h-[160px] overflow-y-auto scrollbar-none">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 select-none">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                  Terminal / Live Auth Console Logger
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isDebugging ? "bg-amber-400" : "bg-emerald-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    isDebugging ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                </span>
              </div>

              {debugLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-6 select-none leading-relaxed">
                  [CONSOLE] 无活动日志。<br />
                  请选择测试用户并点击「启动 SSO 接口闭环模拟测试」按钮开始对接联调。
                </div>
              ) : (
                debugLogs.map((log, idx) => {
                  let colorClass = "text-slate-300";
                  if (log.startsWith("[SUCCESS]")) colorClass = "text-emerald-400 font-bold";
                  if (log.startsWith("[DONE]")) colorClass = "text-emerald-400 font-extrabold bg-emerald-950/30 px-1 rounded block mt-2";
                  if (log.startsWith("[CALLBACK]")) colorClass = "text-amber-400";
                  if (log.startsWith("[SSO URL]")) colorClass = "text-indigo-400 break-all select-all hover:bg-slate-800 p-0.5 rounded";
                  if (log.startsWith("[INFO]")) colorClass = "text-slate-400 font-semibold";

                  return (
                    <div key={idx} className={`leading-normal py-0.5 ${colorClass}`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-850 pt-1.5 mt-2 flex items-center justify-between text-[9px] text-slate-500 select-none">
              <span>SANDBOX HOST: localhost:3000</span>
              <span>SSO HANDSHAKE ENGINE v1.2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
