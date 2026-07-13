import { useEffect, useState } from "react";
import { Building2, FolderKanban, Plus, Save } from "lucide-react";
import { Project } from "../types";

export interface OrganizationSummary { id: string; slug: string; name: string; version: number; _count?: { members: number; projectSpaces: number } }

export default function OrganizationSpaceSettings({ organization, organizations, project, projects, onSelectOrganization, onCreateOrganization, onSelectProject, onCreateProject, onUpdateOrganization, onUpdateProject, showToast }: {
  organization: OrganizationSummary;
  project: Project;
  onUpdateOrganization: (name: string) => Promise<void>;
  onUpdateProject: (input: { name: string; description: string }) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: (input: { name: string; key: string; description: string }) => Promise<void>;
  organizations: OrganizationSummary[];
  onSelectOrganization: (id: string) => void;
  onCreateOrganization: (name: string) => Promise<void>;
}) {
  const [organizationName, setOrganizationName] = useState(organization.name);
  const [spaceName, setSpaceName] = useState(project.name);
  const [spaceDescription, setSpaceDescription] = useState(project.description || "");
  const [saving, setSaving] = useState<"organization" | "space" | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSpace, setNewSpace] = useState({ name: "", key: "", description: "" });
  const [newOrganizationName, setNewOrganizationName] = useState("");
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
  const createSpace = async () => {
    setSaving("space");
    try { await onCreateProject({ ...newSpace, key: newSpace.key.toUpperCase() }); setNewSpace({ name: "", key: "", description: "" }); setCreating(false); showToast("项目空间已创建"); }
    catch (error) { showToast(error instanceof Error ? error.message : "项目空间创建失败", "error"); }
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-sm font-black text-slate-900">组织列表</h3><p className="mt-1 text-[10px] text-slate-400">系统共 {organizations.length} 个组织，切换后加载其项目与权限上下文</p></div><div className="flex gap-2"><input value={newOrganizationName} onChange={(event) => setNewOrganizationName(event.target.value)} placeholder="新组织名称" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><button disabled={newOrganizationName.trim().length < 2} onClick={() => void onCreateOrganization(newOrganizationName.trim()).then(() => setNewOrganizationName("")).catch((error) => showToast(error instanceof Error ? error.message : "组织创建失败", "error"))} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:opacity-50">添加组织</button></div></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="p-3">组织</th><th className="p-3">成员</th><th className="p-3">项目</th><th className="p-3">状态</th></tr></thead><tbody className="divide-y divide-slate-100">{organizations.map((item) => <tr key={item.id} onClick={() => onSelectOrganization(item.id)} className={`cursor-pointer ${item.id === organization.id ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}><td className="p-3"><div className="font-black text-slate-800">{item.name}</div><div className="font-mono text-[9px] text-slate-400">{item.slug}</div></td><td className="p-3">{item._count?.members ?? "—"}</td><td className="p-3">{item._count?.projectSpaces ?? "—"}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">启用</span></td></tr>)}</tbody></table></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">项目空间列表</h3><p className="mt-1 text-[10px] text-slate-400">当前组织共 {projects.length} 个有效项目空间</p></div><button onClick={() => setCreating((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"><Plus className="h-4 w-4" />新建空间</button></div>
      {creating && <div className="mt-4 grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 md:grid-cols-3"><input value={newSpace.name} onChange={(event) => setNewSpace({ ...newSpace, name: event.target.value })} placeholder="空间名称" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input value={newSpace.key} onChange={(event) => setNewSpace({ ...newSpace, key: event.target.value.toUpperCase() })} placeholder="空间 KEY" className="rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs uppercase" /><input value={newSpace.description} onChange={(event) => setNewSpace({ ...newSpace, description: event.target.value })} placeholder="空间描述（可选）" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><button disabled={saving !== null || newSpace.name.trim().length < 2 || !/^[A-Z][A-Z0-9]{1,15}$/.test(newSpace.key)} onClick={() => void createSpace()} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50 md:col-span-3">确认创建</button></div>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">{projects.map((item) => <button key={item.id} onClick={() => onSelectProject(item.id)} className={`rounded-xl border p-4 text-left transition ${item.id === project.id ? "border-indigo-300 bg-indigo-50/50" : "border-slate-100 hover:border-slate-300"}`}><div className="flex items-center justify-between"><span className="text-xs font-black text-slate-800">{item.name}</span><span className="rounded bg-slate-100 px-2 py-1 font-mono text-[9px] text-slate-500">{item.key}</span></div><p className="mt-2 line-clamp-2 text-[10px] text-slate-400">{item.description || "暂无描述"}</p></button>)}</div>
    </section>
  </div>;
}
