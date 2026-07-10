/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Activity, ShieldAlert, CheckCircle, Ban, HelpCircle } from "lucide-react";
import { TestCaseStatus } from "../types";

interface TestCaseWorkflowProps {
  currentStatus: TestCaseStatus;
  onUpdateStatus: (status: TestCaseStatus) => void;
}

export default function TestCaseWorkflow({
  currentStatus,
  onUpdateStatus,
}: TestCaseWorkflowProps) {
  // Sequence representation for timeline progress
  const sequence = [
    TestCaseStatus.UNTESTED,
    currentStatus === TestCaseStatus.PASS
      ? TestCaseStatus.PASS
      : currentStatus === TestCaseStatus.FAIL
      ? TestCaseStatus.FAIL
      : currentStatus === TestCaseStatus.BLOCKED
      ? TestCaseStatus.BLOCKED
      : TestCaseStatus.PASS, // Fallback visual node
  ];

  const activeIdx = currentStatus === TestCaseStatus.UNTESTED ? 0 : 1;

  // Get transition actions based on the current state
  const getAllowedTransitions = (status: TestCaseStatus) => {
    switch (status) {
      case TestCaseStatus.UNTESTED:
        return [
          {
            status: TestCaseStatus.PASS,
            label: "测试通过",
            color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300",
            icon: CheckCircle,
          },
          {
            status: TestCaseStatus.FAIL,
            label: "测试失败",
            color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300",
            icon: ShieldAlert,
          },
          {
            status: TestCaseStatus.BLOCKED,
            label: "测试阻塞",
            color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300",
            icon: Ban,
          },
        ];
      case TestCaseStatus.PASS:
      case TestCaseStatus.FAIL:
      case TestCaseStatus.BLOCKED:
      default:
        return [
          {
            status: TestCaseStatus.UNTESTED,
            label: "重置为未测试",
            color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300",
            icon: HelpCircle,
          },
          ...(status !== TestCaseStatus.PASS
            ? [
                {
                  status: TestCaseStatus.PASS,
                  label: "测试通过",
                  color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300",
                  icon: CheckCircle,
                },
              ]
            : []),
          ...(status !== TestCaseStatus.FAIL
            ? [
                {
                  status: TestCaseStatus.FAIL,
                  label: "测试失败",
                  color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300",
                  icon: ShieldAlert,
                },
              ]
            : []),
          ...(status !== TestCaseStatus.BLOCKED
            ? [
                {
                  status: TestCaseStatus.BLOCKED,
                  label: "测试阻塞",
                  color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300",
                  icon: Ban,
                },
              ]
            : []),
        ];
    }
  };

  const transitions = getAllowedTransitions(currentStatus);

  // Timeline nodes
  const timelineNodes = [
    { key: TestCaseStatus.UNTESTED, label: "准备就绪 / 未测试" },
    {
      key: "outcome",
      label:
        currentStatus === TestCaseStatus.PASS
          ? "测试通过 ✓"
          : currentStatus === TestCaseStatus.FAIL
          ? "验证失败 ✗"
          : currentStatus === TestCaseStatus.BLOCKED
          ? "执行受阻 ⚠"
          : "等待执行中",
    },
  ];

  return (
    <div
      className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-4 text-left select-none animate-fade-in"
      id="testcase-execution-status-workflow"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-550">
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              currentStatus === TestCaseStatus.UNTESTED
                ? "bg-slate-400 animate-pulse"
                : currentStatus === TestCaseStatus.PASS
                ? "bg-emerald-500 animate-pulse"
                : currentStatus === TestCaseStatus.FAIL
                ? "bg-rose-500 animate-ping"
                : "bg-amber-500 animate-pulse"
            }`}
          />
          <span>执行流转生命周期阶段 (EXECUTION FLOW)</span>
        </span>
        <span
          className={`px-2.5 py-0.5 rounded font-black font-sans text-[10px] border ${
            currentStatus === TestCaseStatus.PASS
              ? "bg-emerald-50 border-emerald-150 text-emerald-700"
              : currentStatus === TestCaseStatus.FAIL
              ? "bg-rose-50 border-rose-150 text-rose-700"
              : currentStatus === TestCaseStatus.BLOCKED
              ? "bg-amber-50 border-amber-150 text-amber-700"
              : "bg-slate-100 border-slate-200 text-slate-600"
          }`}
        >
          当前状态: {currentStatus}
        </span>
      </div>

      {/* Visual Progress Timeline */}
      <div className="relative pt-2 pb-1 px-4" id="testcase-workflow-timeline">
        {/* Progress track line */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-slate-200 -translate-y-1/2 rounded" />
        <div
          className={`absolute top-5 left-8 h-1 -translate-y-1/2 rounded transition-all duration-300 ease-out ${
            currentStatus === TestCaseStatus.PASS
              ? "bg-emerald-500"
              : currentStatus === TestCaseStatus.FAIL
              ? "bg-rose-500"
              : currentStatus === TestCaseStatus.BLOCKED
              ? "bg-amber-500"
              : "bg-indigo-500"
          }`}
          style={{ width: activeIdx === 1 ? "calc(100% - 4rem)" : "0%" }}
        />

        <div className="relative flex justify-between">
          {timelineNodes.map((node, idx) => {
            const isCurrent =
              (idx === 0 && currentStatus === TestCaseStatus.UNTESTED) ||
              (idx === 1 && currentStatus !== TestCaseStatus.UNTESTED);
            const isPassed = idx <= activeIdx;

            let circleStyling = "bg-white border-slate-200 text-slate-300";
            if (isCurrent) {
              circleStyling =
                currentStatus === TestCaseStatus.PASS
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : currentStatus === TestCaseStatus.FAIL
                  ? "bg-rose-500 border-rose-500 text-white"
                  : currentStatus === TestCaseStatus.BLOCKED
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-indigo-500 border-indigo-500 text-white";
            } else if (isPassed) {
              circleStyling = "bg-indigo-50 border-indigo-500 text-indigo-600";
            }

            return (
              <div
                key={node.key}
                className="group flex flex-col items-center z-10"
                id={`workflow-timeline-node-${node.key}`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${circleStyling}`}
                >
                  {isPassed && !isCurrent ? (
                    <span className="text-[10px] font-bold">✓</span>
                  ) : (
                    <span className="text-[9px] font-black">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[9.5px] font-black transition-all ${
                    isCurrent
                      ? currentStatus === TestCaseStatus.PASS
                        ? "text-emerald-700"
                        : currentStatus === TestCaseStatus.FAIL
                        ? "text-rose-700"
                        : currentStatus === TestCaseStatus.BLOCKED
                        ? "text-amber-700"
                        : "text-indigo-700"
                      : isPassed
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allowed transitions flow trigger bar */}
      <div
        className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        id="testcase-workflow-action-bar"
      >
        <div className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Activity className="h-3.5 w-3.5 text-indigo-550 text-indigo-600" />
          <span>流转此测试用例执行状态:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {transitions.map((trans) => {
            const Icon = trans.icon;
            return (
              <button
                key={trans.status}
                type="button"
                id={`btn-workflow-to-${trans.status}`}
                onClick={() => onUpdateStatus(trans.status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer shadow-3xs active:scale-95 ${trans.color}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>流转至 {trans.label} →</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
