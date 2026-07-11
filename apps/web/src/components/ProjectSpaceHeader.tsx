/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormEvent, useEffect, useState } from "react";
import { Cpu, Settings2, X } from "lucide-react";
import { Project } from "../types";

interface ProjectSpaceHeaderProps {
  project: Project;
  onOpenReport: () => void;
  onUpdateProject: (input: { name: string; description: string }) => Promise<void>;
}

export default function ProjectSpaceHeader({ project, onOpenReport, onUpdateProject }: ProjectSpaceHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
  }, [project.id, project.name, project.description]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("空间名称至少需要 2 个字符。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onUpdateProject({ name: name.trim(), description: description.trim() });
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "空间更新失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="shrink-0 space-y-3" id="project-space-header-container">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50"><Cpu className="h-5 w-5 text-indigo-600" /></div>
            <h1 className="truncate text-base font-black tracking-tight text-slate-800">{project.name}</h1>
          </div>
          <p className="ml-12 line-clamp-1 text-xs text-slate-500">{project.description || "暂无项目描述"}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onOpenReport} className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">生成质量报告</button>
          <button type="button" onClick={() => { setEditing((value) => !value); setError(null); }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            {editing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}{editing ? "关闭" : "编辑空间"}
          </button>
        </div>
      </div>
      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">空间名称</span><input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /></label>
          <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">空间描述</span><textarea value={description} maxLength={2000} rows={3} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /></label>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
          <div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "保存中…" : "保存更改"}</button></div>
        </form>
      )}
    </div>
  );
}
