/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, AlertTriangle, Info, HelpCircle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  type = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getColorClasses = () => {
    switch (type) {
      case "danger":
        return {
          bar: "bg-rose-500",
          iconBg: "bg-rose-100 text-rose-600 animate-pulse",
          confirmBtn: "bg-rose-600 hover:bg-rose-700 hover:scale-102 shadow-rose-100 text-white",
          border: "border-rose-100",
        };
      case "warning":
        return {
          bar: "bg-amber-500",
          iconBg: "bg-amber-100 text-amber-600",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 hover:scale-102 shadow-amber-100 text-white",
          border: "border-amber-100",
        };
      case "info":
      default:
        return {
          bar: "bg-indigo-500",
          iconBg: "bg-indigo-100 text-indigo-650",
          confirmBtn: "bg-indigo-600 hover:bg-indigo-700 hover:scale-102 shadow-indigo-100 text-white",
          border: "border-indigo-100",
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className={`relative bg-white w-full max-w-sm rounded-3xl shadow-2xl border ${colors.border} overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Indicator */}
        <div className={`h-1.5 w-full ${colors.bar}`} />

        {/* Content Body */}
        <div className="p-5 flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 ${colors.iconBg}`}>
            {type === "danger" ? (
              <AlertTriangle className="h-6 w-6" />
            ) : type === "warning" ? (
              <HelpCircle className="h-6 w-6" />
            ) : (
              <Info className="h-6 w-6" />
            )}
          </div>

          <h3 className="text-sm font-black text-slate-850 tracking-tight leading-snug">
            {title}
          </h3>

          <p className="text-[10.5px] font-medium text-slate-500 mt-2 leading-relaxed whitespace-pre-wrap max-w-xs">
            {message}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-50/75 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-[11px] font-black text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl py-2.5 transition-all cursor-pointer active:scale-98 select-none text-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 text-[11px] font-black rounded-xl py-2.5 shadow-md transition-all cursor-pointer active:scale-98 select-none text-center ${colors.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
