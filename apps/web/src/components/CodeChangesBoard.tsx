import React, { useState, useEffect } from "react";
import {
  Project,
  Issue,
  TestCase,
  User,
  IssueType,
  DefectSeverity,
  DefectStatus,
  TestCaseGrade,
  TestCaseStatus,
  UserGroup,
  ProjectTab
} from "../types";
import { checkPermission } from "../lib/permission";
import {
  GitCommit,
  FileCode2,
  FileJson,
  FileText,
  Filter,
  RefreshCw,
  GitBranch,
  Github,
  Gitlab,
  Sparkles,
  Save,
  Check,
  Key,
  ChevronDown,
  ChevronLeft,
  Search,
  CheckCircle,
  Code2,
  FolderOpen
} from "lucide-react";
import { AIStructuredReport, CommitData, FileChange } from "./CodeChangesData.types";
import { CodeChangesHeader } from "./CodeChangesHeader";
import { CodeChangesReport } from "./CodeChangesReport";
import { generateDefectId } from "../lib/idUtils";
import { GitApiScope } from "../features/git-integrations/api/types";
import { useGitIntegrations } from "../features/git-integrations/api/useGitIntegrations";

interface CodeChangesBoardProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  issues: Issue[];
  testCases: TestCase[];
  onInvokeAI: (prompt: string) => Promise<string>;
  onAddTestCase: (testCase: Partial<TestCase>) => void;
  onAddIssue?: (issue: Issue) => void;
  users: User[];
  currentUser: User;
  userGroups?: UserGroup[];
  apiScope?: GitApiScope;
}

