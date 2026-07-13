import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Search, UserPlus, X } from "lucide-react";
import { apiRequest } from "../api/httpClient";
import { ApiRole } from "../features/members/api/types";

interface RegisteredUser {
  id: string; username: string; displayName: string; email: string; feishuUserId: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"; isSystemAdmin: boolean; version: number; lastLoginAt: string | null;
  organizationMembers: Array<{ organization: { id: string; name: string } }>;
  groupMembers: Array<{ group: { id: string; name: string } }>;
}

export default function SystemUserRegistry({ organizationId, currentUserId, roles }: { organizationId: string; currentUserId: string; roles: ApiRole[] }) {
  const roleOptions = roles.filter((role) => role.code !== "space_admin");
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "", feishuUserId: "", roleCode: "org_admin" });
  const [editing, setEditing] = useState<RegisteredUser | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", email: "", feishuUserId: "" });

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (query.trim()) params.set("q", query.trim());
    const result = await apiRequest<{ items: RegisteredUser[] }>(`/users?${params}`);
    setUsers(result.items);
  }, [query]);
  useEffect(() => { const timer = setTimeout(() => void load().catch((error) => setMessage(error instanceof Error ? error.message : "用户加载失败")), 250); return () => clearTimeout(timer); }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      const created = await apiRequest<RegisteredUser>("/users", { method: "POST", body: JSON.stringify({ ...form, feishuUserId: form.feishuUserId || undefined }) });
      await apiRequest(`/organizations/${organizationId}/members`, { method: "POST", body: JSON.stringify({ userId: created.id, roleCode: form.roleCode }) });
      setForm({ username: "", displayName: "", email: "", password: "", feishuUserId: "", roleCode: roleOptions[0]?.code || "org_admin" });
      setShowCreate(false); setMessage("注册用户已创建并加入当前组织"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "用户创建失败"); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (user: RegisteredUser) => {
    setSaving(true); setMessage(null);
    try {
      await apiRequest(`/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ version: user.version, status: user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE" }) });
      await load(); setMessage(user.status === "ACTIVE" ? "账号已禁用，现有会话将失效" : "账号已启用");
    } catch (error) { setMessage(error instanceof Error ? error.message : "状态更新失败"); }
    finally { setSaving(false); }
  };
  const startEdit = (user: RegisteredUser) => { setEditing(user); setEditForm({ displayName: user.displayName, email: user.email, feishuUserId: user.feishuUserId || "" }); };
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault(); if (!editing) return; setSaving(true); setMessage(null);
    try { await apiRequest(`/users/${editing.id}`, { method: "PATCH", body: JSON.stringify({ version: editing.version, ...editForm }) }); setEditing(null); await load(); setMessage("用户资料已更新"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "用户更新失败"); }
    finally { setSaving(false); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
      <div><h3 className="text-sm font-black text-slate-900">系统注册成员名册</h3><p className="mt-1 text-[11px] text-slate-400">管理可登录账号，并将新账号直接加入当前组织。</p></div>
      <div className="flex gap-2"><label className="relative flex-1 md:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、账号、邮箱" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400" /></label><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"><Plus className="h-4 w-4" />添加注册成员</button></div>
    </div>
    {message && <div className="mx-5 mt-4 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">{message}</div>}
    {showCreate && <form onSubmit={create} className="m-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
      <div className="mb-3 flex items-center justify-between"><div className="text-xs font-black text-slate-800">创建登录账号</div><button type="button" onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-slate-400" /></button></div>
      <div className="grid gap-3 md:grid-cols-3"><input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="登录账号" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input required minLength={2} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="显示名称" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="联系邮箱" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input required minLength={12} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="初始密码（至少12位）" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input value={form.feishuUserId} onChange={(e) => setForm({ ...form, feishuUserId: e.target.value })} placeholder="飞书 User ID（可选）" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><select value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white">{roleOptions.map((role) => <option key={role.id} value={role.code}>{role.name}</option>)}</select></div>
      <button disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><UserPlus className="h-4 w-4" />{saving ? "创建中…" : "创建并加入组织"}</button>
    </form>}
    {editing && <form onSubmit={saveEdit} className="m-5 grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/30 p-4 md:grid-cols-3"><input required minLength={2} value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} placeholder="显示名称" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="联系邮箱" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input value={editForm.feishuUserId} onChange={(e) => setEditForm({ ...editForm, feishuUserId: e.target.value })} placeholder="飞书 User ID" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><div className="flex gap-2 md:col-span-3"><button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white">保存资料</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">取消</button></div></form>}
    <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">成员 / 账号</th><th className="px-4 py-3">核心角色</th><th className="px-4 py-3">归属用户组</th><th className="px-4 py-3">联系邮箱</th><th className="px-4 py-3">飞书绑定</th><th className="px-4 py-3">账号状态</th><th className="px-4 py-3">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id} className="hover:bg-slate-50/50"><td className="px-5 py-3"><div className="font-black text-slate-800">{user.displayName}{user.id === currentUserId && <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] text-indigo-600">你</span>}</div><div className="mt-0.5 font-mono text-[10px] text-slate-400">@{user.username}</div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${user.isSystemAdmin ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{user.isSystemAdmin ? "系统管理员" : user.organizationMembers.length ? "组织成员" : "未归属"}</span></td><td className="px-4 py-3 text-slate-600">{user.groupMembers.map((item) => item.group.name).join("、") || "—"}</td><td className="px-4 py-3 font-mono text-[10px] text-slate-600">{user.email || "—"}</td><td className="px-4 py-3 font-mono text-[10px] text-sky-600">{user.feishuUserId || "—"}</td><td className="px-4 py-3"><button disabled={saving || user.id === currentUserId} onClick={() => void toggleStatus(user)} className={`rounded-full border px-2.5 py-1 text-[10px] font-black disabled:opacity-50 ${user.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{user.status === "ACTIVE" ? "启用" : "禁用"}</button></td><td className="px-4 py-3"><button onClick={() => startEdit(user)} className="text-[10px] font-black text-indigo-600">编辑</button></td></tr>)}</tbody></table></div>
  </section>;
}
