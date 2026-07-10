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
import { getStoredData, setStoredData } from "./lib/localStorage";
import Sidebar from "./components/Sidebar";
import FeishuNotifyModal from "./components/FeishuNotifyModal";
import PromptMissingModal from "./components/PromptMissingModal";
import AutoConfirmNotifyModal from "./components/AutoConfirmNotifyModal";
import LoginModal from "./components/LoginModal";
import PersonalCenterModal from "./components/PersonalCenterModal";
import { Sparkles, HelpCircle, BookmarkCheck, AlertOctagon, FolderGit2, FileCheck2, BarChart4, Settings, ShieldCheck, GitCommit, GitBranch, Globe } from "lucide-react";
import { generateCaseId } from "./lib/idUtils";
import { apiRequest, authApi, isRemoteApiMode } from "./api/httpClient";
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
  const remoteMode = isRemoteApiMode();
  const configuredApiScope: RequirementApiScope | undefined =
    isRemoteApiMode() && import.meta.env.VITE_ORGANIZATION_ID && import.meta.env.VITE_PROJECT_SPACE_ID
      ? {
          organizationId: import.meta.env.VITE_ORGANIZATION_ID,
          projectSpaceId: import.meta.env.VITE_PROJECT_SPACE_ID,
        }
      : undefined;
  const [requirementApiScope, setRequirementApiScope] = useState<RequirementApiScope | undefined>(configuredApiScope);
  const gitIntegration = useGitIntegrations(requirementApiScope);
  // Main loaded states from durable local persistence sandbox
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);

  const [currentUser, setCurrentUser] = useState<SystemUser>(() => {
    const anonymous: SystemUser = { id: "", username: "", nickname: "未登录", email: "", group: "server-managed", status: "active", role: "member" };
    return remoteMode ? anonymous : getStoredData<SystemUser>("veritab_current_user", anonymous);
  });

  const handleCurrentUserChange = (newUser: SystemUser) => {
    setCurrentUser(newUser);
    if (!remoteMode) setStoredData("veritab_current_user", newUser);
    setIsLoggedOut(false);
    if (!remoteMode) setStoredData("veritab_is_logged_out", false);
    setIsLoginModalOpen(false);
    setUsers(prev => {
      const exists = prev.some((user) => user.id === newUser.id);
      const updated = exists
        ? prev.map(u => u.id === newUser.id ? { ...u, nickname: newUser.nickname, email: newUser.email, feishuUserId: newUser.feishuUserId, wechatUserId: newUser.wechatUserId, dingtalkUserId: newUser.dingtalkUserId, role: newUser.role } : u)
        : [newUser, ...prev];
      if (!remoteMode) setStoredData("veritab_users", updated);
      return updated;
    });
  };

  const handleLogout = () => {
    if (remoteMode) void authApi.logout();
    setIsLoggedOut(true);
    if (!remoteMode) setStoredData("veritab_is_logged_out", true);
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    if (!remoteMode) return;
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

  const [feishuNotifyResult, setFeishuNotifyResult] = useState<any | null>(null);
  const [feishuNotifyPayload, setFeishuNotifyPayload] = useState<any | null>(null);
  const [isFeishuModalOpen, setIsFeishuModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPersonalCenterOpen, setIsPersonalCenterOpen] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(() => remoteMode || getStoredData<boolean>("veritab_is_logged_out", false));

  // Advanced Confirmation & Prompt Strategy config states
  const [isPromptMissingOpen, setIsPromptMissingOpen] = useState(false);
  const [pendingWebhook, setPendingWebhook] = useState<{
    provider: string;
    payload: any;
    resolve: (res: any) => void;
  } | null>(null);
  const [bypassNextConfirm, setBypassNextConfirm] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ProjectTab>(ProjectTab.OVERVIEW);
  const [focusedTestCaseId, setFocusedTestCaseId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    if (remoteMode) {
      // Remove legacy business fixtures once production API mode is enabled.
      ["veritab_projects", "veritab_users", "veritab_user_groups", "veritab_issues", "veritab_test_cases", "veritab_folders", "veritab_system_config", "veritab_current_user", "veritab_is_logged_out"].forEach((key) => localStorage.removeItem(key));
      setProjects([]);
      setUsers([]);
      setUserGroups([]);
      setIssues([]);
      setTestCases([]);
      setFolders([]);
      setSystemConfig(DEFAULT_SYSTEM_CONFIG);
      return;
    }
    const loadedProjects = getStoredData<Project[]>("veritab_projects", []);
    const loadedUsers = getStoredData<SystemUser[]>("veritab_users", []);
    const loadedGroups = getStoredData<UserGroup[]>("veritab_user_groups", []);
    const loadedIssues = getStoredData<Issue[]>("veritab_issues", []);
    const loadedTestCases = getStoredData<TestCase[]>("veritab_test_cases", []);
    const loadedFolders = getStoredData<Folder[]>("veritab_folders", []);
    const loadedConfig = getStoredData<SystemConfig>("veritab_system_config", DEFAULT_SYSTEM_CONFIG);

    // Safeguard: Ensure visibleMenus is present in some form in the loaded system configuration
    if (!loadedConfig.visibleMenus) {
      loadedConfig.visibleMenus = ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"];
      setStoredData("veritab_system_config", loadedConfig);
    } else if (!loadedConfig.visibleMenus.includes("code_changes")) {
      loadedConfig.visibleMenus.push("code_changes");
      setStoredData("veritab_system_config", loadedConfig);
    }

    setProjects(loadedProjects);
    setUsers(loadedUsers);
    setUserGroups(loadedGroups);
    setIssues(loadedIssues);
    setTestCases(loadedTestCases);
    setFolders(loadedFolders);
    setSystemConfig(loadedConfig);

    if (loadedProjects.length > 0) {
      setSelectedProjectId(loadedProjects[0].id);
    }
  }, [remoteMode]);

  useEffect(() => {
    if (!remoteMode || isLoggedOut || requirementApiScope) return;
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
  }, [remoteMode, isLoggedOut, requirementApiScope]);

  useEffect(() => {
    if (!remoteMode || isLoggedOut || !requirementApiScope) return;
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
  }, [remoteMode, isLoggedOut, requirementApiScope?.organizationId, requirementApiScope?.projectSpaceId]);

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
    if (!remoteMode) setStoredData("veritab_projects", updated);
  };

  const updateUsers = (updated: SystemUser[]) => {
    setUsers(updated);
    if (!remoteMode) setStoredData("veritab_users", updated);
  };

  const updateUserGroups = (updated: UserGroup[]) => {
    setUserGroups(updated);
    if (!remoteMode) setStoredData("veritab_user_groups", updated);
  };

  const updateIssues = (updated: Issue[]) => {
    setIssues(updated);
    if (!remoteMode) setStoredData("veritab_issues", updated);
  };

  const updateTestCases = (updated: TestCase[] | ((prev: TestCase[]) => TestCase[])) => {
    setTestCases((prev) => {
      const next = typeof updated === "function" ? updated(prev) : updated;
      if (!remoteMode) setStoredData("veritab_test_cases", next);
      return next;
    });
  };

  const updateFolders = (updated: Folder[]) => {
    setFolders(updated);
    if (!remoteMode) setStoredData("veritab_folders", updated);
  };

  const updateSystemConfig = (updated: SystemConfig) => {
    setSystemConfig(updated);
    if (!remoteMode) setStoredData("veritab_system_config", updated);
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

  // Helper to execute the actual fetch / trigger webhook logic
  const executeRealWebhook = async (provider: string, payload: any) => {
    if (provider !== "feishu" && provider !== "dingtalk" && provider !== "wechat") {
      return { success: true, message: "本地通知模拟发送成功。" };
    }
    try {
      let config = systemConfig.feishuConfig;
      if (provider === "dingtalk") config = systemConfig.dingtalkConfig;
      if (provider === "wechat") config = systemConfig.wechatConfig;

      const res = await fetch("/api/feishu/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          secret: config.secret,
          payload,
        }),
      });

      let resultData;
      if (res.ok) {
        resultData = await res.json();
      } else {
        resultData = { success: false, message: "后端 Webhook 转发路由请求异常。" };
      }

      // If it's a "feishu" broadcast, save results quietly, do not show popups
      if (provider === "feishu") {
        setFeishuNotifyResult({
          success: resultData.success,
          sentToUrl: config.webhookUrl,
          realSent: resultData.realSent,
          realError: resultData.realError,
          timestamp: resultData.timestamp || new Date().toISOString(),
          message: resultData.message,
        });
        setFeishuNotifyPayload(payload);
        // Popup removed in compliance with user request: '需求 、用例、缺陷 智能即时协同诊断中心弹窗去掉吧'
      }
      return resultData;
    } catch (e: any) {
      console.error("Failed to post mock notify webhook", e);
      const errRes = { success: false, message: e.message || "未知推送故障" };
      if (provider === "feishu") {
        setFeishuNotifyResult({
          success: false,
          sentToUrl: systemConfig.feishuConfig.webhookUrl,
          realSent: false,
          realError: e.message || "未知推送故障",
          timestamp: new Date().toISOString(),
          message: "推送链路网关错误",
        });
        setFeishuNotifyPayload(payload);
        // Popup removed in compliance with user request: '需求 、用例、缺陷 智能即时协同诊断中心弹窗去掉吧'
      }
      return errRes;
    }
  };

  // Webhook pushes simulation (Feishu integration sandbox check)
  const handleTriggerWebhook = async (provider: string, payload: any) => {
    if (provider !== "feishu" && provider !== "dingtalk" && provider !== "wechat") {
      console.log(`[Local Simulation] ${provider} channel successfully skipped external webhook and handled locally.`);
      return { success: true, message: "本地通知模拟发送成功。" };
    }

    let config = systemConfig.feishuConfig;
    if (provider === "dingtalk") config = systemConfig.dingtalkConfig;
    if (provider === "wechat") config = systemConfig.wechatConfig;

    // 1. Check if the channel itself is enabled
    if (!config || !config.enabled) {
      console.log(`[Webhook Intercept] Channel ${provider} is disabled.`);
      return { success: true, skipped: true, message: "该推送通道未启用。" };
    }

    // 2. Fine-grained event check
    if (payload?.isAutoTrigger) {
      const type = payload.type || "";
      if (type === "RequirementCreated" && config.notifyOnReqCreate === false) {
        console.log(`[Webhook Intercept] User disabled RequirementCreated for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截需求创建通知" };
      }
      if (type === "RequirementStatusChanged" && config.notifyOnReqChange === false) {
        console.log(`[Webhook Intercept] User disabled RequirementStatusChanged for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截需求状态/属性变更通知" };
      }
      if (type === "TestCaseCreated" && config.notifyOnCaseCreate === false) {
        console.log(`[Webhook Intercept] User disabled TestCaseCreated for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截用例生成/创建通知" };
      }
      if (type === "TestCaseStatusChanged" && config.notifyOnCaseChange === false) {
        console.log(`[Webhook Intercept] User disabled TestCaseStatusChanged for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截用例状态变动通知" };
      }
      if (type === "DefectCreated" && config.notifyOnDefectCreate === false) {
        console.log(`[Webhook Intercept] User disabled DefectCreated for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截新缺陷提报通知" };
      }
      if (type === "DefectStatusChanged" && config.notifyOnDefectChange === false) {
        console.log(`[Webhook Intercept] User disabled DefectStatusChanged for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截缺陷状态/属性变动通知" };
      }
      if (type === "CommentMention" && config.notifyOnCommentMention === false) {
        console.log(`[Webhook Intercept] User disabled CommentMention for ${provider}`);
        return { success: true, skipped: true, message: "已通过订阅设置自动拦截评论 @ 提及通知" };
      }
    }

    const isConfirmEnabled = systemConfig.enableAutoNotifyConfirm !== false;
    if (payload?.isAutoTrigger && isConfirmEnabled && !bypassNextConfirm) {
      return new Promise((resolve) => {
        setPendingWebhook({
          provider,
          payload,
          resolve,
        });
      });
    }
    return executeRealWebhook(provider, payload);
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

  const handleConfirmAutoWebhook = (bypassFuture: boolean) => {
    if (!pendingWebhook) return;
    const { provider, payload, resolve } = pendingWebhook;

    if (bypassFuture) {
      setBypassNextConfirm(true);
    }

    setPendingWebhook(null);
    executeRealWebhook(provider, payload).then((res) => {
      resolve(res);
    });
  };

  const handleCancelAutoWebhook = () => {
    if (!pendingWebhook) return;
    const { resolve } = pendingWebhook;
    setPendingWebhook(null);
    resolve({ success: true, skipped: true, message: "用户已取消自动消息卡片分发。" });
  };

  // One-click group pull simulator (Feishu applink & API integration)
  const handleCreateFeishuGroup = async (payload: {
    title: string;
    itemType: "Requirement" | "Defect" | "TestCase";
    itemId: string;
    itemTitle: string;
    members: any[];
  }) => {
    try {
      const config = systemConfig.feishuConfig;
      const res = await fetch("/api/feishu/create-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          title: payload.title,
          itemType: payload.itemType,
          itemId: payload.itemId,
          itemTitle: payload.itemTitle,
          members: payload.members,
        }),
      });

      let resultData;
      if (res.ok) {
        resultData = await res.json();
      } else {
        resultData = { success: false, message: "后端拉群接口请求异常。" };
      }

      setFeishuNotifyResult({
        success: resultData.success,
        sentToUrl: config.webhookUrl,
        realSent: resultData.realSent,
        realError: resultData.realError,
        timestamp: resultData.timestamp || new Date().toISOString(),
        message: resultData.message,
        isGroupCreate: true,
        groupName: resultData.groupName,
        joinLink: resultData.joinLink,
        groupId: resultData.groupId,
        membersPulled: payload.members,
      });

      // Simulates notification target body
      setFeishuNotifyPayload({
        title: resultData.groupName,
        type: payload.itemType,
        content: `专属研发协同保障群已创建上线！首批协作群成员：${payload.members.map((m: any) => "@" + m.nickname).join(", ")}`,
        link: resultData.joinLink,
        mentionsWithId: payload.members,
      });

      setIsFeishuModalOpen(true);
      return resultData;
    } catch (e: any) {
      console.error("Failed to create Feishu group", e);
      return { success: false, message: e.message || "未知拉群异常" };
    }
  };

  // Helper actions
  const handleAddNewProject = () => {
    const defaultProj: Project = {
      id: `proj-${Date.now()}`,
      name: "全新 AI 智能化微引擎项目 " + (projects.length + 1),
      description: "敏捷迭代推进中。利用 Veritab 质量双向追溯系统深度评估并全自动拦截仿真缺陷故障。",
      repoType: "none",
      repoUrl: "",
      createdAt: new Date().toISOString(),
      serviceProvider: "阿里云",
    };

    const nextList = [...projects, defaultProj];
    updateProjects(nextList);
    setSelectedProjectId(defaultProj.id);
    setActiveTab(ProjectTab.OVERVIEW);
  };

  const handleUpdateActiveProject = (updated: Project) => {
    const list = projects.map((p) => (p.id === updated.id ? updated : p));
    updateProjects(list);
  };

  // Users manipulations
  const handleAddUser = (created: SystemUser) => {
    updateUsers([...users, created]);
  };

  const handleDeleteUser = (id: string) => {
    updateUsers(users.filter(u => u.id !== id));
  };

  const handleToggleUserStatus = (id: string) => {
    updateUsers(
      users.map(u => u.id === id ? { ...u, status: u.status === "active" ? "disabled" : "active" } : u)
    );
  };

  const handleUpdateUser = (updated: SystemUser) => {
    updateUsers(users.map(u => u.id === updated.id ? updated : u));
  };

  // Groups manipulations
  const handleAddUserGroup = (created: UserGroup) => {
    updateUserGroups([...userGroups, created]);
  };

  const handleDeleteUserGroup = (id: string) => {
    // Prevent dangling users by assigning them to a fall-back group if required
    updateUserGroups(userGroups.filter(g => g.id !== id));
    updateUsers(users.map(u => u.group === id ? { ...u, group: "grp-dev" } : u));
  };

  const handleUpdateUserGroup = (updated: UserGroup) => {
    updateUserGroups(userGroups.map(g => g.id === updated.id ? updated : g));
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
        onNewProject={handleAddNewProject}
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
                  users={users}
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
                  users={users}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
                  onToggleUserStatus={handleToggleUserStatus}
                  onUpdateUser={handleUpdateUser}
                  userGroups={userGroups}
                  onAddUserGroup={handleAddUserGroup}
                  onDeleteUserGroup={handleDeleteUserGroup}
                  onUpdateUserGroup={handleUpdateUserGroup}
                  projects={projects}
                  currentUser={currentUser}
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
                <p className="text-xs text-slate-400 mt-1">点击上方 [新建空间] 按钮，一键初始化敏捷空间架构模型。</p>
              </div>
              <button
                onClick={handleAddNewProject}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-white px-5 py-3 shadow-md"
              >
                初始化默认工作空间
              </button>
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

        <FeishuNotifyModal
          isOpen={isFeishuModalOpen}
          onClose={() => setIsFeishuModalOpen(false)}
          result={feishuNotifyResult}
          payload={feishuNotifyPayload}
        />

        <PromptMissingModal
          isOpen={isPromptMissingOpen}
          onClose={() => setIsPromptMissingOpen(false)}
          onLoadDefault={handleLoadDefaultPrompt}
          onGoToSettings={() => {
            setIsPromptMissingOpen(false);
            setActiveTab(ProjectTab.CONFIG);
          }}
        />

        <AutoConfirmNotifyModal
          isOpen={!!pendingWebhook}
          provider={pendingWebhook?.provider || "feishu"}
          payload={pendingWebhook?.payload || null}
          onConfirm={handleConfirmAutoWebhook}
          onCancel={handleCancelAutoWebhook}
        />

        <LoginModal
          isOpen={isLoginModalOpen || isLoggedOut}
          onClose={() => {
            if (!isLoggedOut) {
              setIsLoginModalOpen(false);
            }
          }}
          users={users}
          userGroups={userGroups}
          currentUser={currentUser}
          onLogin={handleCurrentUserChange}
          isForced={isLoggedOut}
          systemConfig={systemConfig}
        />

        <PersonalCenterModal
          isOpen={isPersonalCenterOpen}
          onClose={() => setIsPersonalCenterOpen(false)}
          currentUser={currentUser}
          userGroups={userGroups}
          users={users}
          onUpdateUser={setCurrentUser}
          onUpdateUsersList={updateUsers}
        />

      </div>
    </div>
  );
}
