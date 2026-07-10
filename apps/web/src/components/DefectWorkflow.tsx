/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Activity } from "lucide-react";
import { DefectStatus } from "../types";

interface DefectWorkflowProps {
  currentStatus: DefectStatus;
  onUpdateStatus: (status: DefectStatus) => void;
  getNextAllowedStates: (current: DefectStatus) => Array<{
    status: DefectStatus;
    label: string;
    color: string;
  }>;
  users?: any[];
  onTriggerWebhook?: (provider: string, payload: any) => void;
  activeIssue?: any;
}

const DefectWorkflow: React.FC<DefectWorkflowProps> = ({
  currentStatus,
  onUpdateStatus,
  getNextAllowedStates,
  users,
  onTriggerWebhook,
  activeIssue,
}) => {
  const sequence = [
    DefectStatus.NEW,
    DefectStatus.CONFIRMED,
    DefectStatus.PROCESSING,
    DefectStatus.RESOLVED,
    DefectStatus.VERIFIED,
    DefectStatus.CLOSED,
  ];

  let activeIdx = sequence.indexOf(currentStatus);
  if (currentStatus === DefectStatus.REJECTED || currentStatus === DefectStatus.REOPEN) {
    activeIdx = 2; // Map exceptional states to the active-work lifecycle stage.
  }

  return (
    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4 text-left" id="defect-lifecycle-swimlane">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 select-none">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
          <span>缺陷流转生命周期阶段</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded font-black font-sans text-[10px] shrink-0">
            当前节点: {currentStatus}
          </span>
        </div>
      </div>

      <div className="relative pt-2 pb-1 px-1">
        {/* Progress tracks - matched to requirements pattern */}
        <div className="absolute top-5 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 rounded" />
        <div
          className={`absolute top-5 left-4 h-1 ${currentStatus === DefectStatus.REJECTED ? "bg-rose-500" : "bg-rose-500"} -translate-y-1/2 rounded transition-all duration-300 ease-out`}
          style={{ width: `calc(${activeIdx >= 0 ? (activeIdx / (sequence.length - 1)) * 100 : 0}% - 2rem)` }}
        />

        <div className="relative flex justify-between">
          {[
            { key: DefectStatus.NEW, label: "新建" },
            { key: DefectStatus.CONFIRMED, label: "已确认" },
            {
              key: DefectStatus.PROCESSING,
              label: currentStatus === DefectStatus.REJECTED ? "已驳回拒绝" : currentStatus === DefectStatus.REOPEN ? "重新排查中" : "排查开发中"
            },
            { key: DefectStatus.RESOLVED, label: "代码已解决" },
            { key: DefectStatus.VERIFIED, label: "回归已验证" },
            { key: DefectStatus.CLOSED, label: "回归已关闭" }
          ].map((node, idx) => {
            let isCurrent = currentStatus === node.key;
            if (node.key === DefectStatus.PROCESSING) {
              isCurrent = currentStatus === DefectStatus.PROCESSING || currentStatus === DefectStatus.REJECTED || currentStatus === DefectStatus.REOPEN;
            }
            const isPassed = idx <= activeIdx;

            let circleStyling = "bg-white border-slate-200 text-slate-300";
            if (isCurrent) {
              circleStyling = currentStatus === DefectStatus.REJECTED
                ? "bg-rose-600 border-rose-600 text-white"
                : currentStatus === DefectStatus.REOPEN
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-rose-600 border-rose-600 text-white";
            } else if (isPassed) {
              circleStyling = "bg-rose-50 border-rose-500 text-rose-600";
            }

            return (
              <div key={node.key} className="group flex flex-col items-center z-10">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${circleStyling}`}>
                  {isPassed && !isCurrent ? (
                    <span className="text-[10px] font-bold">✓</span>
                  ) : (
                    <span className="text-[9px] font-black">{idx + 1}</span>
                  )}
                </div>
                <span className={`mt-1.5 text-[9px] font-bold transition-all ${
                  isCurrent ? "text-rose-700" : isPassed ? "text-rose-600" : "text-slate-400 group-hover:text-slate-600"
                }`}>
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allowed transitions flow trigger bar */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5 shrink-0">
          <Activity className="h-3.5 w-3.5 text-rose-500" />
          <span>可用动作机状态流转:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {getNextAllowedStates(currentStatus).map((trans) => (
             <button
              key={trans.status}
              type="button"
              onClick={() => onUpdateStatus(trans.status)}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-md border transition-all cursor-pointer shadow-sm active:scale-95 ${trans.color}`}
            >
              流转至 {trans.label} →
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DefectWorkflow;
