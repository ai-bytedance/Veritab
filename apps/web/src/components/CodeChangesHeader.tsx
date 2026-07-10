import React from "react";
import {
  GitCommit,
  GitPullRequest,
  Settings,
  Columns3,
  FileCode2
} from "lucide-react";

interface CodeChangesHeaderProps {
  activeTab: "diff" | "repo";
  setActiveTab: (tab: "diff" | "repo") => void;
  showCommits: boolean;
  setShowCommits: (show: boolean) => void;
  showFiles: boolean;
  setShowFiles: (show: boolean) => void;
}

export const CodeChangesHeader: React.FC<CodeChangesHeaderProps> = ({
  activeTab,
  setActiveTab,
  showCommits,
  setShowCommits,
  showFiles,
  setShowFiles,
}) => {
  return (
    <header className="shrink-0 bg-white border-b border-slate-100 px-4 py-2.5 sm:px-6 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)] z-20">
      {/* Left Section: Brand Logo & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
          <GitCommit className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs font-black text-slate-800 tracking-tight leading-none">
            代码追踪与验证
          </h1>
          <span className="text-[9px] text-slate-400 font-medium font-sans">
            AI 契约与质量审计
          </span>
        </div>
      </div>

      {/* Middle/Right Section: Compact Navigation Tabs & Layout Toggles */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Navigation Tab Pills */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab("diff")}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "diff"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GitPullRequest className="h-3 w-3" />
            <span>变更历史</span>
          </button>
          <button
            onClick={() => setActiveTab("repo")}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "repo"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Settings className="h-3 w-3" />
            <span>仓库配置</span>
          </button>
        </div>

        {/* Vertical Separator */}
        {activeTab === "diff" && (
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
        )}

        {/* Layout Control Toggles - persistent but extremely compact */}
        {activeTab === "diff" && (
          <div className="flex items-center bg-slate-50 border border-slate-150 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setShowCommits(!showCommits)}
              title={showCommits ? "隐藏提交列表" : "显示提交列表"}
              className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                showCommits
                  ? "bg-white text-indigo-700 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Columns3 className="h-3 w-3" />
              <span className="hidden md:inline text-[9px] px-0.5 font-bold">提交树</span>
            </button>
            <button
              onClick={() => setShowFiles(!showFiles)}
              title={showFiles ? "隐藏文件列表" : "显示文件列表"}
              className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                showFiles
                  ? "bg-white text-emerald-700 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <FileCode2 className="h-3 w-3" />
              <span className="hidden md:inline text-[9px] px-0.5 font-bold">文件树</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
