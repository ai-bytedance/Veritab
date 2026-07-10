import React from "react";
import { Issue, TestCase, User as SystemUser, IssueType, DefectSeverity, DefectStatus, RequirementStatus, ProjectTab, TestCaseStatus } from "../types";
import { formatReqId, formatDefectId, formatCaseId } from "../lib/idUtils";
import { CheckSquare, AlertTriangle, FileText, X, ArrowRight, Layers, Search } from "lucide-react";
import Pagination from "./Pagination";

interface TraceabilityListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  testCases?: TestCase[];
  issues?: Issue[]; // Requirements or Defects
  users: SystemUser[];
  onNavigateToTab?: (tab: ProjectTab) => void;
  onFocusIssue?: (id: string | null) => void;
  onUnbindTestCase?: (caseId: string) => void;
}

export default function TraceabilityListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  testCases = [],
  issues = [],
  users,
  onNavigateToTab,
  onFocusIssue,
  onUnbindTestCase,
}: TraceabilityListModalProps) {
  if (!isOpen) return null;

  const [tcSearch, setTcSearch] = React.useState("");
  const [tcPage, setTcPage] = React.useState(1);
  const [tcPageSize, setTcPageSize] = React.useState(10);

  const [issueSearch, setIssueSearch] = React.useState("");
  const [issuePage, setIssuePage] = React.useState(1);
  const [issuePageSize, setIssuePageSize] = React.useState(10);

  const handleTcSearchChange = (val: string) => {
    setTcSearch(val);
    setTcPage(1);
  };

  const handleIssueSearchChange = (val: string) => {
    setIssueSearch(val);
    setIssuePage(1);
  };

  const getPriorityBadgeClass = (priority?: string) => {
    const val = priority || "中-P2";
    if (val.includes("P0") || val.includes("最高")) {
      return "bg-rose-50 border-rose-150 text-rose-600 shadow-3xs";
    }
    if (val.includes("P1") || val.includes("高")) {
      return "bg-orange-50 border-orange-150 text-orange-600 shadow-3xs";
    }
    if (val.includes("P2") || val.includes("中")) {
      return "bg-amber-50 border-amber-150 text-amber-600 shadow-3xs";
    }
    return "bg-slate-50 border-slate-150 text-slate-600 shadow-3xs";
  };

  const getDefectStatusBadgeClass = (status?: DefectStatus) => {
    const val = status || DefectStatus.NEW;
    switch (val) {
      case DefectStatus.NEW:
        return "bg-blue-50 text-blue-600 border-blue-100";
      case DefectStatus.CLOSED:
        return "bg-slate-100 text-slate-500 border-slate-200";
      case DefectStatus.RESOLVED:
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default:
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
    }
  };

  const getReqStatusBadgeClass = (status?: RequirementStatus) => {
    const val = status || RequirementStatus.DEVELOPING;
    switch (val) {
      case RequirementStatus.DRAFT:
        return "bg-slate-50 text-slate-500 border-slate-200";
      case RequirementStatus.UNDER_REVIEW:
        return "bg-amber-50 text-amber-600 border-amber-100";
      case RequirementStatus.DEVELOPING:
        return "bg-blue-50 text-blue-600 border-blue-100";
      case RequirementStatus.TESTING:
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case RequirementStatus.ACCEPTING:
        return "bg-amber-50 text-amber-600 border-amber-100";
      case RequirementStatus.COMPLETED:
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const handleRowClick = (type: "tc" | "req" | "defect", id: string) => {
    if (!onFocusIssue || !onNavigateToTab) return;

    if (type === "tc") {
      onFocusIssue(id);
      onNavigateToTab(ProjectTab.TESTCASE);
    } else if (type === "defect") {
      onFocusIssue(id);
      onNavigateToTab(ProjectTab.DEFECT);
    } else if (type === "req") {
      onFocusIssue(id);
      onNavigateToTab(ProjectTab.REQUIREMENT);
    }
    onClose();
  };

  const filteredTestCases = testCases.filter((tc) => {
    const query = tcSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      tc.id.toLowerCase().includes(query) ||
      tc.name.toLowerCase().includes(query) ||
      (tc.grade && tc.grade.toLowerCase().includes(query))
    );
  });

  const totalTcItems = filteredTestCases.length;
  const paginatedTestCases = filteredTestCases.slice(
    (tcPage - 1) * tcPageSize,
    tcPage * tcPageSize
  );

  const filteredIssues = issues.filter((issue) => {
    const query = issueSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      issue.id.toLowerCase().includes(query) ||
      issue.title.toLowerCase().includes(query) ||
      (issue.severity && issue.severity.toLowerCase().includes(query)) ||
      (issue.priority && issue.priority.toLowerCase().includes(query))
    );
  });

  const totalIssueItems = filteredIssues.length;
  const paginatedIssues = filteredIssues.slice(
    (issuePage - 1) * issuePageSize,
    issuePage * issuePageSize
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Linked Test Cases */}
          {testCases.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-indigo-500" />
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                    关联测试用例 ({totalTcItems === testCases.length ? testCases.length : `${totalTcItems}/${testCases.length}`})
                  </h4>
                </div>
                {/* Search Box */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索用例名称、编号、优先级..."
                    value={tcSearch}
                    onChange={(e) => handleTcSearchChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all font-sans"
                  />
                  {tcSearch && (
                    <button
                      onClick={() => handleTcSearchChange("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="px-4 py-2.5 w-32">用例编号</th>
                      <th className="px-4 py-2.5">用例名称</th>
                      <th className="px-4 py-2.5 w-24 text-center">优先级</th>
                      <th className="px-4 py-2.5 w-28 text-center">执行状态</th>
                      <th className="px-4 py-2.5 w-36 text-right pr-6">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/60 bg-white">
                    {paginatedTestCases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                          未检索到匹配的关联测试用例
                        </td>
                      </tr>
                    ) : (
                      paginatedTestCases.map((tc) => (
                        <tr
                          key={tc.id}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          onClick={() => handleRowClick("tc", tc.id)}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                            {formatCaseId(tc.id)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-xs" title={tc.name}>
                            {tc.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${getPriorityBadgeClass(tc.grade)}`}>
                              {tc.grade || "中-P2"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              tc.status === TestCaseStatus.PASS
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : tc.status === TestCaseStatus.FAIL
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : tc.status === TestCaseStatus.BLOCKED
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                              {tc.status === TestCaseStatus.PASS
                                ? "通过"
                                : tc.status === TestCaseStatus.FAIL
                                ? "失败"
                                : tc.status === TestCaseStatus.BLOCKED
                                ? "阻塞"
                                : "未测试"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRowClick("tc", tc.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-all cursor-pointer whitespace-nowrap"
                              >
                                定位
                              </button>
                              {onUnbindTestCase && (
                                <button
                                  onClick={() => onUnbindTestCase(tc.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  解绑
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination for test cases */}
              {totalTcItems > 0 && (
                <div className="mt-3">
                  <Pagination
                    currentPage={tcPage}
                    totalItems={totalTcItems}
                    pageSize={tcPageSize}
                    onPageChange={(page) => setTcPage(page)}
                    onPageSizeChange={(size) => {
                      setTcPageSize(size);
                      setTcPage(1);
                    }}
                    themeColor="indigo"
                  />
                </div>
              )}
            </div>
          )}

          {/* Linked Issues (Requirements or Defects) */}
          {issues.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {issues[0].type === IssueType.DEFECT ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-amber-500" />
                  )}
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
                    {issues[0].type === IssueType.DEFECT
                      ? `关联异常缺陷 (${totalIssueItems === issues.length ? issues.length : `${totalIssueItems}/${issues.length}`})`
                      : `关联业务需求 (${totalIssueItems === issues.length ? issues.length : `${totalIssueItems}/${issues.length}`})`}
                  </h4>
                </div>
                {/* Search Box */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索编号、标题、严重程度/优先级..."
                    value={issueSearch}
                    onChange={(e) => handleIssueSearchChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all font-sans"
                  />
                  {issueSearch && (
                    <button
                      onClick={() => handleIssueSearchChange("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="px-4 py-2.5 w-32">编号</th>
                      <th className="px-4 py-2.5">标题</th>
                      <th className="px-4 py-2.5 w-24 text-center">
                        {issues[0].type === IssueType.DEFECT ? "严重程度" : "优先级"}
                      </th>
                      <th className="px-4 py-2.5 w-28 text-center">流转状态</th>
                      <th className="px-4 py-2.5 w-24 text-left pl-1">负责人</th>
                      <th className="px-4 py-2.5 w-32 text-right pr-6">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/60 bg-white">
                    {paginatedIssues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                          未检索到匹配的关联项
                        </td>
                      </tr>
                    ) : (
                      paginatedIssues.map((issue) => {
                        const assigned = users.find((u) => u.id === issue.assigneeId);
                        const isDefect = issue.type === IssueType.DEFECT;
                        return (
                          <tr
                            key={issue.id}
                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                            onClick={() => handleRowClick(isDefect ? "defect" : "req", issue.id)}
                          >
                            <td className={`px-4 py-3 font-mono font-bold whitespace-nowrap ${isDefect ? "text-rose-600" : "text-amber-600"}`}>
                              {isDefect ? formatDefectId(issue.id) : formatReqId(issue.id)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-xs" title={issue.title}>
                              {issue.title}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                                isDefect
                                  ? issue.severity === DefectSeverity.FATAL
                                    ? "bg-rose-50 border-rose-100 text-rose-600"
                                    : issue.severity === DefectSeverity.SERIOUS
                                    ? "bg-orange-50 border-orange-100 text-orange-600"
                                    : issue.severity === DefectSeverity.NORMAL
                                    ? "bg-amber-50 border-amber-100 text-amber-600"
                                    : "bg-slate-50 border-slate-100 text-slate-600"
                                  : getPriorityBadgeClass(issue.priority)
                              }`}>
                                {isDefect ? issue.severity || "正常" : issue.priority || "中-P2"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                isDefect
                                  ? getDefectStatusBadgeClass(issue.defectStatus)
                                  : getReqStatusBadgeClass(issue.requirementStatus)
                              }`}>
                                {isDefect ? issue.defectStatus || "新建" : issue.requirementStatus || "草稿"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left pl-1">
                              <div className="flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 border border-slate-200 shrink-0">
                                  {assigned ? assigned.nickname.substring(0, 1) : "待"}
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[70px]">
                                  {assigned ? assigned.nickname : "待指派"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => handleRowClick(isDefect ? "defect" : "req", issue.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  定位
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination for issues */}
              {totalIssueItems > 0 && (
                <div className="mt-3">
                  <Pagination
                    currentPage={issuePage}
                    totalItems={totalIssueItems}
                    pageSize={issuePageSize}
                    onPageChange={(page) => setIssuePage(page)}
                    onPageSizeChange={(size) => {
                      setIssuePageSize(size);
                      setIssuePage(1);
                    }}
                    themeColor="indigo"
                  />
                </div>
              )}
            </div>
          )}

          {testCases.length === 0 && issues.length === 0 && (
            <div className="text-center py-16 text-xs text-slate-400 italic border border-dashed border-slate-150 rounded-2xl bg-slate-50/20">
              🔍 暂无任何质量追踪关联数据。
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer shadow-3xs"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
