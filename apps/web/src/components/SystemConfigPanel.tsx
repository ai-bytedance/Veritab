/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  User as SystemUser,
  UserGroup,
  SystemConfig,
  Project
} from "../types";
import {
  Cpu,
  Settings,
  Save,
  ShieldCheck,
  CheckCircle,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  LayoutGrid,
  Info,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Brain,
  Bot,
  Zap,
  Globe,
  QrCode
} from "lucide-react";

import CustomSelect from "./CustomSelect";
import WebhookConfigSection from "./WebhookConfigSection";
import UserManagementSection from "./UserManagementSection";
import PromptTemplateSection from "./PromptTemplateSection";
import SsoConfigSection from "./SsoConfigSection";

// Official Logos using high-fidelity inline SVGs
const GeminiLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3C12 7.97 16.03 12 21 12C16.03 12 12 16.03 12 21C12 16.03 7.97 12 3 12C7.97 12 12 7.97 12 3Z" fill="url(#gemini-gradient)" />
    <defs>
      <linearGradient id="gemini-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4" />
        <stop offset="0.5" stopColor="#9B51E0" />
        <stop offset="1" stopColor="#E91E63" />
      </linearGradient>
    </defs>
  </svg>
);

const DeepSeekLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 7H13C15.76 7 18 9.24 18 12C18 14.76 15.76 17 13 17H8.5V7ZM10.5 9V15H12.5C14.16 15 15.5 13.66 15.5 12C15.5 10.34 14.16 9 12.5 9H10.5Z" fill="#1842F5" />
    <circle cx="12.5" cy="12" r="1.2" fill="#1842F5" />
  </svg>
);

const QwenLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#qwen-gradient)" />
    <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8Z" fill="white" fillOpacity="0.3" />
    <path d="M12 9.5C10.62 9.5 9.5 10.62 9.5 12C9.5 13.38 10.62 14.5 12 14.5C13.38 14.5 14.5 13.38 14.5 12C14.5 10.62 13.38 9.5 12 9.5Z" fill="white" />
    <defs>
      <linearGradient id="qwen-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6C5DD3" />
        <stop offset="1" stopColor="#FF754C" />
      </linearGradient>
    </defs>
  </svg>
);

const OpenAILogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.3 10.33a4.72 4.72 0 0 0-.27-2.6 4.88 4.88 0 0 0-1.74-2c-1.12-.7-2.45-.94-3.73-.66a4.8 4.8 0 0 0-2.88-1.57A4.95 4.95 0 0 0 9.8 4c-1.3-.12-2.6.22-3.64.96a4.87 4.87 0 0 0-2.22 3.1A4.85 4.85 0 0 0 3.7 11c-.08 1.32.33 2.61 1.15 3.63a4.75 4.75 0 0 0 1.9 1.84A4.88 4.88 0 0 0 10.48 17a4.84 4.84 0 0 0 2.92 1.62A4.9 4.9 0 0 0 16.3 18c1.3.11 2.58-.23 3.61-.96a4.88 4.88 0 0 0 2.22-3.1 4.8 4.8 0 0 0 .23-2.92c.07-1.32-.34-2.61-1.15-3.63V7.4l.09-.07zM12 14.88a2.88 2.88 0 1 1 2.88-2.88A2.88 2.88 0 0 1 12 14.88z" fill="#10A37F" />
  </svg>
);

const GrokLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="#0E1117" />
    <path d="M7 6.5H11.5L15 12L11.5 17.5H7L10.5 12L7 6.5Z" fill="#FFFFFF" />
    <path d="M17 6.5H12.5L9 12L12.5 17.5H17L13.5 12L17 6.5Z" fill="#FFFFFF" fillOpacity="0.5" />
  </svg>
);

const DoubaoLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#doubao-gradient)" />
    <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM10.5 11.5C10.5 11.22 10.72 11 11 11C11.28 11 11.5 11.22 11.5 11.5C11.5 11.78 11.28 12 11 12C10.72 12 10.5 11.78 10.5 11.5ZM13.5 11.5C13.5 11.22 13.72 11 14 11C14.28 11 14.5 11.22 14.5 11.5C14.5 11.78 14.28 12 14 12C13.72 12 13.5 11.78 13.5 11.5ZM12 15C10.62 15 9.5 13.88 9.5 13.5H14.5C14.5 13.88 13.38 15 12 15Z" fill="white" />
    <defs>
      <linearGradient id="doubao-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00E676" />
        <stop offset="1" stopColor="#00B0FF" />
      </linearGradient>
    </defs>
  </svg>
);

const ClaudeLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C10.5 2 9.2 3 9 4.5C8.1 4.1 7.1 4.2 6.4 4.9C5.7 5.6 5.6 6.7 6.1 7.5C4.6 7.7 3.5 9 3.5 10.5C3.5 12 4.6 13.3 6.1 13.5C5.6 14.3 5.7 15.4 6.4 16.1C7.1 16.8 8.1 16.9 9 16.5C9.2 18 10.5 19 12 19C13.5 19 14.8 18 15 16.5C15.9 16.9 16.9 16.8 17.6 16.1C18.3 15.4 18.4 14.3 17.9 13.5C19.4 13.3 20.5 12 20.5 10.5C20.5 9 19.4 7.7 17.9 7.5C18.4 6.7 18.3 5.6 17.6 4.9C16.9 4.2 15.9 4.1 15 4.5C14.8 3 13.5 2 12 2Z" fill="#CC6647" />
    <circle cx="12" cy="10.5" r="3" fill="#FFF5EE" fillOpacity="0.25" />
  </svg>
);

const ZhipuLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#zhipu-gradient)" />
    <path d="M15.5 8H8.5L14.5 14H8.5V16H15.5L9.5 10H15.5V8Z" fill="white" />
    <defs>
      <linearGradient id="zhipu-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#312E81" />
        <stop offset="0.5" stopColor="#3B82F6" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);

