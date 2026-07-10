import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { Issue, TestCase, IssueType } from "../types";
import { formatCaseId, formatDefectId } from "../lib/idUtils";

interface DeleteRequirementDialogProps {
  reqToDelete: Issue;
  issues: Issue[];
  testCases: TestCase[];
  projectId: string;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

export default function DeleteRequirementDialog({
  reqToDelete,
  issues,
  testCases,
  projectId,
  onClose,
  onConfirmDelete,
}: DeleteRequirementDialogProps) {
  const linkedCases = testCases.filter(
    (tc) => tc.linkedRequirementId === reqToDelete.id || reqToDelete.linkToTestCases?.includes(tc.id)
  );

  const linkedDefects = issues.filter(
    (i) => i.projectId === projectId && i.type === IssueType.DEFECT && i.linkToRequirements?.includes(reqToDelete.id)
  );

  const isBlocked = linkedCases.length > 0 || linkedDefects.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Alert Indicator Header bar */}
        <div className={`h-1.5 w-full ${isBlocked ? "bg-rose-500" : "bg-indigo-500"}`} />

        <div className="p-4.5 border-b border-rose-100 bg-rose-50/35 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isBlocked ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-indigo-50 text-indigo-650"}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800">
                {isBlocked ? "需求删除安全拦截" : "彻底删除需求确认"}
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">
                {isBlocked ? "⚠️ 必须先解绑现有关联数据" : "⚠️ 此物理删除动作不可恢复"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto max-h-[60vh] text-left">
          {isBlocked ? (
            <div className="space-y-3.5">
              <div className="p-3 bg-rose-50/60 border border-rose-100/50 rounded-2xl text-[10.5px] text-rose-700 font-semibold leading-relaxed">
                当前业务需求与系统验证资产深度绑定，禁止删除！为了防止验证闭环回溯拦截链路断裂、数据丢失，必须在清除所有绑定后重试。
              </div>

              <div className="space-y-2.5">
                {linkedCases.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        关联测试用例
                      </span>
                      <span className="bg-indigo-50 text-indigo-650 font-mono text-[9px] font-extrabold rounded-full px-1.5 py-0.5">{linkedCases.length} 个</span>
                    </div>
                    <div className="max-h-20 overflow-y-auto space-y-1 pr-1 text-[9px] text-slate-600">
                      {linkedCases.map((tc) => (
                        <div key={tc.id} className="bg-white p-1 rounded-lg border border-slate-100 truncate">
                          <span className="font-bold text-slate-500 mr-1 opacity-80">{formatCaseId(tc.id)}</span> {tc.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {linkedDefects.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        关联缺陷问题
                      </span>
                      <span className="bg-rose-50 text-rose-650 font-mono text-[9px] font-extrabold rounded-full px-1.5 py-0.5">{linkedDefects.length} 个</span>
                    </div>
                    <div className="max-h-20 overflow-y-auto space-y-1 pr-1 text-[9px] text-slate-600">
                      {linkedDefects.map((df) => (
                        <div key={df.id} className="bg-white p-1 rounded-lg border border-slate-100 truncate">
                          <span className="font-bold text-rose-500 mr-1 opacity-85">{formatDefectId(df.id)}</span> {df.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[9.5px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-400 font-semibold leading-relaxed">
                💡 解锁说明：可前往用例模块或缺陷追踪面板，解除对应资产的需求绑定标识。
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">
                您确认要物理移除业务需求「<span className="font-extrabold text-slate-900">{reqToDelete.title}</span>」吗？
              </p>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[9.5px] text-amber-700 leading-relaxed font-bold">
                  当前需求无任何关联的测试用例与缺陷工单绑定，能够正常执行删除。该操作将彻底物理抹除该需求内容与更新流转轨迹，执行后不可恢复。
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50/60 border-t border-slate-100/80 flex justify-end gap-2 text-[11px]">
          {isBlocked ? (
            <button
              onClick={onClose}
              className="px-4 py-2 font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-100 transition-all active:scale-[0.98] cursor-pointer"
            >
              知道了
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => onConfirmDelete(reqToDelete.id)}
                className="px-4 py-2 font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-100 transition-all active:scale-[0.98] cursor-pointer"
              >
                确认彻底删除
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
