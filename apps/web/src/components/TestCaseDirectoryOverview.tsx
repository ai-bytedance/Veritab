import React from "react";
import {
  FolderOpen,
  HelpCircle,
  CheckSquare,
  FileText,
  User,
  SlidersHorizontal,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Edit3,
  Network,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  TestCase,
  TestCaseStatus,
  TestCaseGrade,
  Issue,
  IssueType,
  Folder as FolderType,
  ProjectTab,
} from "../types";
import TestCaseXMindMindmap from "./TestCaseXMindMindmap";
import Pagination from "./Pagination";
import MarkdownWorkspace from "./MarkdownWorkspace";
import { formatReqId, formatCaseId, formatDefectId } from "../lib/idUtils";
import ConfirmDialog from "./ConfirmDialog";
import TraceabilityListModal from "./TraceabilityListModal";
import CustomSelect from "./CustomSelect";

interface TestCaseDirectoryOverviewProps {
  projectId: string;
  activeFolderId: string | null;
  activeRequirementId: string | null;
  folders: FolderType[];
  requirements: Issue[];
  issues?: Issue[];
  testCases: TestCase[];
  activeUsers: any[];
  editMode: "form" | "markdown" | "xmind";
  setEditMode?: (mode: "form" | "markdown" | "xmind") => void;
  isTreeCollapsed?: boolean;
  setIsTreeCollapsed?: (collapsed: boolean) => void;
  onUpdateTestCase: (tc: TestCase) => void;
  onSelectTestCase?: (id: string) => void;
  onEditTestCase?: (tc: TestCase) => void;
  isBatchMode?: boolean;
  selectedCaseIds?: string[];
  onToggleCaseSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onOpenMoveBatch?: () => void;
  onExecuteBatchStatusChange?: (status: TestCaseStatus) => void;
  onExecuteBatchDelete?: () => void;
  onClearSelection?: () => void;
  onDeleteTestCase?: (id: string) => void;
  onCreateTestCase?: () => void;
  onAddTestCase?: (tc: TestCase) => void;
  onUpdateFolders?: (folders: FolderType[]) => void;
  onSelectFolder?: (id: string | null) => void;
  onSelectReqFolder?: (id: string | null) => void;
  activeCase?: TestCase;
  onTriggerWebhook?: (provider: string, payload: any) => void;
  onXMindFullscreenChange?: (isFullscreen: boolean) => void;
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusIssue?: (id: string | null) => void;
  userGroups?: any[];
}



const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const pad = (num: number) => String(num).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return "-";
  }
};

