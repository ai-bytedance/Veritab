import React, { useState } from "react";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Table,
  Eye,
  Edit3,
  Columns,
  Maximize2,
  Minimize2,
  Type,
  Trash2,
  Flame,
} from "lucide-react";

interface MarkdownWorkspaceProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

// Simple and lightweight regex-based custom markdown-to-HTML parser
// Perfect for premium, ultra-fast rendering on and off React 19
export const simpleMarkdownParse = (text: string): string => {
  if (!text) return `<p className="italic text-slate-400">暂无内容，请切换至编辑模式进行补充。</p>`;

  let html = text;

  // Escape HTML entities to prevent crash or script injection
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code Block parsing
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<div class="bg-slate-50 border border-slate-150 rounded-lg p-3 font-mono text-xs text-indigo-950 overflow-x-auto my-3 whitespace-pre">${code.trim()}</div>`;
  });

  // Inline Code parsing
  html = html.replace(/`([^`]+)`/g, '<code class="bg-indigo-50/50 text-indigo-700 px-1 py-0.5 rounded font-mono text-[11px] font-bold border border-indigo-100">$1</code>');

  // Headers (e.g. ###, ##, #)
  html = html.replace(/^### (.*$)/gim, '<h4 class="text-sm font-extrabold text-slate-800 mt-4 mb-2 flex items-center gap-1.5 border-l-2 border-indigo-500 pl-2">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="text-base font-black text-slate-900 mt-5 mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-2">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-slate-950 mt-6 mb-3 pb-1.5 border-b-2 border-slate-200 flex items-center gap-2">$1</h2>');

  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-slate-950">$1</strong>');

  // Italic (*text*)
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-700">$1</em>');

  // Basic table parsing
  const lines = html.split("\n");
  let inTable = false;
  let tableRows: string[] = [];
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Check if it's a separator line like `| ---- | --- |`
      if (line.includes("-")) {
        continue;
      }

      const columns = line.split("|").slice(1, -1).map(c => c.trim());
      const isHeader = tableRows.length === 0;

      let rowHtml = `<tr class="${isHeader ? "bg-slate-50/70 text-slate-800 font-bold border-b border-slate-200" : "hover:bg-slate-50/40 border-b border-slate-100 text-slate-600"} transition-colors">`;
      columns.forEach(col => {
        rowHtml += isHeader
          ? `<th class="p-2.5 text-left text-xs font-black select-none">${col}</th>`
          : `<td class="p-2.5 text-xs font-medium">${col}</td>`;
      });
      rowHtml += "</tr>";
      tableRows.push(rowHtml);
    } else {
      if (inTable) {
        processedLines.push(`<div class="overflow-x-auto my-4 border border-slate-150 rounded-xl shadow-sm bg-white"><table class="w-full text-left border-collapse text-xs">${tableRows.join("")}</table></div>`);
        inTable = false;
        tableRows = [];
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    processedLines.push(`<div class="overflow-x-auto my-4 border border-slate-150 rounded-xl shadow-sm bg-white"><table class="w-full text-left border-collapse text-xs">${tableRows.join("")}</table></div>`);
  }
  html = processedLines.join("\n");

  // Unordered list formatting
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-600 pl-1 my-1">$1</li>');

  // Ordered list formatting
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-slate-600 pl-1 my-1">$1</li>');

  // Blockquote formatting
  html = html.replace(/^\s*&gt;\s+(.*$)/gim, '<blockquote class="border-l-4 border-indigo-200 bg-indigo-50/30 text-indigo-950 px-4 py-2 rounded-r-lg my-3">$1</blockquote>');

  // Paragraph tags handling for empty or plain text lines
  const finalLines = html.split("\n").map(l => {
    const trimmed = l.trim();
    if (!trimmed) return "<div class='h-2'></div>";
    if (trimmed.startsWith("<h") || trimmed.startsWith("<div") || trimmed.startsWith("<li") || trimmed.startsWith("<block") || trimmed.startsWith("<table") || trimmed.startsWith("<tr") || trimmed.startsWith("<td") || trimmed.startsWith("<th")) {
      return l;
    }
    return `<p class="whitespace-pre-wrap leading-relaxed text-slate-600 my-1">${l}</p>`;
  });

  return finalLines.join("\n");
};

export default function MarkdownWorkspace({
  value,
  onChange,
  placeholder = "输入说明书内容，支持轻量自动化 Markdown 模板语法...",
}: MarkdownWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [editorHeight, setEditorHeight] = useState<"min" | "mid" | "max">("mid");

  // Insert markdown macros in textarea
  const insertMacro = (before: string, after: string = "", placeholderVal: string = "") => {
    const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholderVal;

    const replacement = before + selectedText + after;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    // Focus back on text area
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // Preset Insert actions
  const actionBold = () => insertMacro("**", "**", "加粗文字");
  const actionItalic = () => insertMacro("*", "*", "斜体文字");
  const actionCode = () => insertMacro("`", "`", "代码块");
  const actionList = () => insertMacro("\n- ", "", "列表项");
  const actionOrderedList = () => insertMacro("\n1. ", "", "有序步骤");
  const actionTable = () => insertMacro(
    "\n| 参数 / 指标 | 设计标准 / 预期 | 备注 |\n| :--- | :--- | :--- |\n| 支付极限阈值 | 小于 50,000 元/单 | 防洗钱、防超额 |\n| 响应时长 | P99 触达稳定限时 200ms 以内 | 高吞吐保障 |\n",
    "",
    ""
  );
  const actionClear = () => {
    onChange("");
  };

  // Layout sizing mappings
  const heightClasses = {
    min: "h-44 sm:h-56",
    mid: "h-[450px] md:h-[calc(100vh-380px)] min-h-[360px]",
    max: "h-[680px] md:h-[calc(100vh-220px)] min-h-[550px]",
  };

  const textFontSizeClasses = {
    sm: "text-xs leading-relaxed",
    base: "text-xs sm:text-sm leading-relaxed",
    lg: "text-sm sm:text-base leading-relaxed",
  };

  const renderedHtml = simpleMarkdownParse(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col font-sans">
      {/* High-Performance Controls Strip */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 select-none text-slate-600">
        {/* Write & View Segment Control */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-slate-600 border border-slate-200 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "edit"
                ? "bg-white text-indigo-950 shadow-xs scale-102"
                : "hover:text-slate-900 hover:bg-white/40"
            }`}
          >
            <Edit3 className="h-3 w-3 text-indigo-600" />
            <span>仅编辑</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "split"
                ? "bg-white text-indigo-950 shadow-xs scale-102"
                : "hover:text-slate-900 hover:bg-white/40"
            }`}
          >
            <Columns className="h-3 w-3 text-indigo-600" />
            <span>实时分栏</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "preview"
                ? "bg-white text-indigo-950 shadow-xs scale-102"
                : "hover:text-slate-900 hover:bg-white/40"
            }`}
          >
            <Eye className="h-3 w-3 text-indigo-600" />
            <span>快预览</span>
          </button>
        </div>

        {/* Font Zoom Sizing */}
        <div className="flex items-center gap-1.5 bg-slate-100 py-1 px-1.5 rounded-lg shrink-0">
          <Type className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] text-slate-500 font-bold select-none mr-1">阅读缩放</span>
          <button
            type="button"
            onClick={() => setFontSize("sm")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer leading-none ${
              fontSize === "sm" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
            title="小号字体 (A-)"
          >
            小
          </button>
          <button
            type="button"
            onClick={() => setFontSize("base")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer leading-none ${
              fontSize === "base" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
            title="常规字体"
          >
            中
          </button>
          <button
            type="button"
            onClick={() => setFontSize("lg")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer leading-none ${
              fontSize === "lg" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
            title="大号字体 (A+)"
          >
            大
          </button>
        </div>

        {/* Expand / Height Control */}
        <div className="flex items-center gap-1 bg-slate-100 py-1 px-1.5 rounded-lg shrink-0">
          <span className="text-[10px] text-slate-500 font-bold select-none mr-1">编辑区高度</span>
          <button
            type="button"
            onClick={() => setEditorHeight("min")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer leading-none ${
              editorHeight === "min" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            矮
          </button>
          <button
            type="button"
            onClick={() => setEditorHeight("mid")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer leading-none ${
              editorHeight === "mid" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            中
          </button>
          <button
            type="button"
            onClick={() => setEditorHeight("max")}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer leading-none ${
              editorHeight === "max" ? "bg-indigo-600 text-white animate-pulse" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
            title="展开高宽极致模式 (H+)"
          >
            高
          </button>
        </div>
      </div>

      {/* Editor Macros Toolbelt (Only visible in edit or split modes) */}
      {viewMode !== "preview" && (
        <div className="bg-slate-50 border-b border-slate-150 px-3 py-1.5 flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={actionBold}
            className="p-1 sm:p-1.5 hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer"
            title="加粗"
          >
            <Bold className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </button>
          <button
            type="button"
            onClick={actionItalic}
            className="p-1 sm:p-1.5 hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer"
            title="斜体"
          >
            <Italic className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </button>
          <button
            type="button"
            onClick={actionCode}
            className="p-1 sm:p-1.5 hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer"
            title="行内代码"
          >
            <Code className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-200"></div>
          <button
            type="button"
            onClick={actionList}
            className="p-1 sm:p-1.5 hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer"
            title="无序列表"
          >
            <List className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </button>
          <button
            type="button"
            onClick={actionOrderedList}
            className="p-1 sm:p-1.5 hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer"
            title="有序列表"
          >
            <ListOrdered className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </button>
          <button
            type="button"
            onClick={actionTable}
            className="p-1 sm:p-1.5 hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title="一键插入设计规格表"
          >
            <Table className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-indigo-600" />
            <span className="hidden sm:inline text-[9.5px] text-slate-500">插入标准属性矩阵</span>
          </button>
          <div className="flex-1"></div>
          <button
            type="button"
            onClick={actionClear}
            className="p-1 px-1.5 hover:bg-rose-50 rounded-md text-rose-500 border border-transparent hover:border-rose-100 flex items-center gap-1 text-[9px] font-black cursor-pointer ml-auto"
            title="清空文字重新编辑"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">清空</span>
          </button>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className={`grid ${viewMode === "split" ? "grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200" : "grid-cols-1"}`}>
        {/* EDIT STATE */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className="relative">
            <textarea
              id="markdown-editor-textarea"
              className={`w-full p-4 font-mono outline-none border-0 placeholder:text-slate-300 ${heightClasses[editorHeight]} ${textFontSizeClasses[fontSize]} text-slate-800 bg-white ring-0 focus:ring-0 focus:outline-none resize-none leading-relaxed transition-all`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
            />
            <div className="absolute right-3.5 bottom-2 text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none uppercase tracking-wider">
              {value.length} 字符 | 编辑中
            </div>
          </div>
        )}

        {/* PREVIEW STATE */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="relative bg-slate-50/50">
            <div
              className={`w-full p-5 overflow-y-auto ${heightClasses[editorHeight]} ${textFontSizeClasses[fontSize]} text-slate-700 bg-slate-50/20`}
            >
              <div
                className="markdown-body transition-all"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
            <div className="absolute right-3.5 bottom-2 text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded select-none uppercase tracking-wider">
              Markdown 多重渲染可用
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