export default function CodeChangesBoard({
  project,
  onUpdateProject,
  issues,
  testCases,
  onInvokeAI,
  onAddTestCase,
  onAddIssue,
  users,
  currentUser,
  userGroups,
  apiScope,
}: CodeChangesBoardProps) {
  const remote = useGitIntegrations(apiScope);
  const [activeTab, setActiveTab] = useState<"diff" | "repo">("diff");

  // Responsive sidebar toggles - default to collapsed on small viewports via useEffect
  const [showCommits, setShowCommits] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  // Closed-loop State for Commits & Repo Config
  const [localCommits] = useState<CommitData[]>([]);
  const commits = apiScope ? remote.commits : localCommits;
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeCommitHash, setActiveCommitHash] = useState<string>("");
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Repo Settings State
  const [repoType, setRepoType] = useState<"github" | "gitlab">(project.repoType === "gitlab" ? "gitlab" : "github");
  const [repoUrl, setRepoUrl] = useState(project.repoUrl || "");
  const [repoToken, setRepoToken] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");

  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Verification Configurations
  const [analysisScope, setAnalysisScope] = useState<"single" | "commit" | "workspace">("single");
  const [analysisDimension, setAnalysisDimension] = useState<"logic" | "security" | "perf" | "test">("logic");
  const [isScopeOpen, setIsScopeOpen] = useState(false);
  const [isDimensionOpen, setIsDimensionOpen] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [structuredReport, setStructuredReport] = useState<AIStructuredReport | null>(null);
  const [reportActiveTab, setReportActiveTab] = useState<"report" | "code" | "test">("report");
  const [expandedDefectIndex, setExpandedDefectIndex] = useState<number | null>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCommit = commits.find(c => c.hash === activeCommitHash) || commits[0];
  const allFiles = activeCommit?.files || [];
  const activeFile = allFiles[activeFileIndex];

  useEffect(() => {
    if (!apiScope || remote.isLoading) return;
    if (remote.repository) {
      setRepoType(remote.repository.provider === "GITLAB" ? "gitlab" : "github");
      setRepoUrl(remote.repository.webUrl);
      setDefaultBranch(remote.repository.defaultBranch);
      setRepoToken("");
    } else {
      setRepoUrl("");
      setRepoToken("");
    }
  }, [apiScope, remote.isLoading, remote.repository?.id, remote.repository?.version]);

  useEffect(() => {
    if (commits.length && !commits.some((commit) => commit.hash === activeCommitHash)) {
      setActiveCommitHash(commits[0].hash);
      setActiveFileIndex(0);
    }
  }, [commits, activeCommitHash]);

  // Responsive Hook to adjust panel defaults based on window width
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        if (window.innerWidth < 1280) {
          setShowCommits(false);
        } else {
          setShowCommits(true);
        }
        if (window.innerWidth < 1024) {
          setShowFiles(false);
        } else {
          setShowFiles(true);
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const checkActionPermission = (action: "create" | "edit" | "delete") => {
    if (apiScope) return true;
    return checkPermission(currentUser || null, userGroups || [], ProjectTab.CODE_CHANGES, action);
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FileCode2 className="h-4 w-4 text-indigo-500" />;
    if (filename.endsWith('.json')) return <FileJson className="h-4 w-4 text-amber-500" />;
    return <FileText className="h-4 w-4 text-slate-500" />;
  };

  const renderDiff = (diffString: string) => {
    const lines = diffString.split('\n');
    return (
      <div className="font-mono text-[12px] sm:text-[13px] leading-6 w-full text-slate-300 rounded-xl overflow-hidden select-text bg-[#0d1117] border border-slate-800">
        <div className="py-2">
          {lines.map((line, idx) => {
            if (!line) return null;
            let lineBg = "bg-transparent";
            let textColor = "text-slate-300";

            if (line.startsWith('+')) {
              lineBg = "bg-emerald-500/10";
              textColor = "text-emerald-400";
            } else if (line.startsWith('-')) {
              lineBg = "bg-rose-500/10";
              textColor = "text-rose-400";
            } else if (line.startsWith('@@')) {
              lineBg = "bg-indigo-500/10";
              textColor = "text-indigo-400 font-bold";
            }

            return (
              <div key={idx} className={`flex px-3 sm:px-4 hover:bg-slate-800/50 ${lineBg} ${textColor}`}>
                <span className="opacity-40 select-none inline-block w-8 sm:w-10 text-right pr-3 sm:pr-4 border-r border-slate-700/50 mr-3 sm:mr-4 tabular-nums">
                  {idx + 1}
                </span>
                <span className="whitespace-pre flex-1">{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSyncRepo = async () => {
    if (!checkActionPermission("create")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“同步并拉取分支提交记录”操作！");
      return;
    }
    if (!repoUrl || (!repoToken && !(apiScope && remote.repository?.credentialConfigured))) {
      alert(apiScope ? "请先配置仓库路径与 Secret Manager 凭据引用" : "请先在「仓库配置」中完成访问路径与 Access Token 的设置");
      setActiveTab("repo");
      return;
    }
    if (apiScope) {
      setIsSyncing(true);
      try {
        await remote.refresh();
        setActiveTab("diff");
        triggerToast(`🔄 已刷新服务端代码变更，共 ${remote.commits.length} 条记录`);
      } catch (error) {
        triggerToast(`同步失败：${error instanceof Error ? error.message : "未知错误"}`);
      } finally {
        setIsSyncing(false);
      }
      return;
    }
    triggerToast("当前未启用服务端 Git 集成，请切换到 remote API 模式");
  };

  const handleSaveRepo = async () => {
    if (!checkActionPermission("delete")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“编辑并保存代码仓配置”操作！");
      return;
    }
    if (!repoUrl || (!repoToken && !(apiScope && remote.repository?.credentialConfigured)) || !defaultBranch) {
      alert(apiScope ? "请填写仓库地址、分支与凭据引用" : "请填写完整的仓库地址、分支与 Access Token");
      return;
    }
    setIsSavingRepo(true);

    if (apiScope) {
      try {
        await remote.saveRepository({ provider: repoType, webUrl: repoUrl, defaultBranch, credentialRef: repoToken || undefined });
        setSaveSuccess(true);
        setActiveTab("diff");
        triggerToast("✅ 仓库配置已安全保存；凭据由 Secret Manager 管理");
        setTimeout(() => setSaveSuccess(false), 1200);
      } catch (error) {
        triggerToast(`保存失败：${error instanceof Error ? error.message : "未知错误"}`);
      } finally {
        setIsSavingRepo(false);
      }
      return;
    }

    setTimeout(() => {
      onUpdateProject({ ...project, repoType, repoUrl });
      setIsSavingRepo(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab("diff");
        triggerToast("仓库地址已保存；启用 remote API 模式后才能同步真实变更");
      }, 1000);
    }, 600);
  };

  const handleAnalyzeDefects = async () => {
    if (!checkActionPermission("edit")) {
      triggerToast("⚠️ 您所属的工作群组无权进行“大模型缺陷研判与智能生成”操作！");
      return;
    }
    if (!activeFile) return;
    setIsAiAnalyzing(true);
    setStructuredReport(null);
    setReportActiveTab("report");

    try {
      let filesContext = "";
      if (analysisScope === "commit") {
        filesContext = `整批提交关联文件列表:\n` + activeCommit.files.map(f => `- ${f.filename} (状态: ${f.status}, 增: ${f.additions}, 删: ${f.deletions})`).join('\n') + `\n\n各文件 Diff 内容如下:\n` + activeCommit.files.map(f => `=== 文件: ${f.filename} ===\n${f.diff}`).join('\n\n');
      } else if (analysisScope === "workspace") {
        filesContext = `工程全局架构对齐。当前项目: ${project.name}, 关联文件: ${activeFile.filename}\nDiff详情:\n${activeFile.diff}\n(AI 将根据此变更在整个项目中的调用关系和 API 契约破损情况进行审计)`;
      } else {
        filesContext = `文件名: ${activeFile.filename}\nDiff内容:\n${activeFile.diff}`;
      }

      const prompt = `你是一个业界顶尖的代码审计专家、安全顾问和敏捷质量保障架构师。
针对以下代码变更，结合最前沿的缺陷发现和契约验证技术进行多维度对齐审查。
分析范围: ${analysisScope === "commit" ? "全提交跨模块对齐" : analysisScope === "workspace" ? "工程全局架构契约对齐" : "单文件局部 Diff 缺陷挖掘"}
校验维度: ${analysisDimension === "logic" ? "逻辑与边界漏洞" : analysisDimension === "security" ? "安全合规审计" : analysisDimension === "perf" ? "性能卡阻与资源泄露" : "单元测试套件自动生成"}

【正在审查的上下文信息】:
${filesContext}

请根据最前沿的 AI 辅助分析设计方案，严格输出以下 JSON 格式的字符串。不要用 markdown 代码块包裹它，直接返回 JSON 对象：
{
  "summary": "分析摘要",
  "severity": "HIGH" | "MEDIUM" | "LOW" | "CLEAN",
  "defects": [
    {
      "title": "缺陷标题",
      "severity": "致命" | "严重" | "一般" | "提示",
      "description": "详细描述该缺陷的成因",
      "fix": "给出修复方案"
    }
  ],
  "suggestedCode": "修复后的完整代码",
  "testCase": {
    "name": "测试用例名称",
    "precondition": "前置条件",
    "steps": "执行步骤",
    "expectedResult": "预期结果",
    "unitTestCode": "自动化测试代码"
  }
}
`;

      const res = await onInvokeAI(prompt);
      const cleanedText = cleanJsonString(res);
      const parsed = extractJsonFromText(cleanedText);

      if (parsed && parsed.summary && parsed.severity) {
        setStructuredReport(parsed);
        triggerToast("✨ AI 高级智能质控校验完成，已输出最新契约诊断报告");
      } else {
        throw new Error("AI response does not match the structured report contract");
      }
    } catch (e) {
      console.error(e);
      setStructuredReport(null);
      triggerToast("AI 质控服务暂不可用，请检查服务端模型配置后重试");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const cleanJsonString = (str: string) => {
    let cleaned = str.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  };

  const extractJsonFromText = (text: string): AIStructuredReport | null => {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
      const match = text.match(jsonRegex);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch (err) {
          console.warn("Match parse failed", err);
        }
      }

      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(text.substring(firstBrace, lastBrace + 1));
        } catch (err) {
          console.warn("Brace parse failed", err);
        }
      }
      return null;
    }
  };

  const handleSyncTestCaseToLibrary = () => {
    if (!structuredReport || !structuredReport.testCase) return;
    const tc = structuredReport.testCase;

    onAddTestCase({
      name: `[AI 自动生成] ${tc.name}`,
      grade: TestCaseGrade.P1,
      status: TestCaseStatus.UNTESTED,
      precondition: tc.precondition,
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      version: "v1.0.0-AI",
      tags: `AI回归, ${analysisScope === "commit" ? "全提交对齐" : "单文件Diff"}`,
      historyLogs: [
        {
          id: `log-${Date.now()}`,
          action: "AI 生成自动化测试用例并同步入库",
          createdAt: new Date().toISOString()
        }
      ]
    });

    triggerToast("🎉 用例同步成功！生成用例已录入「测试管理工作区」主用例树中");
  };

  const handleSyncDefectToIssues = (defect: any) => {
    if (!onAddIssue) {
      triggerToast("⚠️ 主应用接口未就绪，无法提报缺陷工单");
      return;
    }

    const newDefect: Issue = {
      id: generateDefectId(),
      projectId: project.id,
      type: IssueType.DEFECT,
      title: `[AI 追溯缺陷] - ${defect.title}`,
      content: `### AI 智能缺陷校验分析\n\n**缺陷概要**:\n${defect.description}\n\n**推荐重构代码方案**:\n${defect.fix}\n\n*数据源自 Veritab AI 代码变更追踪对齐分析平台*`,
      severity: defect.severity === "致命" ? DefectSeverity.FATAL : defect.severity === "严重" ? DefectSeverity.SERIOUS : DefectSeverity.NORMAL,
      defectStatus: DefectStatus.NEW,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creatorId: currentUser.id,
      assigneeId: "usr-wang",
      historyLogs: [
        {
          id: `log-${Date.now()}`,
          action: "AI 智能校验发现隐患并一键提报缺陷",
          createdAt: new Date().toISOString()
        }
      ]
    };

    onAddIssue(newDefect);
    triggerToast(`🚨 缺陷提报成功！工单 [${defect.title}] 已同步至缺陷追踪看板`);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`📋 已将 ${label} 复制代码到剪贴板！`);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Toast Alert Indicator */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-slate-900 text-white px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {apiScope && (remote.isLoading || remote.isSaving || remote.error) && (
        <div className={`mx-4 mt-3 rounded-xl border px-4 py-2 text-xs font-bold ${remote.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-indigo-100 bg-indigo-50 text-indigo-700"}`}>
          {remote.error
            ? `Git 集成服务异常：${remote.error instanceof Error ? remote.error.message : "未知错误"}`
            : remote.isSaving
              ? "正在保存仓库配置…"
              : "正在加载代码变更…"}
        </div>
      )}

      {/* Redesigned Compact & Clean Unified Header */}
      <CodeChangesHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showCommits={showCommits}
        setShowCommits={setShowCommits}
        showFiles={showFiles}
        setShowFiles={setShowFiles}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-slate-50/20">
        {activeTab === "diff" && (
          <>
            {/* Left Sidebar: Commits List */}
            {showCommits && (
              <div className="w-full lg:w-[280px] xl:w-[300px] shrink-0 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col overflow-hidden">
                {/* Unified Sidebar Header */}
                <div className="p-3 border-b border-slate-100 bg-white shrink-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-800 tracking-tight">提交历史</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Integrated Sync Action */}
                      <button
                        onClick={handleSyncRepo}
                        disabled={isSyncing}
                        title="同步最新变更代码"
                        className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 rounded text-[9px] font-bold transition-all cursor-pointer"
                      >
                        <RefreshCw className={`h-2 w-2 ${isSyncing ? "animate-spin" : ""}`} />
                        <span>{isSyncing ? "同步中" : "同步"}</span>
                      </button>

                      {/* Low profile Collapse trigger */}
                      <button
                        onClick={() => setShowCommits(false)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors"
                        title="隐藏侧栏"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Redesigned Unified Search, Magnifier, and Funnel Filter combined into one beautiful input box */}
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="搜索提交/分支/作者..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] w-full focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-sans font-medium"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      <div
                        title="已开启敏捷关联过滤"
                        className={`p-1 rounded cursor-pointer transition-colors ${searchQuery ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-indigo-600"}`}
                      >
                        <Filter className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {commits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-12 text-center">
                      <Github className="h-7 w-7 mb-2 text-slate-300 animate-pulse" />
                      <p className="text-[11px] font-bold text-slate-600 mb-0.5">暂无变更记录</p>
                      <p className="text-[9px] mb-3 text-slate-500">请完成远程仓库对接并同步</p>
                      <button
                        onClick={() => setActiveTab("repo")}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                      >
                        配置代码仓
                      </button>
                    </div>
                  ) : (
                    commits.filter(c => c.message.toLowerCase().includes(searchQuery.toLowerCase()) || c.branch.toLowerCase().includes(searchQuery.toLowerCase())).map(commit => {
                      const isSelected = activeCommitHash === commit.hash;
                      return (
                        <button
                          key={commit.hash}
                          onClick={() => {
                            setActiveCommitHash(commit.hash);
                            setActiveFileIndex(0);
                            setStructuredReport(null);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-500/5"
                              : "bg-white border-slate-150 hover:border-slate-200 hover:shadow-sm"
                          }`}
                        >
                          <div className={`font-bold text-xs mb-1 leading-normal truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {commit.message}
                          </div>
                          <div className="flex items-center justify-between mb-1.5 text-[9px] text-slate-500">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600 text-[8px]">{commit.hash}</span>
                              <span className="truncate">@{commit.author}</span>
                            </div>
                            <span>{commit.timestamp}</span>
                          </div>
                          <div className="flex items-center text-[8px]">
                            <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50/50 border border-indigo-100/40 px-1.5 py-0.5 rounded font-bold">
                              <GitBranch className="h-2 w-2" />
                              {commit.branch}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Middle Area: File List */}
            {showFiles && (
              <div className="w-full lg:w-[200px] xl:w-[220px] bg-slate-50/30 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col shrink-0 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                    变更文件 ({allFiles.length})
                  </span>
                  <button
                    onClick={() => setShowFiles(false)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="收起"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {commits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-12 text-center">
                      <FileCode2 className="h-6 w-6 mb-1 text-slate-200" />
                      <p className="text-[10px]">暂无文件</p>
                    </div>
                  ) : (
                    allFiles.map((file, idx) => {
                      const isSelected = activeFileIndex === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveFileIndex(idx);
                            setStructuredReport(null);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-600 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            {getFileIcon(file.filename)}
                            <span className="truncate text-[11px] font-sans">{file.filename.split('/').pop()}</span>
                          </div>
                          <div className="flex gap-0.5 text-[9px] font-mono shrink-0">
                            {file.additions > 0 && <span className="text-emerald-500">+{file.additions}</span>}
                            {file.deletions > 0 && <span className="text-rose-500">-{file.deletions}</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Right Area: Code Diff Canvas & AI Advanced Verification */}
            <div className="flex-1 bg-white overflow-hidden flex flex-col relative min-w-0">
              {activeFile && commits.length > 0 ? (
                <>
                  {/* Clean, Non-Squeezing Code & AI Verification Control Board */}
                  <div className="border-b border-slate-100 bg-white p-4 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.01)] z-10">
                    <div className="flex flex-col gap-3">
                      {/* Row 1: Active File Details with Stats */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                            {getFileIcon(activeFile.filename)}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-mono text-slate-800 font-bold truncate">
                              {activeFile.filename}
                            </span>
                            {activeFile.status === "added" ? (
                              <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded border border-emerald-100">新增</span>
                            ) : activeFile.status === "deleted" ? (
                              <span className="text-[8px] font-bold bg-rose-50 text-rose-700 px-1 py-0.2 rounded border border-rose-100">删除</span>
                            ) : (
                              <span className="text-[8px] font-bold bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-150">修改</span>
                            )}
                            <div className="flex items-center gap-0.5 text-[9px] font-mono shrink-0 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100 text-slate-500 font-bold">
                              {activeFile.additions > 0 && <span className="text-emerald-600">+{activeFile.additions}</span>}
                              {activeFile.deletions > 0 && <span className="text-rose-600">-{activeFile.deletions}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 shrink-0">
                          <GitBranch className="h-3 w-3" />
                          {activeCommit.hash}
                        </div>
                      </div>

                      {/* Row 2: Redesigned AI quality control workspace card with custom elegant dropdown select components */}
                      <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full relative z-30">

                        {/* Selector 1: Custom UI Analysis Scope */}
                        <div className="flex-1 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsScopeOpen(!isScopeOpen);
                              setIsDimensionOpen(false);
                            }}
                            className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-indigo-300 transition-colors text-left"
                          >
                            <div className="flex items-center min-w-0">
                              <span className="text-[9px] font-extrabold text-slate-400 mr-2 shrink-0 uppercase tracking-wider">分析范围</span>
                              <span className="text-[11px] font-bold text-slate-700 truncate">
                                {analysisScope === "single" && "单文件"}
                                {analysisScope === "commit" && "关联文件"}
                                {analysisScope === "workspace" && "全项目"}
                              </span>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform shrink-0 ${isScopeOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isScopeOpen && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setIsScopeOpen(false)} />
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                  onClick={() => {
                                    setAnalysisScope("single");
                                    setIsScopeOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisScope === "single" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">单文件</span>
                                  {analysisScope === "single" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisScope("commit");
                                    setIsScopeOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisScope === "commit" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">关联文件</span>
                                  {analysisScope === "commit" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisScope("workspace");
                                    setIsScopeOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisScope === "workspace" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">全项目</span>
                                  {analysisScope === "workspace" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Selector 2: Custom UI Analysis Dimension */}
                        <div className="flex-1 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDimensionOpen(!isDimensionOpen);
                              setIsScopeOpen(false);
                            }}
                            className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-indigo-300 transition-colors text-left"
                          >
                            <div className="flex items-center min-w-0">
                              <span className="text-[9px] font-extrabold text-slate-400 mr-2 shrink-0 uppercase tracking-wider">校验维度</span>
                              <span className="text-[11px] font-bold text-slate-700 truncate">
                                {analysisDimension === "logic" && "逻辑边界"}
                                {analysisDimension === "security" && "安全合规"}
                                {analysisDimension === "perf" && "性能资源"}
                                {analysisDimension === "test" && "测试回归"}
                              </span>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform shrink-0 ${isDimensionOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isDimensionOpen && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setIsDimensionOpen(false)} />
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                  onClick={() => {
                                    setAnalysisDimension("logic");
                                    setIsDimensionOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisDimension === "logic" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">逻辑边界</span>
                                  {analysisDimension === "logic" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisDimension("security");
                                    setIsDimensionOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisDimension === "security" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">安全合规</span>
                                  {analysisDimension === "security" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisDimension("perf");
                                    setIsDimensionOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisDimension === "perf" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">性能资源</span>
                                  {analysisDimension === "perf" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setAnalysisDimension("test");
                                    setIsDimensionOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                                    analysisDimension === "test" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">测试回归</span>
                                  {analysisDimension === "test" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Trigger AI Button */}
                        <button
                          onClick={handleAnalyzeDefects}
                          disabled={isAiAnalyzing}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5B4DF6] hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer shrink-0 z-10"
                        >
                          {isAiAnalyzing && (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          )}
                          <span>{isAiAnalyzing ? "正在诊断..." : "AI 智能验证"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Closed-loop Scope & Multi-file Context Topology Visualizer */}
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">
                        🔍 诊断闭环解析路径:
                      </span>
                      {analysisScope === "single" && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 rounded px-2 py-0.5 text-slate-600 font-mono text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="font-semibold text-slate-700">单文件分析</span>
                          <span className="text-slate-400">({activeFile.filename.split('/').pop()})</span>
                          <span className="text-slate-300 font-sans">→</span>
                          <span className="text-indigo-600 font-bold">LLM 质量验证</span>
                        </div>
                      )}
                      {analysisScope === "commit" && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 rounded px-2 py-0.5 text-slate-600 font-mono text-[10px] flex-wrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                          <span className="font-semibold text-slate-700">关联文件分析 ({activeCommit.files.length}个)</span>
                          <span className="text-slate-300 font-sans">→</span>
                          {activeCommit.files.map((f, fIdx) => (
                            <span key={fIdx} className="bg-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-700 font-sans">
                              {f.filename.split('/').pop()}
                            </span>
                          ))}
                          <span className="text-slate-300 font-sans">→</span>
                          <span className="text-indigo-600 font-bold">跨文件关联审计</span>
                        </div>
                      )}
                      {analysisScope === "workspace" && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 rounded px-2 py-0.5 text-slate-600 font-mono text-[10px] flex-wrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
                          <span className="font-semibold text-slate-700">全项目分析</span>
                          <span className="text-slate-300 font-sans">→</span>
                          <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-700 font-sans">工程配置(package.json)</span>
                          <span className="text-slate-300 font-sans">+</span>
                          <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-700 font-sans">全局契约(src/types.ts)</span>
                          <span className="text-slate-300 font-sans">+</span>
                          <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] text-indigo-700 font-sans font-bold">{activeFile.filename.split('/').pop()}</span>
                          <span className="text-slate-300 font-sans">→</span>
                          <span className="text-indigo-600 font-bold">全系统契约校验</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 self-end md:self-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>静态依赖已深度关联</span>
                    </div>
                  </div>

                  {/* Split Layout: Top for AI Report Dashboard, Bottom for Diff Canvas */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Render extracted modular AI Quality Report panel */}
                    {structuredReport && (
                      <CodeChangesReport
                        structuredReport={structuredReport}
                        reportActiveTab={reportActiveTab}
                        setReportActiveTab={setReportActiveTab}
                        expandedDefectIndex={expandedDefectIndex}
                        setExpandedDefectIndex={setExpandedDefectIndex}
                        handleSyncDefectToIssues={handleSyncDefectToIssues}
                        handleCopyToClipboard={handleCopyToClipboard}
                        handleSyncTestCaseToLibrary={handleSyncTestCaseToLibrary}
                      />
                    )}

                    {/* Diff Viewer */}
                    <div className="flex-1 overflow-auto p-3 sm:p-5 bg-slate-50/20">
                      {renderDiff(activeFile.diff)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/10">
                  <Code2 className="h-10 w-10 mb-3 text-slate-200 animate-pulse" />
                  <p className="text-sm font-bold text-slate-600">没有选择可追踪的代码变更</p>
                  {commits.length === 0 ? (
                    <p className="text-xs text-slate-500 mt-2 max-w-sm">
                      当前项目未拉取代码。请在上方「仓库配置」中完成路径配置，并点击「同步仓库」拉取最前沿的代码变更信息。
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">请在左侧点击任意提交及变更文件，即可加载高质量代码 Unified Diff 以及触发 AI 对齐审查。</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "repo" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 bg-slate-50 flex justify-center">
            <div className="w-full max-w-2xl">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-8 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-1.5">
                    <Github className="h-4.5 w-4.5 text-indigo-600" />
                    仓库配置
                  </h3>
                  <p className="text-xs text-slate-500">配置当前敏捷空间的远程代码托管平台授权，打通需求、变更和 AI 质控诊断闭环流程。</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                      1. 选择托管平台
                    </label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setRepoType("github")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                          repoType === "github"
                            ? "border-slate-900 text-slate-900 bg-slate-50 shadow-sm"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <Github className="h-4 w-4" />
                        <span>GitHub</span>
                        {repoType === "github" && (
                          <span className="h-1 w-1 rounded-full bg-slate-900 ml-1" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepoType("gitlab")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                          repoType === "gitlab"
                            ? "bg-[#FC6D26] border-[#FC6D26] text-white shadow-md shadow-orange-500/10"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <Gitlab className="h-4 w-4" />
                        <span>GitLab</span>
                        {repoType === "gitlab" && (
                          <span className="h-1 w-1 rounded-full bg-white ml-1" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                      2. 代码库访问路径 (REPOSITORY URL)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#5B4DF6] focus:ring-1 focus:ring-[#5B4DF6]/10 transition-all bg-white font-mono"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="e.g. https://github.com/veritab/autonomous-sim"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                      <Key className="h-3 w-3" /> 3. {apiScope ? "凭据引用 (Secret Reference)" : "访问令牌 (Access Token)"}
                    </label>
                    <input
                      type={apiScope ? "text" : "password"}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#5B4DF6] focus:ring-1 focus:ring-[#5B4DF6]/10 transition-all bg-white font-mono"
                      value={repoToken}
                      onChange={(e) => setRepoToken(e.target.value)}
                      placeholder="vault://veritab/git/provider-token"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                      {apiScope ? "这里只保存 Secret Manager 引用，浏览器和数据库都不会保存明文 Token。" : "用于拉取最新的 Commit 记录与 Diff 文本。仅限本地 Demo。"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> 4. 默认追踪分支 (Default Branch)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#5B4DF6] focus:ring-1 focus:ring-[#5B4DF6]/10 transition-all bg-white font-mono"
                      value={defaultBranch}
                      onChange={(e) => setDefaultBranch(e.target.value)}
                      placeholder="main 或 master"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveRepo}
                      disabled={isSavingRepo || isSyncing}
                      className="flex items-center gap-1 px-5 py-2.5 bg-[#5B4DF6] hover:bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      {isSavingRepo || isSyncing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : saveSuccess ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{isSavingRepo ? "保存中..." : isSyncing ? "同步中..." : saveSuccess ? "配置成功并同步" : "保存并测试连接"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