const CustomLogo = ({ className = "h-4.5 w-4.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

interface SystemConfigPanelProps {
  systemConfig: SystemConfig;
  onUpdateConfig: (cfg: SystemConfig) => void;
  users: SystemUser[];
  onAddUser: (u: SystemUser) => void;
  onDeleteUser: (id: string) => void;
  onToggleUserStatus: (id: string) => void;
  onUpdateUser: (u: SystemUser) => void;
  userGroups: UserGroup[];
  onAddUserGroup: (g: UserGroup) => void;
  onDeleteUserGroup: (id: string) => void;
  onUpdateUserGroup: (g: UserGroup) => void;
  projects: Project[];
  currentUser: SystemUser;
}

export default function SystemConfigPanel({
  systemConfig,
  onUpdateConfig,
  users,
  onAddUser,
  onDeleteUser,
  onToggleUserStatus,
  onUpdateUser,
  userGroups,
  onAddUserGroup,
  onDeleteUserGroup,
  onUpdateUserGroup,
  projects,
  currentUser,
}: SystemConfigPanelProps) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Tab State
  const [settingsTab, setSettingsTab] = useState<"project" | "ai" | "prompt" | "gateway" | "sso" | "navigation" | "users">("project");

  // Project Brand Info states
  const [projectName, setProjectName] = useState(systemConfig.projectName || "Veritab");
  const [projectDesc, setProjectDesc] = useState(systemConfig.projectDesc || "AI 协同质控大脑");

  React.useEffect(() => {
    setProjectName(systemConfig.projectName || "Veritab");
    setProjectDesc(systemConfig.projectDesc || "AI 协同质控大脑");
  }, [systemConfig.projectName, systemConfig.projectDesc]);

  // Provider states
  const [activeProvider, setActiveProvider] = useState(systemConfig.activeModelProvider);
  const [configs, setConfigs] = useState(() => {
    const originalConfigs = systemConfig.modelConfigs || {};
    const normalized: Record<string, any> = {};
    const providers = ["openai", "gemini", "claude", "grok", "deepseek", "qwen", "zhipu", "doubao", "custom"];
    providers.forEach(key => {
      const cfg = (originalConfigs[key] || {}) as any;
      let defaultEndpoint = "";
      let defaultSlug = "";
      if (key === "openai") { defaultEndpoint = "https://api.openai.com/v1"; defaultSlug = "gpt-4o"; }
      if (key === "gemini") { defaultEndpoint = ""; defaultSlug = "gemini-3.5-flash"; }
      if (key === "claude") { defaultEndpoint = "https://api.anthropic.com/v1"; defaultSlug = "claude-3-5-sonnet-latest"; }
      if (key === "grok") { defaultEndpoint = "https://api.x.ai/v1"; defaultSlug = "grok-2"; }
      if (key === "deepseek") { defaultEndpoint = "https://api.deepseek.com/v1"; defaultSlug = "deepseek-chat"; }
      if (key === "qwen") { defaultEndpoint = "https://dashscope.aliyuncs.com/compatible-mode/v1"; defaultSlug = "qwen-turbo"; }
      if (key === "zhipu") { defaultEndpoint = "https://open.bigmodel.cn/api/paas/v4"; defaultSlug = "glm-4-flash"; }
      if (key === "doubao") { defaultEndpoint = "https://ark.cn-beijing.volces.com/api/v3"; defaultSlug = "doubao-pro-4k"; }
      if (key === "custom") { defaultEndpoint = "https://api.openai-compatible.com/v1"; defaultSlug = "custom-generic-model"; }

      normalized[key] = {
        name: cfg.name || (key === "openai" ? "OpenAI" : key === "gemini" ? "Gemini" : key === "claude" ? "Claude" : key === "grok" ? "Grok" : key === "deepseek" ? "DeepSeek" : key === "qwen" ? "Qwen" : key === "zhipu" ? "Zhipu" : key === "doubao" ? "Doubao" : "Custom"),
        endpoint: cfg.endpoint || cfg.apiEndpoint || defaultEndpoint,
        apiEndpoint: cfg.endpoint || cfg.apiEndpoint || defaultEndpoint,
        apiKey: cfg.apiKey || "",
        modelSlug: cfg.modelSlug || cfg.modelName || defaultSlug,
        modelName: cfg.modelSlug || cfg.modelName || defaultSlug,
      };
    });
    return normalized;
  });
  const [visibleMenus, setVisibleMenus] = useState<string[]>(() => {
    const list = systemConfig.visibleMenus || ["overview", "requirement", "defect", "testcase", "code_changes", "metrics", "config"];
    if (!list.includes("code_changes")) {
      return [...list, "code_changes"];
    }
    return list;
  });

  React.useEffect(() => {
    setProjectName(systemConfig.projectName || "Veritab");
    setProjectDesc(systemConfig.projectDesc || "AI 协同质控大脑");
    if (systemConfig.visibleMenus) {
      const list = systemConfig.visibleMenus;
      if (!list.includes("code_changes")) {
        setVisibleMenus([...list, "code_changes"]);
      } else {
        setVisibleMenus(list);
      }
    }
  }, [systemConfig]);


  const handleToggleMenu = (menuKey: string) => {
    if (!isAdmin) {
      showToast("⚠️ 操作失败：只有管理员才能微调可见菜单。", "error");
      return;
    }
    if (menuKey === "config") {
      showToast("🔒 系统安全限制：系统配置与权限模块必须常驻，不可被隐藏。", "error");
      return;
    }

    setVisibleMenus(prev => {
      if (prev.includes(menuKey)) {
        if (prev.filter(x => x !== menuKey).length === 0) {
          showToast("⚠️ 请至少保留一个可见的主菜单看板。", "error");
          return prev;
        }
        return prev.filter(x => x !== menuKey);
      } else {
        return [...prev, menuKey];
      }
    });
  };

  const handleSaveMenuConfig = () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能微调全局可用导航菜单权限。", "error");
      return;
    }
    // Automatically force 'config' tab to remain in the stored menus
    const finalSet = new Set([...visibleMenus, "config"]);
    const savedList = Array.from(finalSet);

    onUpdateConfig({
      ...systemConfig,
      visibleMenus: savedList,
    });
    showToast("🟢 平台视图可用菜单及系统权限模块已成功更新！请刷新页面或点按即可完成自适应重载。", "success");
  };

  const handleSaveProjectInfo = () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能更新项目基本信息。", "error");
      return;
    }
    if (!projectName.trim()) {
      showToast("⚠️ 保存失败：项目名称不能为空！", "error");
      return;
    }
    onUpdateConfig({
      ...systemConfig,
      projectName: projectName.trim(),
      projectDesc: projectDesc.trim(),
    });
    showToast("🟢 项目基本信息已成功更新！", "success");
  };

  const handleSaveAIConfig = () => {
    if (!isAdmin) {
      showToast("⚠️ 保存失败：只有管理员才能更新底端模型网关设置！", "error");
      return;
    }
    onUpdateConfig({
      ...systemConfig,
      activeModelProvider: activeProvider,
      modelConfigs: configs,
    });
    showToast("🟢 AI 核心模型路由与密钥设置已成功上线生效！", "success");
  };

  const handleUpdateProviderField = (provider: string, field: string, val: string) => {
    setConfigs(prev => {
      const updatedProvider = { ...prev[provider] };
      updatedProvider[field] = val;

      // Keep endpoint/apiEndpoint and modelSlug/modelName synchronized!
      if (field === "endpoint" || field === "apiEndpoint") {
        updatedProvider.endpoint = val;
        updatedProvider.apiEndpoint = val;
      }

      if (field === "modelSlug" || field === "modelName") {
        updatedProvider.modelSlug = val;
        updatedProvider.modelName = val;
      }

      return {
        ...prev,
        [provider]: updatedProvider
      };
    });
  };

  const isAdmin = currentUser.role === "admin";

  return (
    <div className="space-y-6 w-full font-sans" id="system-config-container">
      {/* Premium fixed Top-Center Toast feedback */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-md shadow-xl animate-fade-in animate-in slide-in-from-top-4 duration-300 max-w-md w-[calc(100%-2rem)] md:w-max transition-all ${
          toast.type === "success"
            ? "bg-emerald-50/95 border-emerald-100 text-emerald-900 shadow-emerald-100/10"
            : "bg-rose-50/95 border-rose-100 text-rose-900 shadow-rose-100/10"
        }`}>
          <div className={`p-1.5 rounded-xl shrink-0 ${
            toast.type === "success"
              ? "bg-emerald-100 text-emerald-600"
              : "bg-rose-100 text-rose-600"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 text-xs font-bold leading-relaxed pr-1">
            {toast.message}
          </div>
        </div>
      )}

      {/* Tab Switcher Area */}
      <div className="flex items-center overflow-x-auto scrollbar-none border border-slate-200 bg-slate-100/70 p-1 rounded-2xl max-w-4xl w-full select-none gap-0.5">
        <button
          onClick={() => setSettingsTab("project")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "project"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <Info className="h-4 w-4" />
          <span>项目设置</span>
        </button>
        <button
          onClick={() => setSettingsTab("ai")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "ai"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>AI 智能大脑</span>
        </button>
        <button
          onClick={() => setSettingsTab("prompt")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "prompt"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>AI 指令模板</span>
        </button>
        <button
          onClick={() => setSettingsTab("gateway")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "gateway"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>推送网关</span>
        </button>
        <button
          onClick={() => setSettingsTab("sso")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "sso"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>三方登录</span>
        </button>
        <button
          onClick={() => setSettingsTab("navigation")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "navigation"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>可用菜单</span>
        </button>
        <button
          onClick={() => setSettingsTab("users")}
          className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            settingsTab === "users"
              ? "bg-white text-indigo-700 shadow-3xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>成员与群组</span>
        </button>
      </div>

      {settingsTab === "project" && (
        <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-project-tab">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Info className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  项目基本信息
                </h3>
                <p className="text-[11px] text-slate-400">
                  配置项目名称与描述，更新后同步展示在侧边栏和系统模块中。
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block pl-0.5">
                    项目名称 <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">必填</span>
                </div>
                <input
                  type="text"
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="请输入项目名称，如：Veritab"
                />
                <p className="text-[10px] text-slate-400 pl-0.5 leading-relaxed">
                  提示：此名称展示在左侧导航栏最上方，支持中文、英文及常用符号。
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block pl-0.5">
                    项目描述
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">可选</span>
                </div>
                <textarea
                  disabled={!isAdmin}
                  className="w-full h-24 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 leading-relaxed resize-none"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="请输入项目描述，如：AI 协同质控大脑"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-50">
              <span className="text-[10px] text-slate-400 font-medium">
                {!isAdmin && "只读模式：无权更新此配置。"}
              </span>
              <button
                onClick={handleSaveProjectInfo}
                disabled={!isAdmin}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>保存项目信息</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "ai" && (() => {
        const PREDEFINED_MODELS: Record<string, { label: string; value: string }[]> = {
          openai: [
            { label: "GPT-4o (gpt-4o)", value: "gpt-4o" },
            { label: "GPT-4o Mini (gpt-4o-mini)", value: "gpt-4o-mini" },
            { label: "o1-mini", value: "o1-mini" },
            { label: "o3-mini", value: "o3-mini" },
            { label: "GPT-4 Turbo (gpt-4-turbo)", value: "gpt-4-turbo" },
          ],
          gemini: [
            { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
            { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
            { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
            { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
            { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
            { label: "Gemini 3.5 Flash", value: "gemini-3.5-flash" },
          ],
          claude: [
            { label: "Claude 3.5 Sonnet (claude-3-5-sonnet-latest)", value: "claude-3-5-sonnet-latest" },
            { label: "Claude 3.5 Haiku (claude-3-5-haiku-latest)", value: "claude-3-5-haiku-latest" },
            { label: "Claude 3 Opus (claude-3-opus-20240229)", value: "claude-3-opus-20240229" },
          ],
          grok: [
            { label: "Grok 2 (grok-2)", value: "grok-2" },
            { label: "Grok 2 Vision (grok-2-vision)", value: "grok-2-vision" },
            { label: "Grok Beta (grok-beta)", value: "grok-beta" },
          ],
          deepseek: [
            { label: "DeepSeek-V3 (deepseek-chat)", value: "deepseek-chat" },
            { label: "DeepSeek-R1 (deepseek-reasoning)", value: "deepseek-reasoning" },
          ],
          qwen: [
            { label: "通义千问 Turbo (qwen-turbo)", value: "qwen-turbo" },
            { label: "通义千问 Plus (qwen-plus)", value: "qwen-plus" },
            { label: "通义千问 Max (qwen-max)", value: "qwen-max" },
            { label: "通义千问 Long (qwen-long)", value: "qwen-long" },
          ],
          zhipu: [
            { label: "GLM-4-Flash (glm-4-flash)", value: "glm-4-flash" },
            { label: "GLM-4-Plus (glm-4-plus)", value: "glm-4-plus" },
            { label: "GLM-4-Air (glm-4-air)", value: "glm-4-air" },
            { label: "GLM-4-0520 (glm-4-0520)", value: "glm-4-0520" },
          ],
          doubao: [
            { label: "豆包 Pro 4k (doubao-pro-4k)", value: "doubao-pro-4k" },
            { label: "豆包 Pro 32k (doubao-pro-32k)", value: "doubao-pro-32k" },
            { label: "豆包 Lite 4k (doubao-lite-4k)", value: "doubao-lite-4k" },
            { label: "豆包 Lite 32k (doubao-lite-32k)", value: "doubao-lite-32k" },
          ],
        };

        const predefinedForProvider = PREDEFINED_MODELS[activeProvider] || [];
        const currentModel = configs[activeProvider]?.modelSlug || configs[activeProvider]?.modelName || "";
        const isPredefined = predefinedForProvider.some(m => m.value === currentModel);
        const showCustomInput = !isPredefined || activeProvider === "custom";

        return (
          <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-ai-tab">

            {/* Module 1: AI Model configurations */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Cpu className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    AI 智能模型厂商配置
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    选择底层智能模型厂商，并配置或输入您需要使用的特定模型映射标识。
                  </p>
                </div>
              </div>

              {/* Model provider grid switch */}
              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
                {[
                  { id: "openai", label: "OpenAI", desc: "行业标杆", icon: OpenAILogo },
                  { id: "gemini", label: "Gemini", desc: "推荐 (托管)", icon: GeminiLogo },
                  { id: "claude", label: "Claude", desc: "学术级智能", icon: ClaudeLogo },
                  { id: "grok", label: "Grok", desc: "xAI智能", icon: GrokLogo },
                  { id: "deepseek", label: "DeepSeek", desc: "深度推理", icon: DeepSeekLogo },
                  { id: "qwen", label: "Qwen", desc: "通义千问", icon: QwenLogo },
                  { id: "zhipu", label: "Zhipu", desc: "智谱清言", icon: ZhipuLogo },
                  { id: "doubao", label: "Doubao", desc: "火山引擎", icon: DoubaoLogo },
                  { id: "custom", label: "Custom", desc: "兼容协议", icon: CustomLogo },
                ].map((p) => {
                  const isSelected = activeProvider === p.id;
                  const IconComp = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (!isAdmin) {
                          showToast("⚠️ 只读模式：普通成员无权切换大模型提供商！", "error");
                          return;
                        }
                        setActiveProvider(p.id);
                      }}
                      disabled={!isAdmin && !isSelected}
                      className={`rounded-xl border p-3 text-center transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-150 scale-[1.01]"
                          : "border-slate-150 bg-slate-50/20 text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50/50"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1 text-[7px] bg-white text-indigo-700 font-extrabold px-1 py-0.2 rounded shadow-3xs">
                          已选
                        </span>
                      )}
                      <div className="flex justify-center mb-1.5 mt-1">
                        <IconComp className={`h-6 w-6 ${isSelected ? "" : "text-indigo-500"}`} />
                      </div>
                      <div>
                        <div className="text-xs font-black truncate">{p.label}</div>
                        <div className={`text-[8px] mt-0.5 truncate font-medium ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                          {p.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Config Inputs customized below */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                    专属端点与密钥配置
                  </span>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black">
                    安全中转协议
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 block pl-0.5">接口端点地址</label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                      value={configs[activeProvider]?.endpoint || configs[activeProvider]?.apiEndpoint || ""}
                      onChange={(e) => handleUpdateProviderField(activeProvider, "endpoint", e.target.value)}
                      placeholder="https://api.example.com/v1"
                    />
                    <p className="text-[9px] text-slate-400 pl-0.5">
                      示例：https://api.openai.com/v1 或自定义代理网关地址。
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 block pl-0.5">使用智能模型</label>
                    {activeProvider !== "custom" ? (
                      <CustomSelect
                        disabled={!isAdmin}
                        value={isPredefined ? currentModel : "__custom__"}
                        onChange={(val) => {
                          if (val === "__custom__") {
                            handleUpdateProviderField(activeProvider, "modelSlug", "custom-model");
                          } else {
                            handleUpdateProviderField(activeProvider, "modelSlug", val);
                          }
                        }}
                        options={[
                          ...predefinedForProvider,
                          { value: "__custom__", label: "✍️ 自定义模型名称 / 手动输入..." }
                        ]}
                        activeBgClassName="bg-indigo-50/50"
                        activeTextClassName="text-indigo-700"
                      />
                    ) : (
                      <input
                        type="text"
                        disabled={!isAdmin}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                        value={currentModel}
                        onChange={(e) => handleUpdateProviderField(activeProvider, "modelSlug", e.target.value)}
                        placeholder="例如: llama-3-70b"
                      />
                    )}
                    <p className="text-[9px] text-slate-400 pl-0.5">
                      选择预置的核心模型或手动输入特定映射标识。
                    </p>
                  </div>

                  {/* Manual entry of custom model description */}
                  {showCustomInput && activeProvider !== "custom" && (
                    <div className="space-y-1.5 sm:col-span-2 animate-fade-in bg-indigo-50/20 border border-indigo-100/40 p-3 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-indigo-950 block">✍️ 请输入自定义模型名称</label>
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => {
                            const firstVal = predefinedForProvider[0]?.value || "";
                            handleUpdateProviderField(activeProvider, "modelSlug", firstVal);
                          }}
                          className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-850 cursor-pointer"
                        >
                          返回选择预设模型
                        </button>
                      </div>
                      <input
                        type="text"
                        disabled={!isAdmin}
                        className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-3xs outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400"
                        value={currentModel === "custom-model" ? "" : currentModel}
                        onChange={(e) => handleUpdateProviderField(activeProvider, "modelSlug", e.target.value)}
                        placeholder={
                          activeProvider === "gemini" ? "例如: gemini-2.5-flash-exp" :
                          activeProvider === "deepseek" ? "例如: deepseek-coder" :
                          activeProvider === "qwen" ? "例如: qwen-max-latest" :
                          activeProvider === "claude" ? "例如: claude-3-5-sonnet-20241022" :
                          activeProvider === "zhipu" ? "例如: glm-4-plus" :
                          activeProvider === "grok" ? "例如: grok-2-vision" :
                          activeProvider === "doubao" ? "例如: doubao-pro-32k" : "例如: gpt-4-32k"
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-600 block pl-0.5">接口密钥</label>
                    <input
                      type="password"
                      disabled={!isAdmin}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-855 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                      value={configs[activeProvider]?.apiKey || ""}
                      onChange={(e) => handleUpdateProviderField(activeProvider, "apiKey", e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <span className="text-[9.5px] text-slate-400 font-medium select-none block leading-normal mt-1 pl-0.5">
                      提示：所有密钥安全保存在服务端配置中，禁止浏览器脚本前端明文读取。
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-50">
                <span className="text-[10px] text-slate-400 font-medium">
                  {isAdmin ? "提示：模型网关配置保存后，将作为全站用例自动发散生成的底层驱动引擎。" : "只读模式：无权修改大语言模型密钥与端点配置。"}
                </span>
                <button
                  onClick={handleSaveAIConfig}
                  disabled={!isAdmin}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>保存网关配置</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {settingsTab === "prompt" && (
        <PromptTemplateSection
          systemConfig={systemConfig}
          onUpdateConfig={onUpdateConfig}
          isAdmin={isAdmin}
          showToast={showToast}
        />
      )}

      {settingsTab === "gateway" && (
        <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-gateway-tab">
          {/* Module 3 delegating webhook integrations */}
          <WebhookConfigSection
            systemConfig={systemConfig}
            onUpdateConfig={onUpdateConfig}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {settingsTab === "sso" && (
        <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-sso-tab">
          <SsoConfigSection
            systemConfig={systemConfig}
            onUpdateConfig={onUpdateConfig}
            isAdmin={isAdmin}
            users={users}
          />
        </div>
      )}

      {settingsTab === "navigation" && (
        <div className="space-y-6 max-w-4xl animate-fade-in animate-in fade-in duration-200" id="system-config-navigation-tab">
          {/* Module 2.5: Menu visibility settings */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 animate-fade-in" id="menu-visibility-container">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <LayoutGrid className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  导航菜单展示配置
                </h3>
                <p className="text-[11px] text-slate-400">
                  配置全局可见的功能菜单，可隐藏无需使用的模块以简化界面。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
              {[
                { key: "overview", name: "空间概览" },
                { key: "requirement", name: "需求管理" },
                { key: "defect", name: "缺陷追踪" },
                { key: "testcase", name: "测试用例" },
                { key: "code_changes", name: "代码追踪" },
                { key: "metrics", name: "质量度量" },
                { key: "config", name: "系统配置", locked: true },
              ].map((m) => {
                const isSelected = visibleMenus.includes(m.key);
                return (
                  <button
                    key={m.key}
                    disabled={!isAdmin || m.locked}
                    onClick={() => handleToggleMenu(m.key)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all relative flex items-center justify-between gap-3 ${
                      !isAdmin || m.locked ? "opacity-75" : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/20 text-teal-950"
                        : "border-slate-100 bg-slate-50/10 text-slate-700 hover:border-slate-200"
                    }`}
                  >
                    <span className="text-xs font-black">{m.name}</span>
                    <div>
                      {isSelected ? (
                        m.locked ? (
                          <span className="text-[8px] bg-slate-200 text-slate-600 font-extrabold px-1.5 py-0.5 rounded">
                            锁定常驻
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-teal-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-3xs">
                            <Eye className="h-2 w-2" />
                            显示中
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[8px] bg-slate-100 text-slate-400 font-extrabold px-1.5 py-0.5 rounded">
                          <EyeOff className="h-2 w-2" />
                          已隐藏
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-50">
              <span className="text-[10px] text-slate-400 font-medium">
                {isAdmin ? "提示：保存后将刷新全局侧边栏和可见功能模块。" : "只读模式：无权配置菜单显示范围。"}
              </span>
              <button
                onClick={handleSaveMenuConfig}
                disabled={!isAdmin}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold text-white px-5 py-2.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>保存菜单可见性</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "users" && (
        <div className="w-full animate-fade-in animate-in fade-in duration-200" id="system-config-users-tab">
          <UserManagementSection
            users={users}
            onAddUser={onAddUser}
            onDeleteUser={onDeleteUser}
            onToggleUserStatus={onToggleUserStatus}
            onUpdateUser={onUpdateUser}
            userGroups={userGroups}
            onAddUserGroup={onAddUserGroup}
            onDeleteUserGroup={onDeleteUserGroup}
            onUpdateUserGroup={onUpdateUserGroup}
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        </div>
      )}
    </div>
  );
}
