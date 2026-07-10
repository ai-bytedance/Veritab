/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, AlertTriangle, Settings, ArrowRight, ShieldCheck } from "lucide-react";

interface PromptMissingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDefault: () => void;
  onGoToSettings: () => void;
}

export default function PromptMissingModal({
  isOpen,
  onClose,
  onLoadDefault,
  onGoToSettings,
}: PromptMissingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[855] flex items-center justify-center p-4" id="prompt-missing-modal-overlay">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Content Container */}
      <div
        className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all border border-slate-100 font-sans animate-in fade-in-50 zoom-in-95 duration-200"
        id="prompt-missing-modal-content"
      >
        <div className="flex flex-col items-center text-center">
          {/* Animated Caution Icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-4 ring-amber-100/50">
            <AlertTriangle className="h-7 w-7 animate-bounce" />
          </div>

          <h3 className="text-base font-black text-slate-800">
            未配置大模型用例生成策略
          </h3>

          <p className="mt-2.5 text-xs text-slate-500 leading-relaxed max-w-sm">
            为了确保 AI 能够根据精准的质控规范，生成高覆盖率、包含前置和步骤的单元/流转测试用例，您需要在使用前至少配置一份主约束提示词策略（Prompt Strategy）。
          </p>

          {/* Quick Choice Boxes */}
          <div className="mt-5 w-full space-y-2 text-left">
            <button
              onClick={onLoadDefault}
              className="w-full flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/45 p-3.5 hover:bg-indigo-50 text-indigo-750 transition-all text-left"
            >
              <div className="min-w-0 pr-2">
                <div className="text-xs font-black flex items-center gap-1.5 text-indigo-900">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>一键载入「默认高可靠策略」</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  自动写入高精度的行业标准黑盒/变动敏捷测试用例策略
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-indigo-500 shrink-0" />
            </button>

            <button
              onClick={onGoToSettings}
              className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 hover:bg-slate-50 text-slate-705 transition-all text-left"
            >
              <div className="min-w-0 pr-2">
                <div className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  <span>自定义编写策略</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  前往「系统配置」手动定义测试生成提示词及模型供应参数
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div className="mt-6 flex w-full gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
