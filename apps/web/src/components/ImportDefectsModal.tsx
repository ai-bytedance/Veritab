/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, FileJson, Copy, Check, Info, AlertCircle, HelpCircle } from "lucide-react";
import { Issue, IssueType, DefectSeverity, DefectStatus, User } from "../types";
import { generateDefectId } from "../lib/idUtils";

interface ImportDefectsModalProps {
  projectId: string;
  activeUsers: User[];
  currentUser?: User;
  onClose: () => void;
  onImport: (importedIssues: Issue[]) => void;
}

interface ParsedDefect {
  title: string;
  content: string;
  severity: DefectSeverity;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  precondition?: string;
  errors?: string[];
}

const ImportDefectsModal: React.FC<ImportDefectsModalProps> = ({
  projectId,
  activeUsers,
  currentUser,
  onClose,
  onImport,
}) => {
  const [activeTemplateTab, setActiveTemplateTab] = useState<"csv" | "json">("csv");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedDefect[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>(activeUsers[0]?.id || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCsv = `标题,模块描述,严重程度,复现步骤,预期结果,实际结果
[登录] 弱网环境加载超时,由于弱网加载超时按钮无置灰可重复触发请求,严重,1. 限制网络速度为弱网模式\\n2. 快速双击登录按钮,登录过程中应展示加载状态并禁用二次点击,触发多次异常请求抛出504
[详情页] 商品说明图文排版变形,部分特型高分辨率图文在窄屏下出现挤压、比例失调,一般,1. 打开商品详情页\\n2. 切换设备屏幕比例,图文组件响应式适配良好无重合遮挡,图片超出边界并与文本右对齐重叠`;

  const sampleJson = `[
  {
    "title": "[设置] 修改密码报错500",
    "content": "使用超过24位特殊字符设置密保时，后台密码哈希服务报错",
    "severity": "致命",
    "steps": "1. 进入设置-安全中心\\n2. 输入超长密保",
    "expectedResult": "前端校验拦截并友好提示",
    "actualResult": "后端拒绝服务报错"
  }
]`;

  const handleCopyTemplate = () => {
    const textToCopy = activeTemplateTab === "csv" ? sampleCsv : sampleJson;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parsing CSV string Helper
  const parseCsvText = (text: string): ParsedDefect[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length <= 1) return [];

    // Parse header
    const headers = lines[0].split(",").map(h => h.trim());
    const results: ParsedDefect[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV cell spliter supporting basic quote containment
      const cells: string[] = [];
      let currentCell = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell);
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell);

      const title = cells[0]?.replace(/^"|"$/g, "").trim() || "";
      const content = cells[1]?.replace(/^"|"$/g, "").trim() || "";
      const rawSeverity = cells[2]?.replace(/^"|"$/g, "").trim() || "一般";
      const steps = cells[3]?.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim() || "";
      const expectedResult = cells[4]?.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim() || "";
      const actualResult = cells[5]?.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim() || "";

      if (!title) continue;

      // Validate severity
      let finalSeverity = DefectSeverity.NORMAL;
      const errors: string[] = [];
      if (rawSeverity.includes("致命")) finalSeverity = DefectSeverity.FATAL;
      else if (rawSeverity.includes("严重")) finalSeverity = DefectSeverity.SERIOUS;
      else if (rawSeverity.includes("一般") || rawSeverity.includes("普通")) finalSeverity = DefectSeverity.NORMAL;
      else if (rawSeverity.includes("提示") || rawSeverity.includes("低")) finalSeverity = DefectSeverity.PROMPT;
      else {
        errors.push(`未知的严重程度 "${rawSeverity}"，自动修正为 "一般"`);
      }

      results.push({
        title,
        content: content || "批量导入产生的缺陷描述",
        severity: finalSeverity,
        steps,
        expectedResult,
        actualResult,
        errors,
      });
    }

    return results;
  };

  // Parsing JSON string Helper
  const parseJsonText = (text: string): ParsedDefect[] => {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const results: ParsedDefect[] = [];

      for (const item of list) {
        const title = item.title?.trim() || "";
        const content = item.content?.trim() || "";
        const rawSeverity = item.severity?.trim() || "一般";
        const steps = item.steps || "";
        const expectedResult = item.expectedResult || "";
        const actualResult = item.actualResult || "";
        const precondition = item.precondition || "";

        if (!title) continue;

        let finalSeverity = DefectSeverity.NORMAL;
        const errors: string[] = [];
        if (rawSeverity.includes("致命")) finalSeverity = DefectSeverity.FATAL;
        else if (rawSeverity.includes("严重")) finalSeverity = DefectSeverity.SERIOUS;
        else if (rawSeverity.includes("一般") || rawSeverity.includes("普通")) finalSeverity = DefectSeverity.NORMAL;
        else if (rawSeverity.includes("提示") || rawSeverity.includes("低")) finalSeverity = DefectSeverity.PROMPT;
        else {
          errors.push(`未知等级 "${rawSeverity}"，自动修正为 "一般"`);
        }

        results.push({
          title,
          content: content || "批量导入产生的缺陷描述",
          severity: finalSeverity,
          steps,
          expectedResult,
          actualResult,
          precondition,
          errors,
        });
      }
      return results;
    } catch (e: any) {
      alert(`JSON 格式解析错误: ${e.message}`);
      return [];
    }
  };

  const handleApplyRawText = () => {
    if (!rawText.trim()) {
      alert("请输入需要解析的文本内容");
      return;
    }
    const data = activeTemplateTab === "csv" ? parseCsvText(rawText) : parseJsonText(rawText);
    if (data.length === 0) {
      alert("解析失败，请确保填写了符合模板规范的数据且必填包含“标题”哦");
      return;
    }
    setParsedData(data);
  };

  // File Input and Drag Controls
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      if (fileName.endsWith(".json")) {
        setActiveTemplateTab("json");
        const data = parseJsonText(text);
        if (data.length > 0) setParsedData(data);
      } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
        setActiveTemplateTab("csv");
        const data = parseCsvText(text);
        if (data.length > 0) setParsedData(data);
      } else {
        alert("不支持的文件格式，请上传 CSV 或 JSON 文件。");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedData.length === 0) return;

    const importedIssues: Issue[] = parsedData.map((item, index) => {
      const markdownContent = `### 缺陷描述
${item.content}

### 前置条件
${item.precondition || "无"}

### 缺陷复现步骤
${item.steps || "无复现步骤记录"}

### 期望行为
${item.expectedResult || "无"}

### 实际行为反馈
${item.actualResult || "无"}`;

      return {
        id: generateDefectId(),
        projectId,
        type: IssueType.DEFECT,
        title: item.title,
        content: markdownContent,
        severity: item.severity,
        defectStatus: DefectStatus.NEW,
        assigneeId: assigneeId || undefined,
        creatorId: currentUser?.id || activeUsers[0]?.id || "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        historyLogs: [
          {
            id: `log-${Date.now()}-${index}`,
            userId: currentUser?.id || "system",
            userName: currentUser?.nickname || "管理员",
            action: "批量导入缺陷工单成功",
            createdAt: new Date().toISOString(),
          }
        ],
        precondition: item.precondition,
        steps: item.steps,
        expectedResult: item.expectedResult,
        actualResult: item.actualResult,
      };
    });

    onImport(importedIssues);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-left" id="import-defects-modal-container">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center">
              <Upload className="h-4.5 w-4.5 text-rose-650" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">批量导入质量缺陷工单</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">支持通过规范化的 CSV、TXT、JSON 数据快速录入生产故障或缺陷</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            {/* Left side: Guide & Templates */}
            <div className="md:col-span-12 lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/20 p-4 space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Info className="h-3.5 w-3.5 text-rose-500" />
                  <span>必要字段与格式模板</span>
                </h4>
                <div className="text-[10px] leading-relaxed text-slate-500 space-y-2">
                  <p>
                    为了确保缺陷能被系统正确识别及流转，上传的行需至少包含 <span className="font-bold text-rose-600">标题</span>。其他可选列对应填入格式规范可大幅度提高缺陷精准度。
                  </p>
                  <table className="w-full text-left border-collapse mt-2">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-1 font-bold">字段名</th>
                        <th className="py-1 font-bold">必填项</th>
                        <th className="py-1 font-bold">可选值</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1 font-semibold text-slate-600">标题</td>
                        <td className="py-1 text-rose-600 font-bold">必填</td>
                        <td className="py-1">任意内容描述格式</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-600">严重程度</td>
                        <td className="py-1 text-slate-400">默认普通</td>
                        <td className="py-1">致命 / 严重 / 一般 / 提示</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-600">复现步骤等</td>
                        <td className="py-1 text-slate-400">选填</td>
                        <td className="py-1">Markdown/文字</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Template Tab switch */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-3xs">
                <div className="flex items-center justify-between px-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex border-b-2 border-transparent">
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("csv")}
                      className={`px-3 py-2 text-[10.5px] font-extrabold border-b-2 transition-all cursor-pointer ${
                        activeTemplateTab === "csv"
                          ? "border-rose-600 text-rose-700"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>CSV 规范格式</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("json")}
                      className={`px-3 py-2 text-[10.5px] font-extrabold border-b-2 transition-all cursor-pointer ${
                        activeTemplateTab === "json"
                          ? "border-rose-600 text-rose-700"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <FileJson className="h-3.5 w-3.5" />
                        <span>JSON 数据对象</span>
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="p-1 px-2 text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-bold border border-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "已复制" : "复制代码"}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border-none">
                  <pre className="text-[9.5px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-44 text-left leading-normal">
                    {activeTemplateTab === "csv" ? sampleCsv : sampleJson}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right side: Input & Selection */}
            <div className="md:col-span-12 lg:col-span-7 space-y-4">
              {/* Assignee setting */}
              <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                  全局指定缺陷默认指派处理人
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2 outline-none focus:border-rose-400 cursor-pointer bg-white"
                >
                  <option value="">-- 暂不指定（留空指派） --</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nickname} ({u.role || "研发成员"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-rose-600 bg-rose-50/15"
                    : "border-slate-200 hover:border-rose-400 bg-slate-50/20 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  id="import-defects-file-picker"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                />
                <Upload className="h-6.5 w-6.5 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">拖拽或点击上传 CSV/JSON 文件进行解析</p>
                <p className="text-[9.5px] text-slate-400 font-mono mt-1">支持文本后缀有 .csv, .json, .txt (单文件 &lt; 5MB)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                    或者在此直接输入/粘贴文本数据：
                  </label>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => { setRawText(""); setParsedData([]); }}
                      className="text-[9px] font-bold text-rose-605 text-rose-600 hover:underline cursor-pointer"
                    >
                      清理输入 ✕
                    </button>
                  )}
                </div>
                <textarea
                  className="w-full h-28 rounded-xl border border-slate-200 p-3 text-xs font-mono outline-none focus:border-rose-450 focus:ring-1 focus:ring-rose-200 transition-all text-slate-800"
                  placeholder={`将 ${activeTemplateTab.toUpperCase()} 数据直接粘贴在这里，并点击下方 “开始解析数据”按钮...`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyRawText}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-xl py-2 cursor-pointer transition-all shadow-3xs"
                >
                  【解析并预览导入内容数据】
                </button>
              </div>
            </div>
          </div>

          {/* Parsed Preview lists */}
          {parsedData.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>解析成功预览：共有 {parsedData.length} 件即将被添加的质量缺陷</span>
                </span>
                <span className="text-[9.5px] text-slate-400 italic">请检查是否带有特定修正</span>
              </div>
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-2.5">缺陷标题描述</th>
                      <th className="p-2.5">推荐严重级</th>
                      <th className="p-2.5">简要描述及步骤项</th>
                      <th className="p-2.5">校验及处理状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedData.map((defect, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold truncate max-w-[200px]">{defect.title}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.2 rounded-md font-extrabold text-[9px] ${
                            defect.severity === DefectSeverity.FATAL ? "bg-rose-100 text-rose-700" :
                            defect.severity === DefectSeverity.SERIOUS ? "bg-orange-100 text-orange-700" :
                            defect.severity === DefectSeverity.NORMAL ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {defect.severity}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400 truncate max-w-[240px]">
                          {defect.content} {defect.steps ? `| 步骤: ${defect.steps}` : ""}
                        </td>
                        <td className="p-2.5">
                          {defect.errors && defect.errors.length > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>{defect.errors[0]}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> 校验就绪
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl hover:bg-white text-xs font-bold transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedData.length === 0}
            className="px-5 py-2 rounded-xl text-white text-xs font-bold bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-100 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>开始导入数据并追踪 ({parsedData.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDefectsModal;
