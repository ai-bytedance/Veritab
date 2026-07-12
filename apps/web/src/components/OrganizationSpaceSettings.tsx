import { useEffect, useState } from "react";
import { Building2, FolderKanban, Save } from "lucide-react";
import { Project } from "../types";

export interface OrganizationSummary { id: string; slug: string; name: string; version: number }

export default function OrganizationSpaceSettings({ organization, project, onUpdateOrganization, onUpdateProject, showToast }: {
  organization: OrganizationSummary;
  project: Project;
  onUpdateOrganization: (name: string) => Promise<void>;
  onUpdateProject: (input: { name: string; description: string }) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
  const [organizationName, setOrganizationName] = useState(organization.name);
  const [spaceName, setSpaceName] = useState(project.name);
  const [spaceDescription, setSpaceDescription] = useState(project.description || "");
  const [saving, setSaving] = useState<"organization" | "space" | null>(null);
  useEffect(() => setOrganizationName(organization.name), [organization.name]);
  useEffect(() => { setSpaceName(project.name); setSpaceDescription(project.description || ""); }, [project.name, project.description]);

  const saveOrganization = async () => {
    setSaving("organization");
    try { await onUpdateOrganization(organizationName.trim()); showToast("组织名称已更新"); }
    catch (error) { showToast(error instanceof Error ? error.message : "组织更新失败", "error"); }
    finally { setSaving(null); }
  };
  const saveSpace = async () => {
    setSaving("space");
    try { await onUpdateProject({ name: spaceName.trim(), description: spaceDescription.trim() }); showToast("项目空间已更新"); }
    catch (error) { showToast(error instanceof Error ? error.message : "项目空间更新失败", "error"); }
    finally { setSaving(null); }
  };

  return <div className="max-w-5xl space-y-5">
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">组织 / 项目空间</div>
      <h2 className="mt-2 text-xl font-black text-slate-900">管理研发协作层级</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">组织承载成员、权限和安全策略；项目空间承载需求、缺陷、用例与代码。默认项可修改名称，稳定标识保持不变。</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Building2 className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-900">组织</h3><p className="text-[10px] text-slate-400">成员、权限、通知与审计边界</p></div></div>
        <label className="space-y-2"><span className="text-xs font-bold text-slate-700">组织名称</span><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} minLength={2} maxLength={160} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-violet-500" /></label>
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2"><div className="text-[9px] font-bold uppercase text-slate-400">内部标识</div><div className="mt-1 font-mono text-xs text-slate-600">{organization.slug}</div></div>
        <button disabled={saving !== null || organizationName.trim().length < 2} onClick={() => void saveOrganization()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving === "organization" ? "保存中…" : "保存组织"}</button>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><FolderKanban className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-900">当前项目空间</h3><p className="text-[10px] text-slate-400">敏捷研发业务数据边界</p></div></div>
        <label className="space-y-2"><span className="text-xs font-bold text-slate-700">空间名称</span><input value={spaceName} onChange={(event) => setSpaceName(event.target.value)} minLength={2} maxLength={160} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500" /></label>
        <label className="mt-4 block space-y-2"><span className="text-xs font-bold text-slate-700">空间描述</span><textarea value={spaceDescription} onChange={(event) => setSpaceDescription(event.target.value)} maxLength={2000} className="h-20 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500" /></label>
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2"><div className="text-[9px] font-bold uppercase text-slate-400">空间 Key</div><div className="mt-1 font-mono text-xs text-slate-600">{project.key}</div></div>
        <button disabled={saving !== null || spaceName.trim().length < 2} onClick={() => void saveSpace()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving === "space" ? "保存中…" : "保存项目空间"}</button>
      </section>
    </div>
  </div>;
}
