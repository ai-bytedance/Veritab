/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  TrendingUp,
  ShieldAlert,
  Activity,
  Users,
  FolderOpen,
  Percent,
  Layers,
  Bug,
  HelpCircle,
  TrendingDown
} from "lucide-react";
import { Project, Issue, IssueType, TestCase, TestCaseStatus, DefectSeverity } from "../types";
import CustomSelect from "./CustomSelect";

interface MetricsDashboardProps {
  projects: Project[];
  issues: Issue[];
  testCases: TestCase[];
}

export default function MetricsDashboard({
  projects,
  issues,
  testCases,
}: MetricsDashboardProps) {
  const [selectedProjId, setSelectedProjId] = useState<string>("all");

  // Filtering based on project
  const filteredIssues = selectedProjId === "all"
    ? issues
    : issues.filter(i => i.projectId === selectedProjId);

  const filteredTestCases = selectedProjId === "all"
    ? testCases
    : testCases.filter(tc => tc.projectId === selectedProjId);

  // Statistics
  const reqCount = filteredIssues.filter(i => i.type === IssueType.REQUIREMENT).length;
  const defectCount = filteredIssues.filter(i => i.type === IssueType.DEFECT).length;

  // TestCase state rates
  const tcTotal = filteredTestCases.length;
  const tcPass = filteredTestCases.filter(tc => tc.status === TestCaseStatus.PASS).length;
  const tcFail = filteredTestCases.filter(tc => tc.status === TestCaseStatus.FAIL).length;
  const tcBlocked = filteredTestCases.filter(tc => tc.status === TestCaseStatus.BLOCKED).length;
  const tcUntested = filteredTestCases.filter(tc => tc.status === TestCaseStatus.UNTESTED).length;

  const passRate = tcTotal > 0 ? Math.round((tcPass / tcTotal) * 100) : 0;
  const failRate = tcTotal > 0 ? Math.round((tcFail / tcTotal) * 100) : 0;

  // Defect Severity stats
  const severityFatal = filteredIssues.filter(i => i.type === IssueType.DEFECT && i.severity === DefectSeverity.FATAL).length;
  const severitySerious = filteredIssues.filter(i => i.type === IssueType.DEFECT && i.severity === DefectSeverity.SERIOUS).length;
  const severityNormal = filteredIssues.filter(i => i.type === IssueType.DEFECT && i.severity === DefectSeverity.NORMAL).length;
  const severityPrompt = filteredIssues.filter(i => i.type === IssueType.DEFECT && i.severity === DefectSeverity.PROMPT).length;

  // Interactive state for chart hover/selection
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Cross-project comparision calculated data
  const projectCompareData = projects.map(proj => {
    const pIssues = issues.filter(i => i.projectId === proj.id);
    const pReqs = pIssues.filter(i => i.type === IssueType.REQUIREMENT).length;
    const pDefs = pIssues.filter(i => i.type === IssueType.DEFECT).length;
    const pCases = testCases.filter(tc => tc.projectId === proj.id);
    const pPassed = pCases.filter(tc => tc.status === TestCaseStatus.PASS).length;
    const pPassRate = pCases.length > 0 ? Math.round((pPassed / pCases.length) * 100) : 0;

    return {
      name: proj.name,
      reqs: pReqs,
      defects: pDefs,
      passRate: pPassRate,
      casesTotal: pCases.length
    };
  });

  return (
    <div className="space-y-6" id="metrics-dashboard-wrapper">
      {/* Header Selector bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            <span>全向团队质量与敏捷度量看板</span>
          </h2>
          <p className="text-xs text-slate-400">实时提取仿真基线与用例数据流，全访问统计测试颗粒度、堆叠比例和开发密度指数。</p>
        </div>

        <div className="w-56">
          <CustomSelect
            value={selectedProjId}
            onChange={(val) => setSelectedProjId(val)}
            options={[
              { value: "all", label: "🌐 全空间统筹视图" },
              ...projects.map(p => ({ value: p.id, label: `📁 ${p.name}` }))
            ]}
            activeBgClassName="bg-indigo-50/50"
            activeTextClassName="text-indigo-700"
          />
        </div>
      </div>

      {/* Grid statistics highlights */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "活跃需求基线", count: reqCount, subtitle: "敏捷迭代推进中", icon: Layers, color: "text-indigo-600 bg-indigo-50" },
          { label: "未关闭缺陷", count: defectCount, subtitle: "致命/一般综合统计", icon: Bug, color: "text-rose-600 bg-rose-50" },
          { label: "覆盖用例总量", count: tcTotal, subtitle: "双向追溯覆盖", icon: FolderOpen, color: "text-emerald-600 bg-emerald-50" },
          { label: "用例通过率", count: `${passRate}%`, subtitle: "系统可用性比率", icon: Percent, color: "text-amber-650 bg-amber-50" },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
                <span className={`p-2 rounded-xl ${stat.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stat.count}</div>
                <p className="text-[10px] text-slate-400 mt-1">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualized Charts Section */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Chart 1: TestCase State Pie/Donut (SVG interactive custom visualization) */}
        <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase text-slate-400">用例状态颗粒堆叠度量</h3>
            <p className="text-[11px] text-slate-500">反映质量测试集的完成度和覆盖拦截阻力比率。</p>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
            {/* SVG Donut Chart */}
            {tcTotal === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">当前没有可用测试数据进行绘制</div>
            ) : (
              <div className="relative h-44 w-44">
                <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4.2" opacity="0.6" />

                  {/* Pass slice */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="4.5"
                    strokeDasharray={`${passRate} ${100 - passRate}`}
                    strokeDashoffset="0"
                    className="transition-all duration-300 cursor-pointer hover:stroke-[5px]"
                    onMouseEnter={() => setHoveredSlice(`通过 (${passRate}%)`)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />

                  {/* Fail slice */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth="4.5"
                    strokeDasharray={`${failRate} ${100 - failRate}`}
                    strokeDashoffset={`-${passRate}`}
                    className="transition-all duration-300 cursor-pointer hover:stroke-[5px]"
                    onMouseEnter={() => setHoveredSlice(`失败 (${failRate}%)`)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />

                  {/* Blocked/Untested slice template background placeholder */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#64748b"
                    strokeWidth="3.2"
                    strokeDasharray={`${100 - passRate - failRate} ${passRate + failRate}`}
                    strokeDashoffset={`-${passRate + failRate}`}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(`阻塞/未测试 (${Math.max(0, 100 - passRate - failRate)}%)`)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                </svg>

                {/* center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-800">{passRate}%</span>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">综合通过率</span>
                </div>
              </div>
            )}

            {/* Tooltip feedback */}
            <div className="mt-2 h-5 text-center text-xs font-bold text-indigo-600 font-sans">
              {hoveredSlice || "悬停图表扇区查看详情"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>已通过 ({tcPass}条)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>执行失败 ({tcFail}条)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-500"></span>
              <span>已阻塞 ({tcBlocked}条)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-300"></span>
              <span>待验证 ({tcUntested}条)</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Defect Severity Distribution Stacked (SVG High Fidelity chart) */}
        <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase text-slate-400">痕迹缺陷指数与严重级别分布</h3>
            <p className="text-[11px] text-slate-500">致命缺陷的绝对清零是每次仿真的生命线要求。</p>
          </div>

          <div className="space-y-4 py-3">
            {[
              { level: "Fatal (致命)", count: severityFatal, max: 15, color: "bg-rose-600 text-rose-700", text: "立即阻断修复" },
              { level: "Serious (严重)", count: severitySerious, max: 15, color: "bg-rose-450 text-rose-500", text: "优先排程安排" },
              { level: "Normal (一般)", count: severityNormal, max: 15, color: "bg-indigo-500 text-indigo-600", text: "常规敏捷修复" },
              { level: "Prompt (提示)", count: severityPrompt, max: 15, color: "bg-slate-400 text-slate-500", text: "非功能性优化" },
            ].map((item, idx) => {
              const percentage = Math.min(100, Math.round((item.count / 15) * 100));
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{item.level}</span>
                    <span className="font-bold font-mono text-slate-500">{item.count} 条</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color.split(" ")[0]} transition-all duration-500`}
                      style={{ width: `${item.count > 0 ? Math.max(8, percentage) : 0}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans">{item.text}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Quality benchmark list cross-spaces */}
        <div className="md:col-span-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase text-slate-400">跨空间可用性与度量对比</h3>
            <p className="text-[11px] text-slate-500">对比不同分支及架构单元的覆盖表现与残余缺陷。</p>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {projectCompareData.map((proj, idx) => (
              <div key={idx} className="rounded-xl border border-slate-50 bg-slate-50/20 p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[170px]">{proj.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    proj.passRate >= 80
                      ? "bg-emerald-50 text-emerald-600"
                      : proj.passRate >= 40
                      ? "bg-amber-50 text-amber-600"
                      : "bg-rose-50 text-rose-600"
                  }`}>
                    {proj.passRate}% 通过率
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                  <span>需求: {proj.reqs}</span>
                  <span className="text-rose-500">积压缺陷: {proj.defects}</span>
                  <span>用例数: {proj.casesTotal}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