export default function TestCaseDirectoryOverview({
  projectId,
  activeFolderId,
  activeRequirementId,
  folders,
  requirements,
  issues = [],
  testCases,
  activeUsers,
  editMode,
  setEditMode,
  isTreeCollapsed,
  setIsTreeCollapsed,
  onUpdateTestCase,
  onSelectTestCase,
  onEditTestCase,
  isBatchMode,
  selectedCaseIds = [],
  onToggleCaseSelect,
  onSelectAll,
  onOpenMoveBatch,
  onExecuteBatchStatusChange,
  onExecuteBatchDelete,
  onClearSelection,
  onDeleteTestCase,
  onCreateTestCase,
  onAddTestCase,
  onUpdateFolders,
  onSelectFolder,
  onSelectReqFolder,
  activeCase,
  onTriggerWebhook,
  onXMindFullscreenChange,
  onNavigateToTab,
  onFocusIssue,
  userGroups = []
}: TestCaseDirectoryOverviewProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [deleteCaseId, setDeleteCaseId] = React.useState<string | null>(null);

  // Traceability List Modal states
  const [traceabilityState, setTraceabilityState] = React.useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    testCases: TestCase[];
    issues: Issue[];
    issueId?: string;
  }>({
    isOpen: false,
    title: "",
    subtitle: "",
    testCases: [],
    issues: [],
  });

  // Directory-level markdown state
  const [directoryMarkdown, setDirectoryMarkdown] = React.useState("");
  const [isSavingMarkdown, setIsSavingMarkdown] = React.useState(false);
  const [markdownToast, setMarkdownToast] = React.useState<string | null>(null);

  // 获取以某节点为根的子树中所有的 folder ID
  const getSubfolderIds = React.useCallback(
    (startFolderId: string): string[] => {
      const result = [startFolderId];
      for (let i = 0; i < result.length; i++) {
        const currentId = result[i];
        const directChildren = folders
          .filter((f) => f.parentId === currentId)
          .map((f) => f.id);
        result.push(...directChildren);
      }
      return result;
    },
    [folders],
  );

  const activeFolder = activeFolderId && activeFolderId !== "unplanned" && activeFolderId !== "req-root"
    ? folders.find((f) => f.id === activeFolderId)
    : null;
  const activeReq = activeRequirementId
    ? requirements.find((r) => r.id === activeRequirementId)
    : null;
  const title = activeFolderId === "unplanned"
    ? "未规划用例集"
    : activeFolderId === "req-root"
    ? "按需求用例集"
    : activeFolder
      ? `层级目录: ${activeFolder.name}`
      : activeReq
        ? `需求相关: ${activeReq.title}`
        : "全部测试用例集";

  const breadcrumbs = React.useMemo(() => {
    const list: { label: string; action?: () => void }[] = [];

    // Base/Root
    list.push({
      label: "全部用例",
      action: () => {
        if (onSelectFolder) onSelectFolder(null);
        if (onSelectReqFolder) onSelectReqFolder(null);
      }
    });

    if (activeFolderId === "unplanned") {
      list.push({ label: "未规划" });
    } else if (activeFolderId === "req-root") {
      list.push({ label: "按需求" });
    } else if (activeFolder) {
      // Build folder path hierarchy
      const pathNodes: FolderType[] = [];
      let current: FolderType | undefined = activeFolder;
      while (current) {
        pathNodes.unshift(current);
        current = current.parentId ? folders.find(f => f.id === current.parentId) : undefined;
      }
      pathNodes.forEach((node, idx) => {
        const isLast = idx === pathNodes.length - 1;
        list.push({
          label: node.name,
          action: isLast ? undefined : () => {
            if (onSelectFolder) onSelectFolder(node.id);
          }
        });
      });
    } else if (activeRequirementId) {
      list.push({
        label: "按需求",
        action: () => {
          if (onSelectFolder) onSelectFolder("req-root");
        }
      });
      if (activeReq) {
        list.push({
          label: activeReq.title
        });
      }
    }
    return list;
  }, [activeFolderId, activeFolder, folders, activeRequirementId, activeReq, onSelectFolder, onSelectReqFolder]);

  const localTargetCases = React.useMemo(() => {
    if (activeFolderId === "unplanned") {
      return testCases.filter(
        (tc) => !tc.folderId && !tc.linkedRequirementId,
      );
    }
    if (activeFolderId === "req-root") {
      return testCases.filter(
        (tc) => !tc.folderId && !!tc.linkedRequirementId,
      );
    }
    if (activeFolderId) {
      const allTargetFolderIds = getSubfolderIds(activeFolderId);
      return testCases.filter(
        (tc) => tc.folderId && allTargetFolderIds.includes(tc.folderId),
      );
    }
    if (activeRequirementId) {
      return testCases.filter(
        (tc) => tc.linkedRequirementId === activeRequirementId,
      );
    }
    return testCases;
  }, [activeFolderId, activeRequirementId, testCases, getSubfolderIds]);

  const totalCasesCount = localTargetCases.length;
  const passCasesCount = localTargetCases.filter(
    (c) => c.status === TestCaseStatus.PASS,
  ).length;
  const failCasesCount = localTargetCases.filter(
    (c) => c.status === TestCaseStatus.FAIL,
  ).length;
  const blockedCasesCount = localTargetCases.filter(
    (c) => c.status === TestCaseStatus.BLOCKED,
  ).length;

  const passRate =
    totalCasesCount > 0
      ? Math.round((passCasesCount / totalCasesCount) * 100)
      : 0;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [selectedGrade, setSelectedGrade] = React.useState<string>("ALL");
  const [selectedAssignee, setSelectedAssignee] = React.useState<string>("ALL");

  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  // Reset page when folder or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFolderId, activeRequirementId, searchQuery, selectedStatus, selectedGrade, selectedAssignee]);

  const filteredAndSearchedCases = React.useMemo(() => {
    return localTargetCases.filter((tc) => {
      const matchesSearch = tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tc.precondition && tc.precondition.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = selectedStatus === "ALL" || tc.status === selectedStatus;
      const matchesGrade = selectedGrade === "ALL" || tc.grade === selectedGrade;
      const matchesAssignee = selectedAssignee === "ALL" || tc.assigneeId === selectedAssignee;
      return matchesSearch && matchesStatus && matchesGrade && matchesAssignee;
    });
  }, [localTargetCases, searchQuery, selectedStatus, selectedGrade, selectedAssignee]);

  // Sync directoryMarkdown when filteredAndSearchedCases or editMode change
  React.useEffect(() => {
    if (editMode === "markdown") {
      const serialized = filteredAndSearchedCases.map(tc => {
        return `### 用例 ID: ${tc.id}\n### 用例名称\n${tc.name || ""}\n\n### 前置条件\n${tc.precondition || ""}\n\n### 执行步骤\n${tc.steps || ""}\n\n### 期望结果\n${tc.expectedResult || ""}\n`;
      }).join("\n---\n\n");
      setDirectoryMarkdown(serialized);
    }
  }, [editMode, filteredAndSearchedCases]);

  const handleSaveDirectoryMarkdown = () => {
    setIsSavingMarkdown(true);
    try {
      const blocks = directoryMarkdown.split(/\n?---\n?/);
      let updatedCount = 0;
      blocks.forEach(block => {
        const lines = block.split("\n");
        let id = "";
        let name = "";
        let preconditionLines: string[] = [];
        let stepsLines: string[] = [];
        let expectedLines: string[] = [];
        let currentSection = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          if (trimmed.startsWith("### 用例 ID:")) {
            id = trimmed.replace("### 用例 ID:", "").trim();
            continue;
          }
          if (trimmed.startsWith("### ")) {
            currentSection = trimmed.replace("### ", "").trim();
            continue;
          }

          if (currentSection === "用例名称") {
            if (line) name = name ? name + "\n" + line : line;
          } else if (currentSection === "前置条件") {
            preconditionLines.push(line);
          } else if (currentSection === "执行步骤") {
            stepsLines.push(line);
          } else if (currentSection === "期望结果") {
            expectedLines.push(line);
          }
        }

        if (id) {
          const tc = testCases.find(c => c.id === id);
          if (tc) {
            onUpdateTestCase({
              ...tc,
              name: name.trim() || tc.name,
              precondition: preconditionLines.join("\n").trim(),
              steps: stepsLines.join("\n").trim(),
              expectedResult: expectedLines.join("\n").trim(),
              updatedAt: new Date().toISOString()
            });
            updatedCount++;
          }
        }
      });
      setMarkdownToast(`🎉 成功解析并批量同步更新了 ${updatedCount} 个测试用例！`);
      setTimeout(() => setMarkdownToast(null), 3000);
    } catch (err: any) {
      alert(`❌ 解析 Markdown 格式错误: ${err.message}`);
    } finally {
      setIsSavingMarkdown(false);
    }
  };

  const paginatedCases = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSearchedCases.slice(start, start + pageSize);
  }, [filteredAndSearchedCases, currentPage, pageSize]);

  const getGradeBadgeClass = (grade: TestCaseGrade) => {
    if (grade === TestCaseGrade.P0) {
      return "bg-rose-50 border-rose-100 text-rose-600";
    }
    if (grade === TestCaseGrade.P1) {
      return "bg-orange-50 border-orange-100 text-orange-600";
    }
    if (grade === TestCaseGrade.P2) {
      return "bg-indigo-50 border-indigo-100 text-indigo-600";
    }
    return "bg-slate-50 border-slate-200 text-slate-500";
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-3xs space-y-5 animate-fade-in text-left font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {setIsTreeCollapsed && isTreeCollapsed && (
            <button
              type="button"
              onClick={() => setIsTreeCollapsed(false)}
              className="mr-1 p-1.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer flex items-center justify-center shadow-3xs active:scale-95 shrink-0 select-none outline-none focus:outline-none"
              title="展开左侧目录树"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs shrink-0">
            <FolderOpen className="h-4 w-4" />
          </div>

          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 flex-wrap select-none ml-1">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-300 font-normal">/</span>}
                  {crumb.action && !isLast ? (
                    <button
                      type="button"
                      onClick={crumb.action}
                      className="text-slate-600 hover:text-indigo-600 hover:underline transition-colors cursor-pointer font-bold outline-none focus:outline-none"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={isLast ? "text-slate-800 font-extrabold" : "text-slate-500"}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Unified Mode Switcher in directory overview header so that it is ALWAYS visible! */}
        {setEditMode && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-3xs">
            {[
              { mode: "form", label: "表单", icon: FileText },
              { mode: "markdown", label: "Markdown", icon: Edit3 },
              { mode: "xmind", label: "Xmind", icon: Network },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = editMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => setEditMode(item.mode as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none select-none ${
                    isActive
                      ? "bg-white text-indigo-700 shadow-3xs border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/10 border border-transparent"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {editMode === "form" && (
        <>
          {/* Directory Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 text-left shadow-3xs">
              <span className="text-[8.5px] font-black text-slate-400 block tracking-widest uppercase">
                总测试用例
              </span>
              <span className="text-xl font-black text-slate-800 block mt-1 font-mono">
                {totalCasesCount}{" "}
                <span className="text-[10px] text-slate-400 font-sans font-bold">
                  个
                </span>
              </span>
            </div>
            <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-3.5 text-left shadow-3xs">
              <span className="text-[8.5px] font-black text-emerald-600 block tracking-widest uppercase">
                通过率 / 通过数
              </span>
              <span className="text-xl font-black text-emerald-750 block mt-1 font-mono">
                {passRate}%{" "}
                <span className="text-[10px] text-emerald-500 font-sans font-bold">
                  ({passCasesCount}个)
                </span>
              </span>
            </div>
            <div className="bg-rose-50/25 border border-rose-100/60 rounded-2xl p-3.5 text-left shadow-3xs">
              <span className="text-[8.5px] font-black text-rose-600 block tracking-widest uppercase">
                失败用例
              </span>
              <span className="text-xl font-black text-rose-700 block mt-1 font-mono">
                {failCasesCount}{" "}
                <span className="text-[10px] text-rose-450 font-sans font-bold">
                  个
                </span>
              </span>
            </div>
            <div className="bg-amber-50/25 border border-amber-100/50 rounded-2xl p-3.5 text-left shadow-3xs">
              <span className="text-[8.5px] font-black text-amber-600 block tracking-widest uppercase">
                当前阻塞
              </span>
              <span className="text-xl font-black text-amber-700 block mt-1 font-mono">
                {blockedCasesCount}{" "}
                <span className="text-[10px] text-amber-500 font-sans font-bold">
                  个
                </span>
              </span>
            </div>
          </div>

          {/* Case list Layout */}
          <div className="space-y-4">
            {/* Search and Filters bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/50 select-none">
              {/* Left side: Search Box and Advanced Filter closely paired */}
              <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pl-9 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all text-slate-800 placeholder:text-slate-400"
                    placeholder="搜索用例编号或名称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`px-3 py-2 rounded-xl border transition-all text-xs font-bold cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none ${
                      showAdvancedFilters || (selectedStatus !== "ALL" || selectedGrade !== "ALL" || selectedAssignee !== "ALL")
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-3xs font-black"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>高级筛选</span>
                    {(selectedStatus !== "ALL" || selectedGrade !== "ALL" || selectedAssignee !== "ALL") && (
                      <span className="bg-indigo-600 text-white text-[9px] font-black leading-none rounded-full px-1.5 py-0.5 ml-0.5">
                        {[
                          selectedStatus !== "ALL" ? 1 : 0,
                          selectedGrade !== "ALL" ? 1 : 0,
                          selectedAssignee !== "ALL" ? 1 : 0,
                        ].reduce((a, b) => a + b, 0)}
                      </span>
                    )}
                  </button>

                  {/* Advanced Filter Floating Console */}
                  {showAdvancedFilters && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent cursor-default"
                        onClick={() => setShowAdvancedFilters(false)}
                      />
                      <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl space-y-3.5 z-50 text-left text-xs animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                            <Filter className="h-3.5 w-3.5 text-indigo-600" /> 高级筛选条件
                          </span>
                          {(selectedStatus !== "ALL" || selectedGrade !== "ALL" || selectedAssignee !== "ALL") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStatus("ALL");
                                setSelectedGrade("ALL");
                                setSelectedAssignee("ALL");
                              }}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              重置
                            </button>
                          )}
                        </div>

                        <div className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">用例状态</label>
                            <CustomSelect
                              value={selectedStatus}
                              onChange={(val) => setSelectedStatus(val)}
                              options={[
                                { value: "ALL", label: "全部状态" },
                                { value: TestCaseStatus.PASS, label: `通过 (${localTargetCases.filter(c => c.status === TestCaseStatus.PASS).length})` },
                                { value: TestCaseStatus.FAIL, label: `失败 (${localTargetCases.filter(c => c.status === TestCaseStatus.FAIL).length})` },
                                { value: TestCaseStatus.BLOCKED, label: `阻塞 (${localTargetCases.filter(c => c.status === TestCaseStatus.BLOCKED).length})` },
                                { value: TestCaseStatus.UNTESTED, label: `未测试 (${localTargetCases.filter(c => !c.status || c.status === TestCaseStatus.UNTESTED).length})` },
                              ]}
                              focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                              activeBgClassName="bg-indigo-50/50"
                              activeTextClassName="text-indigo-750"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">优先级</label>
                            <CustomSelect
                              value={selectedGrade}
                              onChange={(val) => setSelectedGrade(val)}
                              options={[
                                { value: "ALL", label: "全部优先级" },
                                { value: TestCaseGrade.P0, label: "P0" },
                                { value: TestCaseGrade.P1, label: "P1" },
                                { value: TestCaseGrade.P2, label: "P2" },
                              ]}
                              focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                              activeBgClassName="bg-indigo-50/50"
                              activeTextClassName="text-indigo-750"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">负责人</label>
                            <CustomSelect
                              value={selectedAssignee}
                              onChange={(val) => setSelectedAssignee(val)}
                              options={[
                                { value: "ALL", label: "全部负责人" },
                                ...activeUsers.map((u) => ({ value: u.id, label: u.nickname })),
                              ]}
                              focusRingColorClassName="focus:border-indigo-500 focus:ring-indigo-50/50"
                              activeBgClassName="bg-indigo-50/50"
                              activeTextClassName="text-indigo-750"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right side: Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 select-none">
                {onCreateTestCase && (
                  <button
                    type="button"
                    onClick={onCreateTestCase}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-3xs hover:shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none"
                    id="btn-overview-create-case"
                  >
                    <span className="text-sm font-black">+</span>
                    <span>新建用例</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable table container for smaller viewports to prevent squishing */}
            <div className="w-full overflow-x-auto scrollbar-thin">
              <div className="min-w-[1050px] pb-1 space-y-3">
                {/* List Header (表头) */}
                {paginatedCases.length > 0 && (
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                    <div className="w-44 shrink-0 font-sans flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={paginatedCases.length > 0 && paginatedCases.every(tc => selectedCaseIds.includes(tc.id))}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelectAll?.();
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>用例编号</span>
                    </div>
                    <div className="flex-1 min-w-0 font-sans pl-2">用例名称</div>
                    <div className="flex items-center shrink-0 text-left gap-x-6">
                      <div className="w-20 text-center font-sans">优先级</div>
                      <div className="w-24 text-center font-sans">执行状态</div>
                      <div className="w-24 text-left font-sans pl-1">负责人</div>
                      <div className="w-36 text-left font-sans">质量追踪</div>
                      <div className="w-36 text-right font-sans">创建日期</div>
                      <div className="w-24 text-center font-sans">操作</div>
                    </div>
                  </div>
                )}

                {/* Flat listing workspace rows */}
                <div className="space-y-2.5">
                  {localTargetCases.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                      🔍 此层级下暂无用例，可点击左侧目录树的 “+” 号快捷创建！
                    </div>
                  ) : filteredAndSearchedCases.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                      🔍 未找到符合搜索或筛选条件的测试用例！
                    </div>
                  ) : (
                    paginatedCases.map((tc) => {
                      const assigned = activeUsers.find((u) => u.id === tc.assigneeId);
                      const tcReqs = requirements.filter(
                        (r) => r.id === tc.linkedRequirementId || r.linkToTestCases?.includes(tc.id)
                      );
                      const tcDefects = issues.filter(
                        (i) =>
                          i.projectId === projectId &&
                          i.type === IssueType.DEFECT &&
                          (i.id === tc.linkedDefectId || i.linkToTestCases?.includes(tc.id))
                      );

                      return (
                        <div
                          key={tc.id}
                          onClick={() => onSelectTestCase?.(tc.id)}
                          className="group relative rounded-2xl border border-slate-200/60 bg-white p-4 cursor-pointer transition-all flex flex-col text-left hover:bg-slate-50/50 hover:shadow-xs"
                        >
                          {/* Top main row of the test case */}
                          <div className="flex flex-row items-center justify-between gap-4 w-full">
                            {/* Left block ID column */}
                            <div className="flex items-center gap-3 w-44 shrink-0 min-w-0">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleCaseSelect?.(tc.id);
                                }}
                                className="p-1 cursor-pointer shrink-0 select-none flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCaseIds.includes(tc.id)}
                                  onChange={() => {}} // handled by click of outer div container
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </div>
                              <span
                                className="text-[11px] font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-100/60 px-2 py-0.5 rounded-lg font-mono truncate"
                                title={tc.id}
                              >
                                {formatCaseId(tc.id)}
                              </span>
                            </div>

                            {/* Name column */}
                            <div className="min-w-0 flex-1 pl-2">
                              <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={tc.name}>
                                {tc.name}
                              </h4>
                            </div>

                            {/* Right metadata flex alignments */}
                            <div className="flex items-center gap-x-6 text-xs shrink-0 justify-end">
                              {/* Priority / Grade */}
                              <div className="w-20 flex justify-center shrink-0">
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-center border font-mono ${getGradeBadgeClass(tc.grade)}`}>
                                  {tc.grade ? tc.grade.split("-")[1] || tc.grade : "P1"}
                                </span>
                              </div>

                              {/* Status */}
                              <div className="w-24 flex justify-center shrink-0">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border text-center ${
                                    tc.status === TestCaseStatus.PASS
                                      ? "bg-emerald-50 border-emerald-150 text-emerald-600"
                                      : tc.status === TestCaseStatus.FAIL
                                        ? "bg-rose-50 border-rose-150 text-rose-600 animate-pulse"
                                        : tc.status === TestCaseStatus.BLOCKED
                                          ? "bg-amber-50 border-amber-150 text-amber-600"
                                          : "bg-slate-50 border-slate-200 text-slate-500"
                                  }`}
                                >
                                  {tc.status}
                                </span>
                              </div>

                              {/* Owner */}
                              <div className="flex items-center gap-1.5 w-24 shrink-0 pl-1">
                                <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                                  {assigned ? assigned.nickname.substring(0, 1) : "待"}
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 truncate">
                                  {assigned ? assigned.nickname : "待指派"}
                                </span>
                              </div>

                              {/* Quality tracking (Traceability indicators) */}
                              <div className="flex items-center gap-2 w-36 shrink-0">
                                <span
                                  className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded font-bold hover:brightness-95 border transition-all cursor-pointer ${
                                    tcReqs.length > 0
                                      ? "bg-indigo-50 text-indigo-650 border-indigo-150"
                                      : "bg-slate-50 text-slate-400 border-slate-100"
                                  }`}
                                  title={tcReqs.length > 0 ? "点击查看关联业务需求列表" : "暂无关联业务需求"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (tcReqs.length > 0) {
                                      setTraceabilityState({
                                        isOpen: true,
                                        title: `用例 ${formatCaseId(tc.id)} 的关联业务需求`,
                                        subtitle: tc.name,
                                        testCases: [],
                                        issues: tcReqs,
                                        issueId: tc.id,
                                      });
                                    }
                                  }}
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span>{tcReqs.length}</span>
                                </span>

                                <span
                                  className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded font-bold hover:brightness-95 border transition-all cursor-pointer ${
                                    tcDefects.length > 0
                                      ? "bg-rose-50 text-rose-600 border-rose-150"
                                      : "bg-slate-50 text-slate-400 border-slate-100"
                                  }`}
                                  title={tcDefects.length > 0 ? "点击查看关联异常缺陷列表" : "暂无关联异常缺陷"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (tcDefects.length > 0) {
                                      setTraceabilityState({
                                        isOpen: true,
                                        title: `用例 ${formatCaseId(tc.id)} 的关联异常缺陷`,
                                        subtitle: tc.name,
                                        testCases: [],
                                        issues: tcDefects,
                                        issueId: tc.id,
                                      });
                                    }
                                  }}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  <span>{tcDefects.length}</span>
                                </span>
                              </div>

                              {/* Creation Date */}
                              <div className="text-[10.5px] text-slate-400 font-bold w-36 text-right shrink-0 font-mono">
                                {formatDateTime(tc.createdAt)}
                              </div>

                              {/* Actions column */}
                              <div className="w-24 flex justify-center items-center gap-1.5 shrink-0 select-none pr-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTestCase?.(tc);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg cursor-pointer border border-slate-200 flex items-center justify-center hover:scale-102 active:scale-98"
                                  title="编辑用例"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteCaseId(tc.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-655 p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer border border-rose-200 flex items-center justify-center hover:scale-102 active:scale-98 shadow-3xs"
                                  title="删除用例"
                                >
                                  <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                          </div>


                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {filteredAndSearchedCases.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredAndSearchedCases.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                themeColor="indigo"
              />
            )}
          </div>
        </>
      )}

      {editMode === "xmind" && (
        <div className="pt-2 w-full max-w-full overflow-hidden">
          <TestCaseXMindMindmap
            projectId={projectId}
            activeCase={activeCase}
            requirements={requirements}
            folders={folders}
            onUpdateTestCase={onUpdateTestCase}
            activeFolderId={activeFolderId}
            activeRequirementId={activeRequirementId}
            testCases={testCases}
            activeUsers={activeUsers}
            onSelectTestCase={onSelectTestCase}
            onSelectFolder={onSelectFolder}
            onSelectReqFolder={onSelectReqFolder}
            onAddTestCase={onAddTestCase}
            onDeleteTestCase={onDeleteTestCase}
            onUpdateFolders={onUpdateFolders}
            onTriggerWebhook={onTriggerWebhook}
            onFullscreenChange={onXMindFullscreenChange}
            userGroups={userGroups}
          />
        </div>
      )}

      {editMode === "markdown" && (
        <div className="space-y-4 pt-2 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Edit3 className="h-4 w-4 text-indigo-650" />
                <span>层级目录用例 Markdown 协同设计台</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold leading-relaxed">
                支持以 Markdown 完整格式查看并批量协同编辑当前层级（{activeFolder ? activeFolder.name : "根目录"}）下的所有测试用例。编辑完成后一键回写至系统数据库。
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveDirectoryMarkdown}
              disabled={isSavingMarkdown || filteredAndSearchedCases.length === 0}
              className={`px-4 py-1.5 text-white text-[11px] font-black rounded-xl shadow-3xs transition-all flex items-center gap-1.5 select-none outline-none ${
                filteredAndSearchedCases.length === 0
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-95"
              }`}
            >
              <span>{isSavingMarkdown ? "正在同步解析..." : "💾 保存协同草稿并同步"}</span>
            </button>
          </div>

          {markdownToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-150 text-emerald-700 text-[10px] font-extrabold animate-fade-in select-none">
              {markdownToast}
            </div>
          )}

          {filteredAndSearchedCases.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded-2xl select-none">
              当前层级下无测试用例，无法使用 Markdown 协同工作台，请先新建测试用例！
            </div>
          ) : (
            <MarkdownWorkspace
              value={directoryMarkdown}
              onChange={setDirectoryMarkdown}
              placeholder="### 用例 ID: (请勿修改用例 ID)&#10;### 用例名称&#10;..."
            />
          )}
        </div>
      )}

      {/* Redesigned Premium Floating Actions Dock - Beautiful Light Glassmorphism */}
      {selectedCaseIds.length > 0 && editMode === "form" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/95 border border-slate-200 shadow-2xl backdrop-blur-md px-5 py-2.5 rounded-2xl text-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-black text-slate-500">
              已选中 <span className="text-xs font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg font-mono">{selectedCaseIds.length}</span> 项测试用例
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Other operations */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenMoveBatch && (
              <button
                type="button"
                onClick={onOpenMoveBatch}
                className="px-3.5 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/55 hover:bg-indigo-50 text-[10.5px] font-black text-indigo-700 hover:text-indigo-850 transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-3xs"
              >
                <span>🔀</span> 移动
              </button>
            )}
            {onExecuteBatchDelete && (
              <button
                type="button"
                onClick={onExecuteBatchDelete}
                className="px-3.5 py-1.5 rounded-xl border border-rose-100 bg-rose-50/55 hover:bg-rose-50 text-[10.5px] font-black text-rose-600 hover:text-rose-700 transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-3xs"
              >
                <span>🗑️</span> 删除
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Clear / Cancel */}
          <button
            type="button"
            onClick={() => onClearSelection?.()}
            className="px-3 py-1.5 rounded-xl border border-transparent hover:bg-slate-100 text-[10.5px] font-black text-slate-450 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            title="取消选择"
          >
            取消
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteCaseId !== null}
        title="彻底删除测试用例"
        message="您确定要彻底删除该测试用例吗？删除后关联关系将会自动接触，此操作不可恢复。"
        confirmText="确认删除"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          if (deleteCaseId && onDeleteTestCase) {
            onDeleteTestCase(deleteCaseId);
          }
        }}
        onCancel={() => setDeleteCaseId(null)}
      />

      <TraceabilityListModal
        isOpen={traceabilityState.isOpen}
        onClose={() => setTraceabilityState({ ...traceabilityState, isOpen: false })}
        title={traceabilityState.title}
        subtitle={traceabilityState.subtitle}
        testCases={traceabilityState.testCases}
        issues={traceabilityState.issues}
        users={activeUsers}
        onNavigateToTab={onNavigateToTab}
        onFocusIssue={onFocusIssue}
      />
    </div>
  );
}
