/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect } from "react";
import {
  Project,
  User as SystemUser,
  UserGroup,
  Issue,
  TestCase,
  Folder,
  SystemConfig,
  ProjectTab,
  IssueType,
  RequirementPriority,
  DefectSeverity,
  DefectStatus,
  TestCaseGrade,
  TestCaseStatus
} from "./types";
import { DEFAULT_SYSTEM_CONFIG } from "./config/defaults";
import Sidebar from "./components/Sidebar";
import PromptMissingModal from "./components/PromptMissingModal";
import LoginModal from "./components/LoginModal";
import PersonalCenterModal from "./components/PersonalCenterModal";
import { Sparkles, HelpCircle, BookmarkCheck, AlertOctagon, FolderGit2, FileCheck2, BarChart4, Settings, ShieldCheck, GitCommit, GitBranch, Globe } from "lucide-react";
import { generateCaseId } from "./lib/idUtils";
import { apiRequest, authApi } from "./api/httpClient";
import { RequirementApiScope } from "./features/requirements/api/types";
import { useGitIntegrations } from "./features/git-integrations/api/useGitIntegrations";

const ProjectSpace = lazy(() => import("./components/ProjectSpace"));
const RequirementsBoard = lazy(() => import("./components/RequirementsBoard"));
const DefectsBoard = lazy(() => import("./components/DefectsBoard"));
const TestCaseWorkspace = lazy(() => import("./components/TestCaseWorkspace"));
const CodeChangesBoard = lazy(() => import("./components/CodeChangesBoard"));
const MetricsDashboard = lazy(() => import("./components/MetricsDashboard"));
const SystemConfigPanel = lazy(() => import("./components/SystemConfigPanel"));

