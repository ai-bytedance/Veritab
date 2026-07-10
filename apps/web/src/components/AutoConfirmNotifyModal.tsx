/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MessageSquare, Send, X, AlertTriangle, Eye, ShieldCheck, Check } from "lucide-react";

interface AutoConfirmNotifyModalProps {
  isOpen: boolean;
  provider: string;
  payload: {
    title: string;
    type: string;
    content: string;
    mentions?: string[];
    link?: string;
  } | null;
  onConfirm: (bypassFuture: boolean) => void;
  onCancel: () => void;
}

export default function AutoConfirmNotifyModal({
  isOpen,
  provider,
  payload,
  onConfirm,
  onCancel,
}: AutoConfirmNotifyModalProps) {
  const [bypass, setBypass] = useState(false);

  if (!isOpen || !payload) return null;

  // Render readable chinese action source
  const getActionSourceLabel = (type?: string) => {
    switch (type) {
      case "RequirementCreated":
        return "✨ 创建全新业务需求";
      case "RequirementStatusChanged":
        return "🔄 业务生命周期流转";
      case "TestCaseCreated":
        return "🧪 录入高可用测试用例";
      case "DefectCreated":
        return "🚨 新增缺陷故障故障登记";
      default:
        return "⚡ 系统变更信息流转";
    }
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4" id="auto-confirm-notify-overlay">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onCancel}
      />

      {/* Dialog Body */}
      <div
        className="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 font-sans animate-in fade-in-50 zoom-in-95 duration-200"
        id="auto-confirm-notify-content"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <MessageSquare className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-800">消息通知分发二次确认</h3>
              <p className="text-[10px] text-slate-400">选择性自动触发机器人推送，确保信息精确流转</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-full cursor-pointer transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Description body */}
        <div className="mt-4 space-y-3.5">
          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100/60 flex items-start gap-2.5">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-550 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-900">
                检测到已开启新变更自动推送事件
              </div>
              <p className="text-[10px] text-amber-800 leading-relaxed mt-1">
                根据您的系统集成设置，在发生以下新事项时，会自动分发推送到对应的协作群。我们提供此次过滤选择权，您可以决定是否立刻执行分发。
              </p>
            </div>
          </div>

          {/* Card Message Preview */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              <span>消息卡片预览 ({provider === "feishu" ? "飞书 LARK" : "即时协作推客"})</span>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-4 font-sans space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-indigo-50/50 pb-2">
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {getActionSourceLabel(payload.type)}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              <div>
                <div className="font-black text-slate-800 text-xs">
                  {payload.title}
                </div>
                <div className="text-[11px] text-slate-600 mt-2 bg-white border border-slate-150 p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed font-sans">
                  {payload.content}
                </div>
              </div>

              {payload.mentions && payload.mentions.length > 0 && (
                <div className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mt-1 bg-indigo-50/30 px-2 py-1 rounded-lg w-max">
                  <span>🎯 @提及:</span>
                  <span className="font-bold font-sans">
                    {payload.mentions.map(m => m).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Toggle for bypassing future checks */}
          <label className="flex items-center gap-2 cursor-pointer group pt-1.5">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={bypass}
                onChange={(e) => setBypass(e.target.checked)}
              />
              <div className="h-4.5 w-4.5 rounded-md border border-slate-300 bg-white transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-600" />
              <Check className="absolute h-3 w-3 text-white pointer-events-none opacity-0 transition-opacity peer-checked:opacity-100" />
            </div>
            <span className="text-xs text-slate-500 group-hover:text-slate-700 select-none transition-colors">
              不弹出此确认框，后续相同事件一律直接免确认自动发送
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-2.5 justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-205 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-55 cursor-pointer transition-colors shadow-2xs"
          >
            本次不发送
          </button>
          <button
            type="button"
            onClick={() => onConfirm(bypass)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white px-5 py-2.5 cursor-pointer transition-colors shadow-sm"
          >
            <Send className="h-3.5 w-3.5 text-indigo-400" />
            <span>确认发送并同步</span>
          </button>
        </div>
      </div>
    </div>
  );
}
