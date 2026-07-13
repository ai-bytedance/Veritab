import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { apiRequest } from "../../api/httpClient";
import { ApiOrganizationMember } from "../../features/members/api/types";
import { Project } from "../../types";
import type { OrganizationSummary } from "../OrganizationSpaceSettings";

interface RegisteredUser { id: string; username: string; displayName: string; email: string; status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"; organizationMembers: Array<{ organization: { id: string; name: string } }> }
type DrawerKind = "members" | "add-member" | "projects";

export default function OrganizationResourceDrawer({ organization, kind, onClose }: { organization: OrganizationSummary; kind: DrawerKind; onClose: () => void }) {
  const [members, setMembers] = useState<ApiOrganizationMember[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");
  const load = useCallback(async () => {
    if (kind === "projects") { setProjects(await apiRequest<Project[]>(`/organizations/${organization.id}/spaces`)); return; }
    const [memberRows, userRows] = await Promise.all([apiRequest<ApiOrganizationMember[]>(`/organizations/${organization.id}/members`), apiRequest<{ items: RegisteredUser[] }>("/users?limit=100")]);
    setMembers(memberRows); setUsers(userRows.items);
  }, [kind, organization.id]);
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "数据加载失败")); }, [load]);
  const memberIds = useMemo(() => new Set(members.map((item) => item.user.id)), [members]);
  const term = query.trim().toLowerCase();
  const visibleMembers = members.filter(({ user }) => `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(term));
  const visibleUsers = users.filter((user) => `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(term));
  const visibleProjects = projects.filter((item) => `${item.name} ${item.key} ${item.description || ""}`.toLowerCase().includes(term));
  const addMember = async (user: RegisteredUser) => {
    setSavingId(user.id);
    try { await apiRequest(`/organizations/${organization.id}/members`, { method: "POST", body: JSON.stringify({ userId: user.id }) }); setMessage(`${user.displayName} 已加入组织`); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "添加失败"); }
    finally { setSavingId(""); }
  };
  const title = kind === "projects" ? "项目列表" : kind === "add-member" ? "添加用户" : "成员列表";
  const placeholder = kind === "projects" ? "搜索项目名称或 Key" : "搜索姓名、账号或邮箱";
  return <div className="fixed inset-0 z-[130] bg-slate-900/30" onMouseDown={onClose}><aside className="ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
    <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><div><h3 className="text-base font-black text-slate-900">{title} <span className="font-medium text-slate-400">（{organization.name}）</span></h3><p className="mt-1 text-xs text-slate-400">{kind === "projects" ? "查看当前组织下的项目空间" : "系统账号只能归属一个组织"}</p></div><button onClick={onClose} aria-label="关闭抽屉" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></header>
    <div className="flex justify-end px-6 py-4"><label className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none ring-indigo-200 focus:ring-2"/></label></div>
    {message && <div className="mx-6 mb-3 rounded-xl bg-indigo-50 px-4 py-2.5 text-xs text-indigo-700">{message}</div>}
    <div className="flex-1 overflow-auto px-6 pb-6">
      {kind === "projects" ? <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">空间 Key</th><th>项目名称</th><th>状态</th><th>描述</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleProjects.map((item) => <tr key={item.id}><td className="px-4 py-4 font-mono text-indigo-600">{item.key}</td><td className="font-bold">{item.name}</td><td><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">启用</span></td><td className="max-w-xs truncate text-slate-500">{item.description || "—"}</td></tr>)}</tbody></table>
      : kind === "members" ? <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">姓名 / 账号</th><th>角色</th><th>邮箱</th><th>状态</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleMembers.map(({ user, status }) => <tr key={user.id}><td className="px-4 py-4 font-bold">{user.displayName}<div className="font-mono text-[10px] font-normal text-slate-400">@{user.username}</div></td><td>{user.roleBindings.some((item) => item.scopeType === "ORGANIZATION" && item.role.code === "org_admin") ? "系统管理员" : "普通用户"}</td><td className="text-slate-500">{user.email || "—"}</td><td className="text-emerald-600">{status === "ACTIVE" ? "启用" : "停用"}</td></tr>)}</tbody></table>
      : <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">姓名 / 账号</th><th>邮箱</th><th>归属组织</th><th className="pr-4 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleUsers.map((user) => { const assigned = user.organizationMembers[0]; const inCurrent = memberIds.has(user.id); return <tr key={user.id}><td className="px-4 py-4 font-bold">{user.displayName}<div className="font-mono text-[10px] font-normal text-slate-400">@{user.username}</div></td><td className="text-slate-500">{user.email || "—"}</td><td>{assigned?.organization.name || "未归属"}</td><td className="pr-4 text-right">{inCurrent ? <span className="text-emerald-600">已添加</span> : assigned ? <span className="text-slate-400">不可添加</span> : <button disabled={savingId === user.id} onClick={() => void addMember(user)} className="inline-flex items-center gap-1 font-bold text-indigo-600 disabled:opacity-50"><UserPlus className="h-3.5 w-3.5"/>添加</button>}</td></tr>; })}</tbody></table>}
    </div>
  </aside></div>;
}
