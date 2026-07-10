import React from "react";
import { HistoryLog } from "../types";
import { ArrowRight } from "lucide-react";

export default function HistoryLogTimeline({ logs }: { logs?: HistoryLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-4 text-slate-450 text-[11px] font-sans">
        暂无审计历史记录
      </div>
    );
  }

  // Sort logs descending (newest first)
  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const formatLogValue = (val?: string) => {
    if (!val) return "";
    const strVal = String(val);
    if (strVal.includes("[object Object]")) {
      return "更新数据";
    }

    if (strVal.trim().startsWith("{") && strVal.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(strVal);
        if (parsed && typeof parsed === "object") {
          if (parsed.overallStatus) {
            const statusMap: Record<string, string> = {
              untested: "未测试",
              pass: "通过",
              fail: "失败",
              blocked: "阻断",
              "未测试": "未测试",
              "通过": "通过",
              "失败": "失败",
              "阻断": "阻断",
            };
            return statusMap[parsed.overallStatus] || parsed.overallStatus;
          }
          if (parsed.description) {
            return parsed.description;
          }
          return "详情数据";
        }
      } catch (e) {
        // Fallback
      }
    }

    const statusMap: Record<string, string> = {
      untested: "未测试",
      pass: "通过",
      fail: "失败",
      blocked: "阻断",
    };
    return statusMap[strVal] || strVal;
  };

  const getLogTooltip = (val?: string) => {
    if (!val) return "";
    const strVal = String(val);
    if (strVal.trim().startsWith("{") && strVal.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(strVal);
        if (parsed && typeof parsed === "object") {
          if (parsed.description) {
            return `结论: ${parsed.overallStatus || ""}\n${parsed.description}`;
          }
          return JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        // Fallback
      }
    }
    const statusMap: Record<string, string> = {
      untested: "未测试",
      pass: "通过",
      fail: "失败",
      blocked: "阻断",
    };
    return statusMap[strVal] || strVal;
  };

  const getLogValueStyle = (val?: string, isNew: boolean = true) => {
    if (!val) return isNew ? "text-indigo-600 font-bold" : "text-slate-400 line-through";
    const formatted = formatLogValue(val);

    if (formatted === "通过" || formatted === "pass") {
      return isNew ? "text-emerald-650 font-extrabold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100" : "text-emerald-500/70 line-through";
    }
    if (formatted === "失败" || formatted === "fail") {
      return isNew ? "text-rose-650 font-extrabold bg-rose-50 px-1 py-0.2 rounded border border-rose-100" : "text-rose-500/70 line-through";
    }
    if (formatted === "阻断" || formatted === "blocked") {
      return isNew ? "text-amber-600 font-extrabold bg-amber-50 px-1 py-0.2 rounded border border-amber-100" : "text-amber-500/70 line-through";
    }
    if (formatted === "未测试" || formatted === "untested") {
      return isNew ? "text-slate-500 font-bold bg-slate-50 px-1 py-0.2 rounded border border-slate-100" : "text-slate-400 line-through";
    }

    return isNew ? "text-indigo-600 font-bold" : "text-slate-400 line-through";
  };

  // Helper to determine indicator color based on action type
  const getActionTheme = (action: string) => {
    const act = action || "";
    if (act.includes("创建") || act.includes("新建") || act.includes("提报") || act.includes("添加")) {
      return {
        dotBg: "bg-emerald-500",
        ringBg: "ring-emerald-50/50",
        bg: "bg-emerald-50/40 text-emerald-700 border-emerald-100",
      };
    }
    if (act.includes("删除") || act.includes("解除") || act.includes("移除") || act.includes("作废") || act.includes("取消")) {
      return {
        dotBg: "bg-rose-500",
        ringBg: "ring-rose-50/50",
        bg: "bg-rose-50/40 text-rose-700 border-rose-100",
      };
    }
    if (act.includes("完成") || act.includes("关闭") || act.includes("通过") || act.includes("解决")) {
      return {
        dotBg: "bg-sky-500",
        ringBg: "ring-sky-50/50",
        bg: "bg-sky-50/40 text-sky-700 border-sky-100",
      };
    }
    return {
      dotBg: "bg-indigo-500",
      ringBg: "ring-indigo-50/50",
      bg: "bg-indigo-50/40 text-indigo-700 border-indigo-100/60",
    };
  };

  return (
    <div className="relative pl-6 space-y-3 my-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
      {/* Vertical Timeline Line */}
      <span className="absolute left-3 top-0 bottom-0 w-[1px] bg-slate-100 pointer-events-none" />
      {sorted.map((log, index) => {
        const theme = getActionTheme(log.action || "");
        return (
          <div key={log.id || index} className="relative group transition-all">
            {/* Timeline Indicator Dot */}
            <span
              className={`absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${theme.dotBg} ring-3 ${theme.ringBg} transition-transform group-hover:scale-110 z-10`}
            />

            {/* Log Content Panel */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 text-[11px] font-sans">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {/* Operator Nickname */}
                <span className="font-bold text-slate-700 flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-100/70 px-1 py-0.5 rounded text-[10px]">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  {log.userName || "系统"}
                </span>

                {/* Action Tag */}
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${theme.bg}`}>
                  {log.action}
                </span>

                {/* Old value -> New value */}
                {log.oldValue && log.newValue && (
                  <div className="flex items-center gap-1.5 bg-slate-50/50 border border-slate-100/50 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                    <span
                      className={`truncate max-w-[60px] sm:max-w-[100px] ${getLogValueStyle(log.oldValue, false)}`}
                      title={getLogTooltip(log.oldValue)}
                    >
                      {formatLogValue(log.oldValue)}
                    </span>
                    <ArrowRight className="h-2.5 w-2.5 text-slate-300 shrink-0" />
                    <span
                      className={`truncate max-w-[60px] sm:max-w-[100px] ${getLogValueStyle(log.newValue, true)}`}
                      title={getLogTooltip(log.newValue)}
                    >
                      {formatLogValue(log.newValue)}
                    </span>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-400 shrink-0 select-none self-start sm:self-center">
                {new Date(log.createdAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
