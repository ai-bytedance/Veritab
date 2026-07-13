import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { apiRequest } from "../../api/httpClient";
import { ApiOrganizationMember } from "../../features/members/api/types";
import { Project } from "../../types";

interface ProjectMember { status: "ACTIVE" | "SUSPENDED"; user: { id: string; username: string; displayName: string; email: string } }

export default function ProjectMemberDrawer({ organizationId, project, adding, onClose }: { organizationId: string; project: Project; adding: boolean; onClose: () => void }) {
  const root = `/organizations/${organizationId}/spaces/${project.id}`;
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pool, setPool] = useState<ApiOrganizationMember[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const [rows, organizationMembers] = await Promise.all([apiRequest<ProjectMember[]>(`${root}/members`), apiRequest<ApiOrganizationMember[]>(`/organizations/${organizationId}/members`)]); setMembers(rows); setPool(organizationMembers); }, [organizationId, root]);
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "成员加载失败")); }, [load]);
  const memberIds = useMemo(() => new Set(members.map((item) => item.user.id)), [members]);
  const term = query.trim().toLowerCase();
  const rows = (adding ? pool.map((item) => ({ status: item.status, user: item.user })) : members).filter(({ user }) => `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(term));
  const add = async (userId: string) => { try { await apiRequest(`${root}/members`, { method: "POST", body: JSON.stringify({ userId }) }); setMessage("成员已加入项目"); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "添加失败"); } };
  return <div className="fixed inset-0 z-[130] bg-slate-900/30" onMouseDown={onClose}><aside className="ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><div><h3 className="font-black">{adding ? "添加项目成员" : "项目成员"} <span className="font-medium text-slate-400">（{project.name}）</span></h3><p className="mt-1 text-xs text-slate-400">成员必须先属于当前组织</p></div><button onClick={onClose} aria-label="关闭项目成员抽屉" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></header><div className="flex justify-end px-6 py-4"><label className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、账号或邮箱" className="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-200"/></label></div>{message && <div className="mx-6 mb-3 rounded-xl bg-indigo-50 px-4 py-2 text-xs text-indigo-700">{message}</div>}<div className="flex-1 overflow-auto px-6 pb-6"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">成员</th><th>邮箱</th><th>状态</th>{adding && <th className="pr-4 text-right">操作</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(({ user, status }) => <tr key={user.id}><td className="px-4 py-4 font-bold">{user.displayName}<div className="font-mono text-[10px] font-normal text-slate-400">@{user.username}</div></td><td className="text-slate-500">{user.email || "—"}</td><td className="text-emerald-600">{status === "ACTIVE" ? "启用" : "停用"}</td>{adding && <td className="pr-4 text-right">{memberIds.has(user.id) ? <span className="text-emerald-600">已添加</span> : <button onClick={() => void add(user.id)} className="inline-flex items-center gap-1 font-bold text-indigo-600"><UserPlus className="h-3.5 w-3.5"/>添加</button>}</td>}</tr>)}</tbody></table></div></aside></div>;
}
