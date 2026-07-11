/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, FileJson, Copy, Check, Info, AlertCircle } from "lucide-react";
import { TestCase, TestCaseGrade, TestCaseStatus, User, Folder } from "../types";
import { generateCaseId } from "../lib/idUtils";

interface ImportTestCasesModalProps {
  projectId: string;
  activeUsers: User[];
  folders: Folder[];
  currentFolderId?: string | null;
  currentUser?: User;
  onClose: () => void;
  onImport: (importedCases: TestCase[]) => Promise<void>;
}

interface ParsedTestCase {
  name: string;
  grade: TestCaseGrade;
  precondition?: string;
  steps: string;
  expectedResult: string;
  module?: string;
  errors?: string[];
}

const ImportTestCasesModal: React.FC<ImportTestCasesModalProps> = ({
  projectId,
  activeUsers,
  folders,
  currentFolderId,
  currentUser,
  onClose,
  onImport,
}) => {
  const [activeTemplateTab, setActiveTemplateTab] = useState<"csv" | "json">("csv");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedTestCase[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>(activeUsers[0]?.id || "");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => {
    if (!currentFolderId) return "";
    const isRealFolder = folders.some(f => f.id === currentFolderId);
    return isRealFolder ? currentFolderId : "";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCsv = `用例名称,级别,前置条件,操作步骤,预期结果,核心模块
用户使用正确的账密登录平台,最高-P0,用户已注册并激活账号且处于正确的登录主页,"1. 输入有效的注册手机号\\n2. 输入正确密码并点击登录",系统验证跳转进入个人核心看板仪表盘中,用户登录
未输入密码时尝试登录拦截提示,高-P1,已进入登录主页,"1. 输入有效的注册手机号\\n2. 密码框留空后点击登录",登录按钮下方或悬浮提示“密码不能为空”且拒绝请求,用户登录`;

  const sampleJson = `[
  {
    "name": "用户自定义修改头像功能验证",
    "grade": "中-P2",
    "precondition": "已在个人中心设置页面",
    "steps": "1. 点击头像框\\n2. 选取小于 2MB 的 PNG 并在裁剪后点击保存",
    "expectedResult": "顶部通知‘修改资产头像成功’且画面元素进行即时重排更新",
    "module": "账号设置"
  }
]`;

  const handleCopyTemplate = () => {
    const textToCopy = activeTemplateTab === "csv" ? sampleCsv : sampleJson;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parsing CSV string Helper
  const parseCsvText = (text: string): ParsedTestCase[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length <= 1) return [];

    const results: ParsedTestCase[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
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

      const name = cells[0]?.replace(/^"|"$/g, "").trim() || "";
      const rawGrade = cells[1]?.replace(/^"|"$/g, "").trim() || "中-P2";
      const precondition = cells[2]?.replace(/^"|"$/g, "").trim() || "";
      const steps = cells[3]?.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim() || "";
      const expectedResult = cells[4]?.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim() || "";
      const moduleStr = cells[5]?.replace(/^"|"$/g, "").trim() || "";

      if (!name) continue;

      let finalGrade = TestCaseGrade.P2;
      const errors: string[] = [];
      if (rawGrade.includes("最高") || rawGrade.includes("P0")) finalGrade = TestCaseGrade.P0;
      else if (rawGrade.includes("高") || rawGrade.includes("P1")) finalGrade = TestCaseGrade.P1;
      else if (rawGrade.includes("中") || rawGrade.includes("P2")) finalGrade = TestCaseGrade.P2;
      else if (rawGrade.includes("低") || rawGrade.includes("P3")) finalGrade = TestCaseGrade.P3;
      else {
        errors.push(`未知的优先级别 "${rawGrade}"，自动修正为 "中-P2"`);
      }

      results.push({
        name,
        grade: finalGrade,
        precondition,
        steps: steps || "无操作步骤记录",
        expectedResult: expectedResult || "成功执行无异常",
        module: moduleStr,
        errors,
      });
    }

    return results;
  };

  // Parsing JSON string Helper
  const parseJsonText = (text: string): ParsedTestCase[] => {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const results: ParsedTestCase[] = [];

      for (const item of list) {
        const name = item.name?.trim() || "";
        const rawGrade = item.grade?.trim() || "中-P2";
        const precondition = item.precondition || "";
        const steps = item.steps || "";
        const expectedResult = item.expectedResult || "";
        const moduleStr = item.module || "";

        if (!name) continue;

        let finalGrade = TestCaseGrade.P2;
        const errors: string[] = [];
        if (rawGrade.includes("最高") || rawGrade.includes("P0")) finalGrade = TestCaseGrade.P0;
        else if (rawGrade.includes("高") || rawGrade.includes("P1")) finalGrade = TestCaseGrade.P1;
        else if (rawGrade.includes("中") || rawGrade.includes("P2")) finalGrade = TestCaseGrade.P2;
        else if (rawGrade.includes("低") || rawGrade.includes("P3")) finalGrade = TestCaseGrade.P3;
        else {
          errors.push(`未知的优先级别 "${rawGrade}"，自动修正为 "中-P2"`);
        }

        results.push({
          name,
          grade: finalGrade,
          precondition,
          steps: steps || "无操作步骤记录",
          expectedResult: expectedResult || "成功执行无异常",
          module: moduleStr,
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
      alert("请输入需要解析的用例文本内容");
      return;
    }
    const data = activeTemplateTab === "csv" ? parseCsvText(rawText) : parseJsonText(rawText);
    if (data.length === 0) {
      alert("解析失败，请确保填写了符合格式的数据，其中“用例名称”为必填的要素字段。");
      return;
    }
    setParsedData(data);
  };

  // Drag-and-drop & manual upload
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

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;

    const importedCases: TestCase[] = parsedData.map((item, index) => {
      return {
        id: generateCaseId(),
        projectId,
        name: item.name,
        grade: item.grade,
        precondition: item.precondition || "无",
        steps: item.steps,
        expectedResult: item.expectedResult,
        status: TestCaseStatus.UNTESTED,
        assigneeId: assigneeId || undefined,
        module: item.module || undefined,
        folderId: selectedFolderId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        historyLogs: [
          {
            id: `log-${Date.now()}-${index}`,
            userId: currentUser?.id || "system",
            userName: currentUser?.nickname || "管理员",
            action: "批量导入测试用例成功",
            createdAt: new Date().toISOString(),
          }
        ]
      };
    });

    setIsImporting(true);
    setImportError(null);
    try {
      await onImport(importedCases);
      onClose();
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : "导入失败，请重试。");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-left">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" id="import-testcases-modal-container">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
              <Upload className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">批量导入测试验证用例</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">支持通过 CSV、JSON 等数据资源快速录入系统的标准化校验用例集</p>
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
          <div className="grid gap-6 md:grid-cols-12 overflow-visible">
            {/* Left Column: Guides and template */}
            <div className="md:col-span-12 lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/20 p-4 space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-500" />
                  <span>核心字段与转换约束</span>
                </h4>
                <div className="text-[10px] leading-relaxed text-slate-500 space-y-2">
                  <p>
                    单条数据包含 <span className="font-bold text-indigo-600">用例名称</span> 后即会进行初审创建。对应的操作列与期望标准建议全部填入。
                  </p>
                  <table className="w-full text-left border-collapse mt-2">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-1 font-bold">字段名</th>
                        <th className="py-1 font-bold">约束度</th>
                        <th className="py-1 font-bold">合适规范</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1 font-semibold text-slate-600">用例名称</td>
                        <td className="py-1 text-indigo-600 font-bold">必含项</td>
                        <td className="py-1">用户行为及正反向操作说明</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-600">用例级别</td>
                        <td className="py-1 text-slate-400">默认中</td>
                        <td className="py-1">最高-P0 / 高-P1 / 中-P2 / 低-P3</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-slate-600">前置/步骤/预期</td>
                        <td className="py-1 text-slate-400">极力推荐</td>
                        <td className="py-1">说明动作，换行使用“\n”转义</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Template Area */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-3xs">
                <div className="flex items-center justify-between px-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex border-b-2 border-transparent">
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("csv")}
                      className={`px-3 py-2 text-[10.5px] font-extrabold border-b-2 transition-all cursor-pointer ${
                        activeTemplateTab === "csv"
                          ? "border-indigo-600 text-indigo-700"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>CSV 标准用例模板</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTemplateTab("json")}
                      className={`px-3 py-2 text-[10.5px] font-extrabold border-b-2 transition-all cursor-pointer ${
                        activeTemplateTab === "json"
                          ? "border-indigo-600 text-indigo-700"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <FileJson className="h-3.5 w-3.5" />
                        <span>JSON 配置样例</span>
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

            {/* Right Column: Upload zone and settings */}
            <div className="md:col-span-12 lg:col-span-7 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                    导入对应测试模块分组/目录
                  </label>
                  <select
                    value={selectedFolderId || ""}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2 outline-none focus:border-indigo-400 cursor-pointer bg-white"
                  >
                    <option value="">-- 系统根层级/无特定分组 --</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                    指派测试默认第一责任执行人
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2 outline-none focus:border-indigo-400 cursor-pointer bg-white"
                  >
                    <option value="">-- 暂不指定 --</option>
                    {activeUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.nickname}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-indigo-600 bg-indigo-50/15"
                    : "border-slate-200 hover:border-indigo-400 bg-slate-50/20 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  id="import-testcases-file-picker"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                />
                <Upload className="h-6.5 w-6.5 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">拖放或点击上传用例文件（.csv、.json、.txt）</p>
                <p className="text-[9.5px] text-slate-400 font-mono mt-1">系统会自动按逗号或结构进行即时分析提取 (Max 5MB)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                    或者在此手工复制/黏贴格式化文本
                  </label>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => { setRawText(""); setParsedData([]); }}
                      className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      清理数据 ✕
                    </button>
                  )}
                </div>
                <textarea
                  className="w-full h-24 rounded-xl border border-slate-200 p-3 text-xs font-mono outline-none focus:border-indigo-405 focus:ring-1 focus:ring-indigo-200 transition-all text-slate-800"
                  placeholder={`将 ${activeTemplateTab.toUpperCase()} 数据直接粘贴在这里...`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyRawText}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-xl py-2 cursor-pointer transition-all shadow-3xs"
                >
                  【一键提取解析测试用例数据】
                </button>
              </div>
            </div>
          </div>

          {/* Table display */}
          {parsedData.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span>解析成功预览：导入用例流水记账（共 {parsedData.length} 件）</span>
                </span>
              </div>
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-2.5">用例名称/要素</th>
                      <th className="p-2.5">推荐执行级别</th>
                      <th className="p-2.5">前置条件及核心步骤</th>
                      <th className="p-2.5">状态校验</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-705">
                    {parsedData.map((tc, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold truncate max-w-[200px]">{tc.name}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                            tc.grade === TestCaseGrade.P0 ? "bg-red-50 text-red-700 border border-red-100" :
                            tc.grade === TestCaseGrade.P1 ? "bg-orange-50 text-orange-700 border border-orange-100" :
                            tc.grade === TestCaseGrade.P2 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                            "bg-slate-100 text-slate-650"
                          }`}>
                            {tc.grade}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400 truncate max-w-[240px]">
                          {tc.precondition ? `【${tc.precondition}】` : ""} {tc.steps} → {tc.expectedResult}
                        </td>
                        <td className="p-2.5">
                          {tc.errors && tc.errors.length > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>{tc.errors[0]}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> 审查完成
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {importError && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{importError}</p>}
          <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl hover:bg-white text-xs font-bold transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedData.length === 0 || isImporting}
            className="px-5 py-2 rounded-xl text-white text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-40 transition-all cursor-pointer"
          >
            {isImporting ? "正在写入服务端…" : `开始导入并分配用例 (${parsedData.length})`}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportTestCasesModal;