export default function App() {
  const configuredApiScope: RequirementApiScope | undefined =
    import.meta.env.VITE_ORGANIZATION_ID && import.meta.env.VITE_PROJECT_SPACE_ID
      ? {
          organizationId: import.meta.env.VITE_ORGANIZATION_ID,
          projectSpaceId: import.meta.env.VITE_PROJECT_SPACE_ID,
        }
      : undefined;
  const [requirementApiScope, setRequirementApiScope] = useState<RequirementApiScope | undefined>(configuredApiScope);
  const gitIntegration = useGitIntegrations(requirementApiScope);
  // Server-backed view state. PostgreSQL remains the sole business source of truth.
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);

  const [currentUser, setCurrentUser] = useState<SystemUser>({ id: "", username: "", nickname: "未登录", email: "", group: "server-managed", status: "active", role: "member" });

  const handleCurrentUserChange = (newUser: SystemUser) => {
    setCurrentUser(newUser);
    setIsLoggedOut(false);
    setIsLoginModalOpen(false);
    setUsers(prev => {
      const exists = prev.some((user) => user.id === newUser.id);
      const updated = exists
        ? prev.map(u => u.id === newUser.id ? { ...u, nickname: newUser.nickname, email: newUser.email, feishuUserId: newUser.feishuUserId, wechatUserId: newUser.wechatUserId, dingtalkUserId: newUser.dingtalkUserId, role: newUser.role } : u)
        : [newUser, ...prev];
      return updated;
    });
  };

  const handleLogout = () => {
    void authApi.logout();
    setIsLoggedOut(true);
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    void authApi
      .restoreSession()
      .then((result) => {
        if (cancelled) return;
        handleCurrentUserChange({
          id: result.user.id,
          username: result.user.username,
          nickname: result.user.displayName,
          email: result.user.email,
          group: "server-managed",
          status: "active",
          role: result.user.roleCodes.some((code) => code === "org_admin" || code === "space_admin") ? "admin" : "member",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoggedOut(true);
        setIsLoginModalOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPersonalCenterOpen, setIsPersonalCenterOpen] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(true);

  // Advanced Confirmation & Prompt Strategy config states
  const [isPromptMissingOpen, setIsPromptMissingOpen] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ProjectTab>(ProjectTab.OVERVIEW);
  const [focusedTestCaseId, setFocusedTestCaseId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isLoggedOut || requirementApiScope) return;
    let cancelled = false;
    void apiRequest<Array<{ id: string }>>("/organizations")
      .then(async (organizations) => {
        const organization = organizations[0];
        if (!organization) return undefined;
        const spaces = await apiRequest<Array<{ id: string }>>(`/organizations/${organization.id}/spaces`);
        return spaces[0] ? { organizationId: organization.id, projectSpaceId: spaces[0].id } : undefined;
      })
      .then((scope) => {
        if (!cancelled && scope) setRequirementApiScope(scope);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isLoggedOut, requirementApiScope]);

  useEffect(() => {
    if (isLoggedOut || !requirementApiScope) return;
    let cancelled = false;
    void apiRequest<{ id: string; name: string; description: string | null; createdAt: string }>(
      `/organizations/${requirementApiScope.organizationId}/spaces/${requirementApiScope.projectSpaceId}`,
    ).then((space) => {
      if (cancelled) return;
      const project: Project = {
        id: space.id,
        name: space.name,
        description: space.description || "",
        repoType: "none",
        repoUrl: "",
        createdAt: space.createdAt,
      };
      setProjects([project]);
      setSelectedProjectId(project.id);
    }).catch(() => {
      if (!cancelled) {
        setProjects([]);
        setSelectedProjectId("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedOut, requirementApiScope?.organizationId, requirementApiScope?.projectSpaceId]);

  // Redirect to first permitted tab if activeTab is not permitted for the current non-admin user
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin" && userGroups.length > 0) {
      const myGroup = userGroups.find(g => g.id === currentUser.group);
      if (myGroup && myGroup.permittedTabs) {
        const visibleMenus = systemConfig?.visibleMenus || ["overview", "requirement", "defect", "testcase", "metrics", "config"];
        const permitted = myGroup.permittedTabs.filter(tab => visibleMenus.includes(tab) && tab !== ProjectTab.CONFIG);

        if (permitted.length > 0 && !permitted.includes(activeTab)) {
          setActiveTab(permitted[0]);
        }
      }
    }
  }, [currentUser, userGroups, activeTab, systemConfig]);

  // Sync back on state mutations
  const updateProjects = (updated: Project[]) => {
    setProjects(updated);
  };

  const updateIssues = (updated: Issue[]) => {
    setIssues(updated);
  };

  const updateTestCases = (updated: TestCase[] | ((prev: TestCase[]) => TestCase[])) => {
    setTestCases((prev) => {
      const next = typeof updated === "function" ? updated(prev) : updated;
      return next;
    });
  };

  const updateFolders = (updated: Folder[]) => {
    setFolders(updated);
  };

  const updateSystemConfig = (updated: SystemConfig) => {
    setSystemConfig(updated);
  };

  // Triggering the generic express back API for multi-model invokes
  const handleInvokeAI = async (prompt: string): Promise<string> => {
    try {
      const activeProvider = systemConfig.activeModelProvider;
      const activeProviderConfig = systemConfig.modelConfigs[activeProvider];

      const res = await fetch("/api/ai/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          provider: activeProvider,
          config: activeProviderConfig,
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || errorData.details || "API Request Failed");
        } else {
          const textError = await res.text();
          throw new Error(`API Request Failed (Status ${res.status}): ${textError.substring(0, 150)}`);
        }
      }

      const responseJSON = await res.json();
      return responseJSON.text || "AI returns a blank response.";
    } catch (e: any) {
      console.error("AI Error:", e);
      throw e;
    }
  };

  /*
   * Notification delivery is intentionally unavailable until the server-side
   * outbox worker and encrypted channel configuration are implemented.
   * Never report a simulated delivery as successful.
   */
  const handleTriggerWebhook = async () => {
    return {
      success: false,
      skipped: true,
      message: "通知服务尚未启用。",
    };
  };


  const handleLoadDefaultPrompt = () => {
    const defaultTemplate = `你是一位顶尖的敏捷软件质控专家与资深测试架构师。针对以下提供的业务需求说明，进行高覆盖度的业务流演进与异常边界探索，并派生出一组标准回归用例。

【测试设计核心指导原则】
1. 核心流程覆盖（最高-P0）：覆盖 standard happy path 主链路验证特征。
2. 逆向与异常输入防线（高-P1）：包括非法参数、空值输入、逻辑拦截并触发报错行为。
3. 边界值挖掘（中-P2）：测试临界点、阈值限额、多状态交叉流转限制。
4. 交互环境约束（低-P3）：特定网络状态、缓存交互或特定前置角色登录权限隔离。

【输出标准 JSON 格式契约】
必须严格输出格式为原生的 JSON 数组格式，禁止包裹任何 \`\`\`json 标记，确保可通过 JSON.parse 解析：
[
  {
    "name": "用例标题描述(说明所覆盖场景及验证行为)",
    "grade": "最高-P0 或 高-P1 或 中-P2 或 低-P3",
    "precondition": "执行该测试前的核心依赖环境/初始状态/前置配置",
    "steps": "具体核心执行步骤以 1. 2. 3. 换行编写",
    "expectedResult": "对系统拦截或正常返回的具体可度量期望"
  }
]`;
    const updated = {
      ...systemConfig,
      aiPromptTemplate: defaultTemplate,
    };
    updateSystemConfig(updated);
    setIsPromptMissingOpen(false);
    alert("「默认高可靠敏捷质控策略」生成提示规范，已写入全局模型配置，即时生效！");
  };
  const handleCreateFeishuGroup = async () => ({
    success: false,
    message: "飞书群组集成尚未启用。",
  });

  // Helper actions

  const handleUpdateActiveProject = (updated: Project) => {
    const list = projects.map((p) => (p.id === updated.id ? updated : p));
    updateProjects(list);
  };

  // Issues manipulations
  const handleAddIssue = (created: Issue) => {
    updateIssues([...issues, created]);
  };

  const handleUpdateIssue = (updated: Issue) => {
    updateIssues(issues.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleDeleteIssue = (id: string) => {
    updateIssues(issues.filter((i) => i.id !== id));
  };

  // TestCase operations
  const handleAddTestCase = (tc: TestCase) => {
    updateTestCases((prev) => [...prev, tc]);
  };

  const handleUpdateTestCase = (updated: TestCase) => {
    updateTestCases((prev) => prev.map((tc) => (tc.id === updated.id ? updated : tc)));
  };

  const handleDeleteTestCase = (id: string) => {
    updateTestCases((prev) => prev.filter((tc) => tc.id !== id));
    // Clean up corresponding tracking data in issues (both source defect links and linkToTestCases)
    const updatedIssues = issues.map((issue) => {
      let changed = false;
      let newLinkToTestCases = issue.linkToTestCases;
      if (issue.linkToTestCases?.includes(id)) {
        newLinkToTestCases = issue.linkToTestCases.filter((tcId) => tcId !== id);
        changed = true;
      }
      if (changed) {
        return { ...issue, linkToTestCases: newLinkToTestCases };
      }
      return issue;
    });
    if (updatedIssues.some((ui, index) => ui !== issues[index])) {
      updateIssues(updatedIssues);
    }
  };

  const handleDeleteTestCaseBatch = (ids: string[]) => {
    updateTestCases(testCases.filter((tc) => !ids.includes(tc.id)));
    // Clean up corresponding tracking data in issues
    const updatedIssues = issues.map((issue) => {
      let changed = false;
      let newLinkToTestCases = issue.linkToTestCases;
      if (issue.linkToTestCases?.some(id => ids.includes(id))) {
        newLinkToTestCases = issue.linkToTestCases.filter((tcId) => !ids.includes(tcId));
        changed = true;
      }
      if (changed) {
        return { ...issue, linkToTestCases: newLinkToTestCases };
      }
      return issue;
    });
    if (updatedIssues.some((ui, index) => ui !== issues[index])) {
      updateIssues(updatedIssues);
    }
  };

  const handleAddTestCaseBatch = (casesList: TestCase[]) => {
    updateTestCases([...testCases, ...casesList]);
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const connectedRepository = requirementApiScope ? gitIntegration.repository : undefined;
  const displayedRepositoryType = connectedRepository
    ? connectedRepository.provider.toLowerCase()
    : requirementApiScope
      ? "none"
      : activeProject?.repoType || "none";
  const displayedDefaultBranch = connectedRepository?.defaultBranch || "main";

  return (
    <div className="min-h-screen bg-slate-50/10 text-slate-800 flex flex-col md:flex-row font-sans" id="veritab-app-root">
      {/* Sidebar navigation on the left */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setFocusedTestCaseId(null);
        }}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        systemModel={systemConfig.modelConfigs[systemConfig.activeModelProvider]?.name || systemConfig.activeModelProvider}
        currentUser={currentUser}
        onCurrentUserChange={handleCurrentUserChange}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenPersonalCenter={() => setIsPersonalCenterOpen(true)}
        onLogout={handleLogout}
        systemConfig={systemConfig}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={setIsSidebarCollapsed}
        userGroups={userGroups}
      />

      {/* Mobile Header indicator */}
      <div className="block md:hidden bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-slate-800 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold text-slate-800">Veritab AI</span>
          </div>

          <select
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700 max-w-[150px]"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name.substring(0, 12)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main dashboard content space on the right */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Upper contextual top-line info bar */}
        <header className="hidden md:flex h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/50 items-center justify-between shrink-0 z-10 shadow-3xs">
          <div className="flex items-center gap-3.5">
            {/* Workspace indicator */}
            <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-slate-600">
              <FolderGit2 className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">当前工作空间</span>
                <span className="text-slate-300">/</span>
                <span className="font-extrabold text-slate-800">
                  {activeProject ? activeProject.name : "未就绪"}
                </span>
              </div>
            </div>

            {/* Connection Status indicator */}
            {displayedRepositoryType !== "none" ? (
              <div className="flex items-center gap-2 text-xs bg-indigo-50/50 border border-indigo-100/60 px-3 py-1.5 rounded-xl text-indigo-700">
                <GitBranch className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="font-bold flex items-center gap-1">
                  <span>已连接 {displayedRepositoryType === "github" ? "GitHub" : displayedRepositoryType === "gitlab" ? "GitLab" : displayedRepositoryType}</span>
                  <span className="text-indigo-400/85 font-normal">分支主干</span>
                  <span className="font-mono bg-indigo-100/50 px-1.5 py-0.2 rounded text-[10px] text-indigo-800 font-bold ml-0.5">{displayedDefaultBranch}</span>
                </span>
                <span className="relative flex h-1.5 w-1.5 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-slate-600">
                <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-bold">未连接代码仓库</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 ml-1"></span>
              </div>
            )}
          </div>

          {/* Core system status indicators */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/95 text-slate-100 pl-3 pr-4 py-1.5 rounded-xl text-xs font-bold shadow-sm">
              <div className="bg-indigo-600 p-1 rounded-md shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-indigo-100 animate-pulse" />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] text-indigo-300 font-black uppercase tracking-wider">AI Engine</span>
                <span className="text-[10px] font-black tracking-tight mt-0.5">
                  {systemConfig.modelConfigs[systemConfig.activeModelProvider]?.name || systemConfig.activeModelProvider}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic tabs render content container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Suspense fallback={<div className="py-24 text-center text-sm font-bold text-slate-400">正在加载工作空间模块…</div>}>
          {activeProject ? (
            <div className="space-y-6">
              {activeTab === ProjectTab.OVERVIEW && (
                <ProjectSpace
                  project={activeProject}
                  onUpdateProject={handleUpdateActiveProject}
                  issues={issues}
                  testCases={testCases}
                  onInvokeAI={handleInvokeAI}
                  onAddTestCase={(tcData) => {
                    const newId = generateCaseId();
                    handleAddTestCase({
                      id: newId,
                      projectId: activeProject.id,
                      name: tcData.name || "新测试用例",
                      grade: tcData.grade || TestCaseGrade.P1,
                      status: tcData.status || TestCaseStatus.UNTESTED,
                      precondition: tcData.precondition || "",
                      steps: tcData.steps || "",
                      expectedResult: tcData.expectedResult || "",
                      historyLogs: tcData.historyLogs || []
                    } as any);
                  }}
                  currentUser={currentUser}
                  userGroups={userGroups}
                  apiScope={requirementApiScope}
                />
              )}

              {activeTab === ProjectTab.REQUIREMENT && (
                <RequirementsBoard
                  projectId={selectedProjectId}
                  issues={issues}
                  testCases={testCases}
                  users={users}
                  onAddIssue={handleAddIssue}
                  onUpdateIssue={handleUpdateIssue}
                  onDeleteIssue={handleDeleteIssue}
                  onDeleteTestCase={handleDeleteTestCase}
                  onInvokeAI={handleInvokeAI}
                  onTriggerWebhook={handleTriggerWebhook}
                  onCreateFeishuGroup={handleCreateFeishuGroup}
                  onAddTestCaseBatch={handleAddTestCaseBatch}
                  onNavigateToTab={setActiveTab}
                  onFocusTestCase={setFocusedTestCaseId}
                  focusedRequirementId={focusedTestCaseId}
                  onFocusRequirement={setFocusedTestCaseId}
                  systemConfig={systemConfig}
                  onPromptMissing={() => setIsPromptMissingOpen(true)}
                  onUpdateTestCase={handleUpdateTestCase}
                  currentUser={currentUser}
                  userGroups={userGroups}
                  apiScope={requirementApiScope}
                />
              )}

              {activeTab === ProjectTab.DEFECT && (
                <DefectsBoard
                  projectId={selectedProjectId}
                  issues={issues}
                  testCases={testCases}
                  users={users}
                  currentUser={currentUser}
                  onAddIssue={handleAddIssue}
                  onUpdateIssue={handleUpdateIssue}
                  onDeleteIssue={handleDeleteIssue}
                  onInvokeAI={handleInvokeAI}
                  onTriggerWebhook={handleTriggerWebhook}
                  onCreateFeishuGroup={handleCreateFeishuGroup}
                  systemConfig={systemConfig}
                  focusedDefectId={focusedTestCaseId}
                  onFocusDefect={setFocusedTestCaseId}
                  onUpdateTestCase={handleUpdateTestCase}
                  userGroups={userGroups}
                  apiScope={requirementApiScope}
                />
              )}

              {activeTab === ProjectTab.TESTCASE && (
                <TestCaseWorkspace
                  projectId={selectedProjectId}
                  testCases={testCases}
                  folders={folders}
                  issues={issues}
                  users={users}
                  currentUser={currentUser}
                  onAddTestCase={handleAddTestCase}
                  onUpdateTestCase={handleUpdateTestCase}
                  onDeleteTestCase={handleDeleteTestCase}
                  onDeleteTestCaseBatch={handleDeleteTestCaseBatch}
                  onUpdateFolders={updateFolders}
                  onAddIssue={handleAddIssue}
                  onInvokeAI={handleInvokeAI}
                  onTriggerWebhook={handleTriggerWebhook}
                  onCreateFeishuGroup={handleCreateFeishuGroup}
                  focusedTestCaseId={focusedTestCaseId}
                  onNavigateToTab={setActiveTab}
                  onFocusIssue={setFocusedTestCaseId}
                  systemConfig={systemConfig}
                  onSetSidebarCollapsed={setIsSidebarCollapsed}
                  userGroups={userGroups}
                  apiScope={requirementApiScope}
                />
              )}

              {activeTab === ProjectTab.CODE_CHANGES && (
                <CodeChangesBoard
                  project={projects.find((p) => p.id === selectedProjectId)!}
                  onUpdateProject={(p) =>
                    updateProjects(projects.map((proj) => (proj.id === p.id ? p : proj)))
                  }
                  issues={issues}
                  testCases={testCases}
                  onInvokeAI={handleInvokeAI}
                  onAddTestCase={(tc) => {
                    const newCase = { ...tc, id: generateCaseId() } as TestCase;
                    updateTestCases((prev) => [newCase, ...prev]);
                  }}
                  onAddIssue={handleAddIssue}
                  users={users}
                  currentUser={currentUser}
                  userGroups={userGroups}
                  apiScope={requirementApiScope}
                />
              )}

              {activeTab === ProjectTab.METRICS && (
                <MetricsDashboard
                  projects={projects}
                  issues={issues}
                  testCases={testCases}
                />
              )}

              {activeTab === ProjectTab.CONFIG && (
                <SystemConfigPanel
                  systemConfig={systemConfig}
                  onUpdateConfig={updateSystemConfig}
                  projects={projects}
                  currentUser={currentUser}
                  memberApiScope={{ organizationId: requirementApiScope!.organizationId }}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 animate-bounce">
                <BookmarkCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-md font-bold text-slate-800">未检测到有效工作空间</h2>
                <p className="text-xs text-slate-400 mt-1">当前账号尚未加入任何工作空间，请联系组织管理员。</p>
              </div>
            </div>
          )}
          </Suspense>
        </main>

        {/* Mobile footer navigation tray */}
        <div className="flex border-t border-slate-100 bg-white py-1 px-2 md:hidden sticky bottom-0 z-40 justify-between overflow-x-auto gap-0.5">
          {[
            { tab: ProjectTab.OVERVIEW, label: "概览", icon: FolderGit2 },
            { tab: ProjectTab.REQUIREMENT, label: "需求", icon: BookmarkCheck },
            { tab: ProjectTab.DEFECT, label: "缺陷", icon: AlertOctagon },
            { tab: ProjectTab.TESTCASE, label: "用例", icon: FileCheck2 },
            { tab: ProjectTab.CODE_CHANGES, label: "代码", icon: GitCommit },
            { tab: ProjectTab.METRICS, label: "度量", icon: BarChart4 },
            { tab: ProjectTab.CONFIG, label: "配置", icon: Settings },
          ].filter(({ tab }) => {
            if (tab === ProjectTab.CONFIG) {
              return currentUser.role === "admin";
            }
            const visibleMenus = systemConfig?.visibleMenus || ["overview", "requirement", "defect", "testcase", "metrics", "config"];
            return visibleMenus.includes(tab);
          }).map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFocusedTestCaseId(null);
              }}
              className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeTab === tab
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Minimal Bottom footer decoration block */}
        <footer className="border-t border-slate-200/40 bg-white py-4 text-center shrink-0">
          <p className="text-[10px] text-slate-400">
            Veritab AI @ 2026 敏捷质量追溯协同平台 — 智能闭环质控拦截决策中
          </p>
        </footer>

        <PromptMissingModal
          isOpen={isPromptMissingOpen}
          onClose={() => setIsPromptMissingOpen(false)}
          onLoadDefault={handleLoadDefaultPrompt}
          onGoToSettings={() => {
            setIsPromptMissingOpen(false);
            setActiveTab(ProjectTab.CONFIG);
          }}
        />

        <LoginModal
          isOpen={isLoginModalOpen || isLoggedOut}
          onClose={() => {
            if (!isLoggedOut) {
              setIsLoginModalOpen(false);
            }
          }}
          onLogin={handleCurrentUserChange}
          isForced={isLoggedOut}
        />

        <PersonalCenterModal
          isOpen={isPersonalCenterOpen}
          onClose={() => setIsPersonalCenterOpen(false)}
          currentUser={currentUser}
        />

      </div>
    </div>
  );
}
