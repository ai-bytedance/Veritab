import { FormEvent, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Project, User } from "../types";
import OrganizationResourceDrawer from "./tenant/OrganizationResourceDrawer";
import ProjectMemberDrawer from "./tenant/ProjectMemberDrawer";
import ProjectRoleManagement from "./tenant/ProjectRoleManagement";
import TenantMemberManagement from "./tenant/TenantMemberManagement";

export interface OrganizationSummary {
  id: string; slug: string; name: string; status?: "ACTIVE" | "DISABLED"; version: number; createdAt?: string;
  auditLogs?: Array<{ actor: { id: string; displayName: string; username: string } | null }>;
  _count?: { members: number; projectSpaces: number };
}
type Tab = "organizations" | "projects" | "roles" | "members";
type Editor = "create-organization" | "edit-organization" | "create-project" | "edit-project" | null;
type ResourceDrawer = { organization: OrganizationSummary; kind: "members" | "add-member" | "projects" } | null;
type ProjectDrawer = { project: Project; adding: boolean } | null;

interface Props {
  organization: OrganizationSummary; organizations: OrganizationSummary[]; project: Project; projects: Project[]; currentUser: User;
  onUpdateOrganization: (name: string, status?: "ACTIVE" | "DISABLED") => Promise<void>;
  onUpdateProject: (input: { name: string; description: string; status?: "ACTIVE" | "DISABLED" }) => Promise<void>;
  onSelectProject: (id: string) => void; onCreateProject: (input: { name: string; description: string }) => Promise<void>; onDeleteProject: (id: string) => Promise<void>;
  onSelectOrganization: (id: string) => void; onCreateOrganization: (name: string) => Promise<void>; onDeleteOrganization: (id: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
}

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function OrganizationSpaceSettings(props: Props) {
  const { organization, organizations, project, projects, currentUser, showToast } = props;
  const [tab, setTab] = useState<Tab>("organizations");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Editor>(null);
  const [drawer, setDrawer] = useState<ResourceDrawer>(null);
  const [projectDrawer, setProjectDrawer] = useState<ProjectDrawer>(null);
  const [saving, setSaving] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [spaceDraft, setSpaceDraft] = useState({ name: "", description: "" });
  const tabs: Array<[Tab, string]> = [["organizations", "组织管理"], ["projects", "项目空间"], ["roles", "角色权限"], ["members", "成员管理"]];
  const orgRows = organizations.filter((item) => `${item.name} ${item.slug} ${item.id}`.toLowerCase().includes(query.toLowerCase()));
  const projectRows = projects.filter((item) => `${item.name} ${item.key} ${item.id}`.toLowerCase().includes(query.toLowerCase()));

  const openEditor = (kind: Editor, item?: OrganizationSummary | Project) => {
    setEditor(kind);
    if (kind?.includes("organization")) setOrganizationName(item && "slug" in item ? item.name : "");
    else setSpaceDraft(item && "key" in item ? { name: item.name, description: item.description || "" } : { name: "", description: "" });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!editor) return; setSaving(true);
    try {
      if (editor === "create-organization") await props.onCreateOrganization(organizationName.trim());
      if (editor === "edit-organization") await props.onUpdateOrganization(organizationName.trim());
      if (editor === "create-project") await props.onCreateProject(spaceDraft);
      if (editor === "edit-project") await props.onUpdateProject({ name: spaceDraft.name.trim(), description: spaceDraft.description.trim() });
      showToast(editor.startsWith("create") ? "创建成功" : "保存成功"); setEditor(null);
    } catch (error) { showToast(error instanceof Error ? error.message : "操作失败", "error"); } finally { setSaving(false); }
  };
  const confirmDeleteOrganization = async (item: OrganizationSummary) => { if (!window.confirm(`确认删除组织“${item.name}”？此操作不可撤销。`)) return; try { await props.onDeleteOrganization(item.id); showToast("组织已删除"); } catch (error) { showToast(error instanceof Error ? error.message : "删除失败", "error"); } };
  const confirmDeleteProject = async (item: Project) => { if (!window.confirm(`确认删除项目“${item.name}”？`)) return; try { await props.onDeleteProject(item.id); showToast("项目已删除"); } catch (error) { showToast(error instanceof Error ? error.message : "删除失败", "error"); } };

