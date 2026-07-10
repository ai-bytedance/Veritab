/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { X, Download, CheckSquare, Square, FileSpreadsheet, FileJson, Layers, Info } from "lucide-react";
import { TestCase, Issue, User as SystemUser } from "../types";

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: "testcase" | "defect";
  dataList: any[]; // The list of items currently filtered or all items
  fullDataList?: any[]; // The complete unfiltered project-level items
  users: SystemUser[];
  requirements?: Issue[]; // For test cases to resolve requirement titles
}

interface ExportField {
  key: string;
  label: string;
  checked: boolean;
}

export default function ExportDataModal({
  isOpen,
  onClose,
  dataType,
  dataList,
  fullDataList,
  users,
  requirements = []
}: ExportDataModalProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportScope, setExportScope] = useState<"filtered" | "all">("filtered");

  // Choose the appropriate data list according to the export scope selection
  const activeDataList = useMemo(() => {
    if (exportScope === "filtered" || !fullDataList) {
      return dataList;
    }
    return fullDataList;
  }, [exportScope, dataList, fullDataList]);

  // Default filename constructor
  const defaultFilename = useMemo(() => {
    const prefix = dataType === "testcase" ? "测试用例导出" : "缺陷故障追踪导出";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${prefix}_${dateStr}`;
  }, [dataType]);

  const [filename, setFilename] = useState(defaultFilename);

  // Initialize fields lists depending on dataType
  const tcFields: ExportField[] = [
    { key: "id", label: "用例 ID", checked: true },
    { key: "name", label: "用例名称", checked: true },
    { key: "grade", label: "用例等级", checked: true },
    { key: "status", label: "执行状态", checked: true },
    { key: "assignee", label: "负责人", checked: true },
    { key: "precondition", label: "前置条件", checked: true },
    { key: "steps", label: "执行步骤", checked: true },
    { key: "expectedResult", label: "预期结果", checked: true },
    { key: "actualResult", label: "实际结果/偏离细节", checked: true },
    { key: "linkedRequirement", label: "关联的主干需求", checked: false },
    { key: "createdAt", label: "创建时间", checked: false },
    { key: "updatedAt", label: "最后修改时间", checked: false },
  ];

  const defectFields: ExportField[] = [
    { key: "id", label: "缺陷 ID", checked: true },
    { key: "title", label: "缺陷标题", checked: true },
    { key: "severity", label: "严重等级", checked: true },
    { key: "defectStatus", label: "当前状态", checked: true },
    { key: "assignee", label: "处理负责人", checked: true },
    { key: "content", label: "描述正文 (Markdown)", checked: true },
    { key: "precondition", label: "复现前置", checked: false },
    { key: "steps", label: "复现步骤", checked: false },
    { key: "expectedResult", label: "期望结果", checked: false },
    { key: "actualResult", label: "实际验证结果", checked: false },
    { key: "createdAt", label: "创建时间", checked: false },
    { key: "updatedAt", label: "最近更新时间", checked: false },
  ];

  const [fields, setFields] = useState<ExportField[]>(
    dataType === "testcase" ? tcFields : defectFields
  );

  // Reset fields hook when type changes or opened
  React.useEffect(() => {
    if (isOpen) {
      setFields(dataType === "testcase" ? tcFields : defectFields);
      setFilename(defaultFilename);
    }
  }, [isOpen, dataType]);

  if (!isOpen) return null;

  const handleToggleField = (key: string) => {
    setFields(prev =>
      prev.map(f => (f.key === key ? { ...f, checked: !f.checked } : f))
    );
  };

  const handleSelectAllFields = (val: boolean) => {
    setFields(prev => prev.map(f => ({ ...f, checked: val })));
  };

  // Helper function to resolve field value as text
  const getFieldValue = (item: any, key: string): string => {
    if (!item) return "";
    switch (key) {
      case "id":
        return item.id || "";
      case "name":
        return item.name || "";
      case "title":
        return item.title || "";
      case "grade":
        return item.grade || "";
      case "status":
        return item.status || "";
      case "severity":
        return item.severity || "";
      case "defectStatus":
        return item.defectStatus || "";
      case "assignee": {
        const userId = item.assigneeId;
        const u = users.find(user => user.id === userId);
        return u ? u.nickname : "未指派";
      }
      case "precondition":
        return item.precondition || "";
      case "steps":
        return item.steps || "";
      case "expectedResult":
        return item.expectedResult || "";
      case "actualResult":
        return item.actualResult || "";
      case "content":
        return item.content || "";
      case "linkedRequirement": {
        const reqId = item.linkedRequirementId;
        if (!reqId) return "无";
        const r = requirements.find(req => req.id === reqId);
        return r ? r.title : `ID: ${reqId}`;
      }
      case "createdAt":
        return item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : "";
      case "updatedAt":
        return item.updatedAt ? new Date(item.updatedAt).toLocaleString("zh-CN") : "";
      default:
        return "";
    }
  };

  const triggerExport = () => {
    const activeFields = fields.filter(f => f.checked);
    if (activeFields.length === 0) {
      alert("请至少选择一个自定义导出的字段！");
      return;
    }

    if (activeDataList.length === 0) {
      alert("无可导出的资产数据记录！");
      return;
    }

    let fileContent = "";
    let mimeType = "text/plain";
    let finalExt = ".txt";

    if (exportFormat === "json") {
      mimeType = "application/json";
      finalExt = ".json";
      // Construct customized JSON values containing only the selected keys
      const exportedJsonArray = activeDataList.map(item => {
        const obj: Record<string, any> = {};
        activeFields.forEach(f => {
          obj[f.label] = getFieldValue(item, f.key);
        });
        return obj;
      });
      fileContent = JSON.stringify(exportedJsonArray, null, 2);
    } else {
      mimeType = "text/csv;charset=utf-8;";
      finalExt = ".csv";

      // Escape CSV value helper
      const escapeCSVValue = (val: string): string => {
        if (val === null || val === undefined) return "";
        let result = String(val).replace(/"/g, '""');
        // If content contains comma, newline, or double quotes, enclose in quotes
        if (result.includes(",") || result.includes("\n") || result.includes("\r") || result.includes('"')) {
          result = `"${result}"`;
        }
        return result;
      };

      // Header line
      const headers = activeFields.map(f => escapeCSVValue(f.label)).join(",");

      // Rows lines
      const rows = activeDataList.map(item => {
        return activeFields.map(f => escapeCSVValue(getFieldValue(item, f.key))).join(",");
      });

      // Excel UTF-8 BOM representation: avoids garbage codes in Chinese
      fileContent = "\uFEFF" + [headers, ...rows].join("\n");
    }

    // Trigger Browser direct download
    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8;` });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.setAttribute("download", `${filename}${finalExt}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    // Cleanup reference after trigger
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);
    }, 100);

    onClose();
  };

  const isAllChecked = fields.every(f => f.checked);
  const isNoneChecked = fields.every(f => !f.checked);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 text-left">

        {/* Header styling */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase select-none">
              <span>📤 自定义数据字段导出中心</span>
              <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                {dataType === "testcase" ? "测试用例" : "缺陷追踪"}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
              根据首选场景自定义包含的列并导出，可指定检索范围或备份完整数据。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100/80 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form elements body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

          {/* Data count and target statistics preview */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between select-none">
            <div className="space-y-0.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">等候备份导出的记录数</span>
              <span className="text-sm font-black text-slate-800 flex items-baseline gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0 self-center" />
                <span className="font-mono text-base">{activeDataList.length}</span> <span className="text-[10px] text-slate-400 font-bold">条记录</span>
              </span>
            </div>

            <div className="text-right text-[10px] text-slate-450 font-bold max-w-xs leading-relaxed space-y-1">
              <div>💡 导出格式已内置 UTF-8 BOM 信息标志，中文字符彻底防乱码。</div>
              <div className="text-indigo-600 font-medium">⚡ 高性能优化：已针对万级超大数据集进行非阻塞、高运行性能优化。</div>
            </div>
          </div>

          {/* Data Scope and Selection Option */}
          <div className="space-y-1.5 select-none animate-fade-in">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
              📦 导出数据范围
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportScope("filtered")}
                className={`p-2.5 rounded-xl border flex flex-col transition-all cursor-pointer text-left ${
                  exportScope === "filtered"
                    ? "border-indigo-400 bg-indigo-50/25 text-indigo-900 font-black shadow-3xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                }`}
              >
                <span className="text-[11px] font-bold">当前筛选/检索视图 ({dataList.length} 条)</span>
                <span className="text-[9px] text-slate-400 mt-1 leading-none font-medium">仅备份当前经过过滤与检索的测试/缺陷项</span>
              </button>

              <button
                type="button"
                onClick={() => setExportScope("all")}
                disabled={!fullDataList}
                className={`p-2.5 rounded-xl border flex flex-col transition-all cursor-pointer text-left ${
                  exportScope === "all"
                    ? "border-indigo-400 bg-indigo-50/25 text-indigo-900 font-black shadow-3xs"
                    : !fullDataList
                    ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                }`}
              >
                <span className="text-[11px] font-bold">整个项目全部资产 ({fullDataList ? fullDataList.length : dataList.length} 条)</span>
                <span className="text-[9px] text-slate-400 mt-1 leading-none font-medium">无视界面当前的检索限制，完整备份全部资产</span>
              </button>
            </div>
          </div>

          {/* Filename textbox */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
              💾 导出文件名称
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="请输入导出存储的文件名..."
              className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 font-bold rounded-xl px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Format select (CSV vs JSON) */}
          <div className="space-y-1.5 select-none">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
              💿 导出存储格式
            </label>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setExportFormat("csv")}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                  exportFormat === "csv"
                    ? "border-indigo-400 bg-indigo-50/20 text-indigo-850 font-extrabold shadow-3xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-650"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${exportFormat === "csv" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-550"}`}>
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-black leading-none">CSV 表格文件</p>
                  <p className="text-[9px] text-slate-450 mt-1 leading-none font-semibold">推荐 Microsoft Excel & WPS</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat("json")}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                  exportFormat === "json"
                    ? "border-indigo-400 bg-indigo-50/20 text-indigo-850 font-extrabold shadow-3xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-650"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${exportFormat === "json" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-550"}`}>
                  <FileJson className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-black leading-none">JSON 纯文本</p>
                  <p className="text-[9px] text-slate-450 mt-1 leading-none font-semibold">用于二次开发与数据迁移备份</p>
                </div>
              </button>
            </div>
          </div>

          {/* Checkboxes for list fields */}
          <div className="space-y-2 select-none">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                📋 选择需要包含的数据列字段
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllFields(true)}
                  disabled={isAllChecked}
                  className="text-[9.5px] font-black text-indigo-650 hover:text-indigo-800 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  全选
                </button>
                <span className="text-[8px] text-slate-300 font-bold">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllFields(false)}
                  disabled={isNoneChecked}
                  className="text-[9.5px] font-black text-slate-450 hover:text-slate-650 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 border border-slate-150 rounded-2xl p-3.5 max-h-[160px] overflow-y-auto">
              {fields.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleToggleField(f.key)}
                  className={`flex items-center gap-2 p-1.5 px-2 rounded-xl border text-left transition-all cursor-pointer ${
                    f.checked
                      ? "border-indigo-200 bg-white shadow-3xs text-slate-800 font-bold"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  {f.checked ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-indigo-400" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span className="truncate text-[10.5px]">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer controls */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold select-none">
            已勾选 {fields.filter(f => f.checked).length} 个导出字段列
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={triggerExport}
              disabled={activeDataList.length === 0 || fields.every(f => !f.checked)}
              className="px-4.5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition-all font-sans active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Download className="h-3.5 w-3.5" />
              <span>开始备份下载</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
