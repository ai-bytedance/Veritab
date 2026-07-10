/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Settings,
  Save,
  Zap,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { SystemConfig } from "../types";

interface WebhookConfigSectionProps {
  systemConfig: SystemConfig;
  onUpdateConfig: (cfg: SystemConfig) => void;
  isAdmin: boolean;
}

export default function WebhookConfigSection({
  systemConfig,
  onUpdateConfig,
  isAdmin,
}: WebhookConfigSectionProps) {
  // Webhook states
  const [feishuUrl, setFeishuUrl] = useState(systemConfig.feishuConfig.webhookUrl);
  const [feishuEnabled, setFeishuEnabled] = useState(systemConfig.feishuConfig.enabled);
  const [feishuNotifyOnReqCreate, setFeishuNotifyOnReqCreate] = useState(systemConfig.feishuConfig.notifyOnReqCreate ?? systemConfig.feishuConfig.notifyOnCreate ?? true);
  const [feishuNotifyOnReqChange, setFeishuNotifyOnReqChange] = useState(systemConfig.feishuConfig.notifyOnReqChange ?? systemConfig.feishuConfig.notifyOnStatusChange ?? true);
  const [feishuNotifyOnCaseCreate, setFeishuNotifyOnCaseCreate] = useState(systemConfig.feishuConfig.notifyOnCaseCreate ?? systemConfig.feishuConfig.notifyOnCreate ?? true);
  const [feishuNotifyOnCaseChange, setFeishuNotifyOnCaseChange] = useState(systemConfig.feishuConfig.notifyOnCaseChange ?? systemConfig.feishuConfig.notifyOnStatusChange ?? true);
  const [feishuNotifyOnDefectCreate, setFeishuNotifyOnDefectCreate] = useState(systemConfig.feishuConfig.notifyOnDefectCreate ?? systemConfig.feishuConfig.notifyOnCreate ?? true);
  const [feishuNotifyOnDefectChange, setFeishuNotifyOnDefectChange] = useState(systemConfig.feishuConfig.notifyOnDefectChange ?? systemConfig.feishuConfig.notifyOnStatusChange ?? true);
  const [feishuNotifyOnCommentMention, setFeishuNotifyOnCommentMention] = useState(systemConfig.feishuConfig.notifyOnCommentMention ?? true);

  const [dingtalkUrl, setDingtalkUrl] = useState(systemConfig.dingtalkConfig.webhookUrl);
  const [dingtalkEnabled, setDingtalkEnabled] = useState(systemConfig.dingtalkConfig.enabled);
  const [dingtalkNotifyOnReqCreate, setDingtalkNotifyOnReqCreate] = useState(systemConfig.dingtalkConfig.notifyOnReqCreate ?? systemConfig.dingtalkConfig.notifyOnCreate ?? true);
  const [dingtalkNotifyOnReqChange, setDingtalkNotifyOnReqChange] = useState(systemConfig.dingtalkConfig.notifyOnReqChange ?? systemConfig.dingtalkConfig.notifyOnStatusChange ?? true);
  const [dingtalkNotifyOnCaseCreate, setDingtalkNotifyOnCaseCreate] = useState(systemConfig.dingtalkConfig.notifyOnCaseCreate ?? systemConfig.dingtalkConfig.notifyOnCreate ?? true);
  const [dingtalkNotifyOnCaseChange, setDingtalkNotifyOnCaseChange] = useState(systemConfig.dingtalkConfig.notifyOnCaseChange ?? systemConfig.dingtalkConfig.notifyOnStatusChange ?? true);
  const [dingtalkNotifyOnDefectCreate, setDingtalkNotifyOnDefectCreate] = useState(systemConfig.dingtalkConfig.notifyOnDefectCreate ?? systemConfig.dingtalkConfig.notifyOnCreate ?? true);
  const [dingtalkNotifyOnDefectChange, setDingtalkNotifyOnDefectChange] = useState(systemConfig.dingtalkConfig.notifyOnDefectChange ?? systemConfig.dingtalkConfig.notifyOnStatusChange ?? true);
  const [dingtalkNotifyOnCommentMention, setDingtalkNotifyOnCommentMention] = useState(systemConfig.dingtalkConfig.notifyOnCommentMention ?? true);

  const [wechatUrl, setWechatUrl] = useState(systemConfig.wechatConfig.webhookUrl);
  const [wechatEnabled, setWechatEnabled] = useState(systemConfig.wechatConfig.enabled);
  const [wechatNotifyOnReqCreate, setWechatNotifyOnReqCreate] = useState(systemConfig.wechatConfig.notifyOnReqCreate ?? systemConfig.wechatConfig.notifyOnCreate ?? false);
  const [wechatNotifyOnReqChange, setWechatNotifyOnReqChange] = useState(systemConfig.wechatConfig.notifyOnReqChange ?? systemConfig.wechatConfig.notifyOnStatusChange ?? false);
  const [wechatNotifyOnCaseCreate, setWechatNotifyOnCaseCreate] = useState(systemConfig.wechatConfig.notifyOnCaseCreate ?? systemConfig.wechatConfig.notifyOnCreate ?? false);
  const [wechatNotifyOnCaseChange, setWechatNotifyOnCaseChange] = useState(systemConfig.wechatConfig.notifyOnCaseChange ?? systemConfig.wechatConfig.notifyOnStatusChange ?? false);
  const [wechatNotifyOnDefectCreate, setWechatNotifyOnDefectCreate] = useState(systemConfig.wechatConfig.notifyOnDefectCreate ?? systemConfig.wechatConfig.notifyOnCreate ?? false);
  const [wechatNotifyOnDefectChange, setWechatNotifyOnDefectChange] = useState(systemConfig.wechatConfig.notifyOnDefectChange ?? systemConfig.wechatConfig.notifyOnStatusChange ?? false);
  const [wechatNotifyOnCommentMention, setWechatNotifyOnCommentMention] = useState(systemConfig.wechatConfig.notifyOnCommentMention ?? false);

  const [feishuSecret, setFeishuSecret] = useState(systemConfig.feishuConfig.secret || "");
  const [dingtalkSecret, setDingtalkSecret] = useState(systemConfig.dingtalkConfig.secret || "");
  const [wechatSecret, setWechatSecret] = useState(systemConfig.wechatConfig.secret || "");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const [enableAutoNotifyConfirm, setEnableAutoNotifyConfirm] = useState(systemConfig.enableAutoNotifyConfirm ?? true);

  const handleSaveWebhooks = () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能更新多路推送网关配置！", "error");
      return;
    }
    try {
      onUpdateConfig({
        ...systemConfig,
        feishuConfig: {
          webhookUrl: feishuUrl,
          secret: feishuSecret,
          enabled: feishuEnabled,
          notifyOnCreate: feishuNotifyOnReqCreate || feishuNotifyOnCaseCreate || feishuNotifyOnDefectCreate,
          notifyOnStatusChange: feishuNotifyOnReqChange || feishuNotifyOnCaseChange || feishuNotifyOnDefectChange,
          notifyOnReqCreate: feishuNotifyOnReqCreate,
          notifyOnReqChange: feishuNotifyOnReqChange,
          notifyOnCaseCreate: feishuNotifyOnCaseCreate,
          notifyOnCaseChange: feishuNotifyOnCaseChange,
          notifyOnDefectCreate: feishuNotifyOnDefectCreate,
          notifyOnDefectChange: feishuNotifyOnDefectChange,
          notifyOnCommentMention: feishuNotifyOnCommentMention
        },
        dingtalkConfig: {
          webhookUrl: dingtalkUrl,
          secret: dingtalkSecret,
          enabled: dingtallEnabled(), // helper fallback safe evaluate
          notifyOnCreate: dingtalkNotifyOnReqCreate || dingtalkNotifyOnCaseCreate || dingtalkNotifyOnDefectCreate,
          notifyOnStatusChange: dingtalkNotifyOnReqChange || dingtalkNotifyOnCaseChange || dingtalkNotifyOnDefectChange,
          notifyOnReqCreate: dingtalkNotifyOnReqCreate,
          notifyOnReqChange: dingtalkNotifyOnReqChange,
          notifyOnCaseCreate: dingtalkNotifyOnCaseCreate,
          notifyOnCaseChange: dingtalkNotifyOnCaseChange,
          notifyOnDefectCreate: dingtalkNotifyOnDefectCreate,
          notifyOnDefectChange: dingtalkNotifyOnDefectChange,
          notifyOnCommentMention: dingtalkNotifyOnCommentMention
        },
        wechatConfig: {
          webhookUrl: wechatUrl,
          secret: wechatSecret,
          enabled: wechatEnabled,
          notifyOnCreate: wechatNotifyOnReqCreate || wechatNotifyOnCaseCreate || wechatNotifyOnDefectCreate,
          notifyOnStatusChange: wechatNotifyOnReqChange || wechatNotifyOnCaseChange || wechatNotifyOnDefectChange,
          notifyOnReqCreate: wechatNotifyOnReqCreate,
          notifyOnReqChange: wechatNotifyOnReqChange,
          notifyOnCaseCreate: wechatNotifyOnCaseCreate,
          notifyOnCaseChange: wechatNotifyOnCaseChange,
          notifyOnDefectCreate: wechatNotifyOnDefectCreate,
          notifyOnDefectChange: wechatNotifyOnDefectChange,
          notifyOnCommentMention: wechatNotifyOnCommentMention
        },
        enableAutoNotifyConfirm,
      });
      showToast("🟢 飞书 / 钉钉 / 企业微信多机器人推送网关已保存上线！", "success");
    } catch (err: any) {
      showToast(`⚠️ 保存失败: ${err.message || "未知错误"}`, "error");
    }
  };

  function dingtallEnabled() {
    return dingtalkEnabled;
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 relative" id="webhook-config-panel-section">
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

      <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
        <span className="p-2 rounded-lg bg-orange-50 text-indigo-600">
          <Workflow className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            推送网关配置
          </h3>
          <p className="text-[11px] text-slate-400">
            配置飞书、钉钉与企业微信群机器人的自动通知推送服务。
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/30 border border-indigo-150 border-indigo-100/50">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-indigo-900">高级推送行为审查机制</span>
            <span className="text-[10px] text-indigo-600 block leading-tight font-semibold">启用后，每次发送机器人通知前将弹起模拟确认卡片，方便敏捷联调排查。</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableAutoNotifyConfirm}
              onChange={(e) => {
                if (!isAdmin) {
                  showToast("⚠️ 只读警告：普通成员无权修改推送联调阀值。", "error");
                  return;
                }
                setEnableAutoNotifyConfirm(e.target.checked);
              }}
              className="sr-only peer"
              disabled={!isAdmin}
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* 1. Feishu integration card */}
        <div className="flex flex-col gap-3 border-b border-slate-50 pb-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700">飞书群机器人</span>
              <input
                type="checkbox"
                checked={feishuEnabled}
                onChange={(e) => {
                  if (!isAdmin) return;
                  setFeishuEnabled(e.target.checked);
                }}
                disabled={!isAdmin}
                className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-semibold">{feishuEnabled ? "已启用" : "已隐藏"}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mt-1">
              <div className="md:col-span-2">
                <span className="text-[10px] text-slate-500 font-bold pl-0.5 block mb-1">接口地址</span>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                  value={feishuUrl}
                  onChange={(e) => setFeishuUrl(e.target.value)}
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold pl-0.5 block mb-1">安全签名密钥</span>
                <input
                  type="password"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  value={feishuSecret}
                  onChange={(e) => setFeishuSecret(e.target.value)}
                  placeholder="签名校验密钥 (选填)"
                />
              </div>
            </div>
          </div>

          {feishuEnabled && (
            <div className="mt-2 p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl max-w-lg space-y-2.5">
              <div className="text-[9.5px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1">
                <span>通知事件订阅</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Requirements */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">📋 需求生命周期</span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnReqCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnReqCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-indigo-600 rounded"
                      />
                      <span>新建下发需求通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnReqChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnReqChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-indigo-600 rounded"
                      />
                      <span>状态及属性流转时通知</span>
                    </label>
                  </div>
                </div>

                {/* Test Cases */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">🧪 测试用例保障</span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnCaseCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnCaseCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-emerald-600 rounded"
                      />
                      <span>新建/生成用例时通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnCaseChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnCaseChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-emerald-600 rounded"
                      />
                      <span>执行状态或结果变动时</span>
                    </label>
                  </div>
                </div>

                {/* Defects */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm sm:col-span-2">
                  <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1">🚨 缺陷追踪反馈</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-0.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnDefectCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnDefectCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>新建缺陷提报时通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnDefectChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnDefectChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>缺陷状态及责任人变动时</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feishuNotifyOnCommentMention}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setFeishuNotifyOnCommentMention(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>评论 @ 提及成员时通知</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Dingtalk integration card */}
        <div className="flex flex-col gap-3 border-b border-slate-50 pb-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700">钉钉群机器人</span>
              <input
                type="checkbox"
                checked={dingtalkEnabled}
                onChange={(e) => {
                  if (!isAdmin) return;
                  setDingtalkEnabled(e.target.checked);
                }}
                disabled={!isAdmin}
                className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-semibold">{dingtalkEnabled ? "已启用" : "已隐藏"}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mt-1">
              <div className="md:col-span-2">
                <span className="text-[10px] text-slate-500 font-bold pl-0.5 block mb-1">接口地址</span>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                  value={dingtalkUrl}
                  onChange={(e) => setDingtalkUrl(e.target.value)}
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold pl-0.5 block mb-1">安全签名密钥</span>
                <input
                  type="password"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  value={dingtalkSecret}
                  onChange={(e) => setDingtalkSecret(e.target.value)}
                  placeholder="签名校验密钥 (选填)"
                />
              </div>
            </div>
          </div>

          {dingtalkEnabled && (
            <div className="mt-2 p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl max-w-lg space-y-2.5">
              <div className="text-[9.5px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1">
                <span>通知事件订阅</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Requirements */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">📋 需求生命周期</span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnReqCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnReqCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-indigo-600 rounded"
                      />
                      <span>新建下发需求通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnReqChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnReqChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-indigo-600 rounded"
                      />
                      <span>状态及属性流转时通知</span>
                    </label>
                  </div>
                </div>

                {/* Test Cases */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">🧪 测试用例保障</span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnCaseCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnCaseCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-emerald-600 rounded"
                      />
                      <span>新建/生成用例时通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnCaseChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnCaseChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-emerald-600 rounded"
                      />
                      <span>执行状态或结果变动时</span>
                    </label>
                  </div>
                </div>

                {/* Defects */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm sm:col-span-2">
                  <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1">🚨 缺陷追踪反馈</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-0.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnDefectCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnDefectCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>新建缺陷提报时通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnDefectChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnDefectChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>缺陷状态及责任人变动时</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dingtalkNotifyOnCommentMention}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setDingtalkNotifyOnCommentMention(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>评论 @ 提及成员时通知</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. WeChat integration card */}
        <div className="flex flex-col gap-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700">企业微信</span>
              <input
                type="checkbox"
                checked={wechatEnabled}
                onChange={(e) => {
                  if (!isAdmin) return;
                  setWechatEnabled(e.target.checked);
                }}
                disabled={!isAdmin}
                className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-semibold">{wechatEnabled ? "已启用" : "已隐藏"}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mt-1">
              <div className="md:col-span-2">
                <span className="text-[10px] text-slate-500 font-bold pl-0.5 block mb-1">接口地址</span>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                  value={wechatUrl}
                  onChange={(e) => setWechatUrl(e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold pl-0.5 block mb-1">安全签名密钥</span>
                <input
                  type="password"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  value={wechatSecret}
                  onChange={(e) => setWechatSecret(e.target.value)}
                  placeholder="签名校验密钥 (选填)"
                />
              </div>
            </div>
          </div>

          {wechatEnabled && (
            <div className="mt-2 p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl max-w-lg space-y-2.5">
              <div className="text-[9.5px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1">
                <span>通知事件订阅</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Requirements */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">📋 需求生命周期</span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnReqCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnReqCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-indigo-600 rounded"
                      />
                      <span>新建下发需求通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnReqChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnReqChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-indigo-600 rounded"
                      />
                      <span>状态及属性流转时通知</span>
                    </label>
                  </div>
                </div>

                {/* Test Cases */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">🧪 测试用例保障</span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnCaseCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnCaseCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-emerald-600 rounded"
                      />
                      <span>新建/生成用例时通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnCaseChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnCaseChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-emerald-600 rounded"
                      />
                      <span>执行状态或结果变动时</span>
                    </label>
                  </div>
                </div>

                {/* Defects */}
                <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm sm:col-span-2">
                  <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1">🚨 缺陷追踪反馈</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-0.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnDefectCreate}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnDefectCreate(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>新建缺陷提报时通知</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnDefectChange}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnDefectChange(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>缺陷状态及责任人变动时</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wechatNotifyOnCommentMention}
                        onChange={(e) => {
                          if (!isAdmin) return;
                          setWechatNotifyOnCommentMention(e.target.checked);
                        }}
                        disabled={!isAdmin}
                        className="h-3 w-3 accent-rose-600 rounded"
                      />
                      <span>评论 @ 提及成员时通知</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-50">
          <span className="text-[10px] text-slate-400 font-medium">
            {isAdmin ? "提示：配置保存后即时生效。" : "只读模式：无法更新推送配置。"}
          </span>
          <button
            onClick={handleSaveWebhooks}
            disabled={!isAdmin}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            <span>保存通知配置</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Inner representation elements to ensure we satisfy dependencies
interface WorkflowProps {
  className?: string;
}
function Workflow(props: WorkflowProps) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