  return <div className="space-y-4">
    <nav className="flex flex-wrap gap-1 rounded-2xl bg-slate-100/80 p-1">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-5 py-2.5 text-xs font-black ${tab === id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</nav>
    {(tab === "organizations" || tab === "projects") && <div className="flex justify-end gap-2 rounded-2xl bg-white px-5 py-4 shadow-sm"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或 ID" className="rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-200"/></label><button onClick={() => openEditor(tab === "organizations" ? "create-organization" : "create-project")} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4"/>新增{tab === "organizations" ? "组织" : "项目"}</button></div>}

    {tab === "organizations" && <section className="overflow-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[1200px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">ID</th><th>组织名称</th><th>成员</th><th>项目</th><th>状态</th><th>创建人</th><th>创建时间</th><th className="pr-5 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{orgRows.map((item) => <tr key={item.id} className={item.id === organization.id ? "bg-indigo-50/40" : "hover:bg-slate-50/60"}><td className="px-5 py-4 font-mono text-[10px] text-slate-500">{item.id}</td><td className="font-bold">{item.name}<div className="font-mono text-[10px] font-normal text-slate-400">{item.slug}</div></td><td><button onClick={() => { props.onSelectOrganization(item.id); setDrawer({ organization: item, kind: "members" }); }} className="rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">{item._count?.members ?? 0}</button></td><td><button onClick={() => { props.onSelectOrganization(item.id); setDrawer({ organization: item, kind: "projects" }); }} className="rounded-lg bg-cyan-50 px-2.5 py-1 font-bold text-cyan-700">{item._count?.projectSpaces ?? 0}</button></td><td><button onClick={() => { props.onSelectOrganization(item.id); void props.onUpdateOrganization(item.name, item.status === "DISABLED" ? "ACTIVE" : "DISABLED"); }} className={item.status === "DISABLED" ? "text-rose-600" : "text-emerald-600"}>{item.status === "DISABLED" ? "禁用" : "启用"}</button></td><td>{item.auditLogs?.[0]?.actor?.displayName || "系统"}</td><td className="text-slate-500">{formatDate(item.createdAt)}</td><td className="pr-5 text-right"><button onClick={() => { props.onSelectOrganization(item.id); setDrawer({ organization: item, kind: "add-member" }); }} className="font-bold text-violet-600">添加用户</button><button onClick={() => { props.onSelectOrganization(item.id); openEditor("edit-organization", item); }} className="ml-4 inline-flex items-center gap-1 text-slate-500"><Pencil className="h-3.5 w-3.5" />编辑</button>{item.slug !== "default" && <button onClick={() => void confirmDeleteOrganization(item)} className="ml-4 inline-flex items-center gap-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" />删除</button>}</td></tr>)}</tbody></table></section>}

    {tab === "projects" && <section className="overflow-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[1400px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">ID</th><th>项目名称</th><th>成员</th><th>所属组织</th><th>状态</th><th>创建人</th><th>创建时间</th><th>描述</th><th className="pr-5 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{projectRows.map((item) => <tr key={item.id} className={item.id === project.id ? "bg-indigo-50/40" : "hover:bg-slate-50/60"}><td className="px-5 py-4 font-mono text-[10px] text-slate-500">{item.id}</td><td className="font-bold">{item.name}<div className="font-mono text-[10px] font-normal text-slate-400">{item.key}</div></td><td><button onClick={() => setProjectDrawer({ project: item, adding: false })} className="rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">{item._count?.members ?? 0}</button></td><td>{item.organization?.name || organization.name}</td><td><button onClick={() => { props.onSelectProject(item.id); void props.onUpdateProject({ name: item.name, description: item.description, status: item.status === "DISABLED" ? "ACTIVE" : "DISABLED" }); }} className={item.status === "DISABLED" ? "text-rose-600" : "text-emerald-600"}>{item.status === "DISABLED" ? "禁用" : "启用"}</button></td><td>{item.auditLogs?.[0]?.actor?.displayName || "系统"}</td><td className="text-slate-500">{formatDate(item.createdAt)}</td><td className="max-w-xs truncate text-slate-500">{item.description || "—"}</td><td className="pr-5 text-right"><button onClick={() => setProjectDrawer({ project: item, adding: true })} className="font-bold text-violet-600">添加成员</button><button onClick={() => { props.onSelectProject(item.id); openEditor("edit-project", item); }} className="ml-4 text-slate-500">编辑</button><button onClick={() => void confirmDeleteProject(item)} className="ml-4 text-rose-600">删除</button></td></tr>)}</tbody></table></section>}

    {tab === "roles" && <ProjectRoleManagement organizationId={organization.id} project={project} onAddUser={() => setDrawer({ organization, kind: "add-member" })}/>}
    {tab === "members" && <TenantMemberManagement organizationId={organization.id} currentUser={currentUser} />}
    {drawer && <OrganizationResourceDrawer organization={drawer.organization} kind={drawer.kind} onClose={() => setDrawer(null)} />}
    {projectDrawer && <ProjectMemberDrawer organizationId={organization.id} project={projectDrawer.project} adding={projectDrawer.adding} onClose={() => setProjectDrawer(null)} />}
    {editor && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex justify-between px-6 py-4"><div><h3 className="font-black">{editor.startsWith("create") ? "新增" : "编辑"}{editor.includes("organization") ? "组织" : "项目空间"}</h3><p className="mt-1 text-xs text-slate-400">{editor.includes("organization") ? "组织 ID 由系统自动生成" : "项目 ID 与 Key 由系统自动生成"}</p></div><button type="button" onClick={() => setEditor(null)}><X className="h-4 w-4" /></button></header><div className="grid gap-4 bg-slate-50/60 p-6">{editor.includes("organization") ? <input autoFocus required minLength={2} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="组织名称" className="rounded-xl bg-white px-3 py-2.5 text-xs outline-none shadow-sm" /> : <><input autoFocus required minLength={2} value={spaceDraft.name} onChange={(event) => setSpaceDraft({ ...spaceDraft, name: event.target.value })} placeholder="项目名称" className="rounded-xl bg-white px-3 py-2.5 text-xs outline-none shadow-sm" /><textarea value={spaceDraft.description} onChange={(event) => setSpaceDraft({ ...spaceDraft, description: event.target.value })} placeholder="项目描述" className="h-24 resize-none rounded-xl bg-white px-3 py-2.5 text-xs outline-none shadow-sm" /></>}</div><footer className="flex justify-end gap-2 px-6 py-4"><button type="button" onClick={() => setEditor(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs">取消</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white">确认保存</button></footer></form></div>}
  </div>;
}
