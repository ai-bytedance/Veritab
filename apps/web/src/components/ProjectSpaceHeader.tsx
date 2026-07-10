/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Cpu, Sparkles, X, Settings2, Sliders } from "lucide-react";
import { Project, User, UserGroup, ProjectTab } from "../types";
import { checkPermission } from "../lib/permission";

interface ProjectSpaceHeaderProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenReport: () => void;
  currentUser?: User;
  userGroups?: UserGroup[];
}

export default function ProjectSpaceHeader({
  project,
  onUpdateProject,
  onOpenReport,
  currentUser,
  userGroups,
}: ProjectSpaceHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [repoType, setRepoType] = useState(project.repoType);
  const [repoUrl, setRepoUrl] = useState(project.repoUrl);
  const [serviceProvider, setServiceProvider] = useState(project.serviceProvider || "阿里云");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "error" | "success" | "warning" = "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const checkActionPermission = (action: "create" | "edit" | "delete") => {
    return checkPermission(currentUser || null, userGroups || [], ProjectTab.OVERVIEW, action);
  };

  const handleOpenReportSecure = () => {
    if (!checkActionPermission("create")) {
      showToast("⚠️ 您所属的工作群组无权进行“一键生成质量报告”操作！", "warning");
      return;
    }
    onOpenReport();
  };

  const handleToggleEditingSecure = () => {
    if (!isEditing && !checkActionPermission("edit")) {
      showToast("⚠️ 您所属的工作群组无权进行“编辑空间基本配置”操作！", "warning");
      return;
    }
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setRepoType(project.repoType);
    setRepoUrl(project.repoUrl);
    setServiceProvider(project.serviceProvider || "阿里云");
    setIsEditing(false);
  }, [project.id, project.name, project.description, project.repoType, project.repoUrl, project.serviceProvider]);

  const handleSave = () => {
    if (!checkActionPermission("edit")) {
      showToast("⚠️ 您所属的工作群组无权进行“保存空间更改”操作！", "warning");
      return;
    }
    if (!name.trim()) {
      alert("请输入项目名称");
      return;
    }
    onUpdateProject({
      ...project,
      name,
      description,
      repoType,
      repoUrl,
      serviceProvider,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 shrink-0" id="project-space-header-container">
      {/* Space Title Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shrink-0">
        <div className="space-y-1.5 flex-1 min-w-0 w-full">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-slate-800 truncate">
                {project.name}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1 ml-12">
            {project.description || "暂无项目描述"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={handleOpenReportSecure}
            className="px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white transition-all cursor-pointer"
          >
            一键生成质量报告
          </button>

          <button
            onClick={handleToggleEditingSecure}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              isEditing
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
            }`}
          >
            {isEditing ? (
              <>
                <X className="h-3.5 w-3.5" /> 关闭配置
              </>
            ) : (
              <>
                <Settings2 className="h-3.5 w-3.5" /> 空间配置
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Form Card rendered dynamically */}
      {isEditing && (
        <div className="bg-slate-50/50 rounded-2xl border border-slate-150 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-black text-slate-800">修改空间基本配置</h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">空间名称</label>
              <input
                type="text"
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 智能驾驶仿真平台"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">云端托管商</label>
              <select
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all font-medium"
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
              >
                <option value="阿里云">阿里云 (Alibaba Cloud)</option>
                <option value="腾讯云">腾讯云 (Tencent Cloud)</option>
                <option value="华为云">华为云 (Huawei Cloud)</option>
                <option value="微软 Azure">微软 Azure</option>
                <option value="亚马逊 AWS">亚马逊 AWS</option>
                <option value="本地部署">本地局域集群部署</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">空间描述与业务目标</label>
              <textarea
                rows={2}
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all font-medium"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话介绍项目的业务目标或测试覆盖标准..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">代码仓库类型</label>
              <select
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all font-medium"
                value={repoType}
                onChange={(e) => setRepoType(e.target.value as "github" | "gitlab" | "none")}
              >
                <option value="github">GitHub 托管模式</option>
                <option value="gitlab">GitLab 私有部署模式</option>
                <option value="none">无关联远程仓库</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">仓库链接地址</label>
              <input
                type="text"
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all font-medium"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/your-org/your-repo"
                disabled={repoType === "none"}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
            >
              保存空间更改
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl bg-amber-50 border-amber-200 text-amber-800 animate-slide-left">
          <span className="text-xs font-bold leading-none">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
