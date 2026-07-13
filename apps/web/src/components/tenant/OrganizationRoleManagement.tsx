import { UserPlus } from "lucide-react";
import { useMembers } from "../../features/members/api/useMembers";
import { MemberApiScope } from "../../features/members/api/types";

export default function OrganizationRoleManagement({ scope, onAddUser }: { scope: MemberApiScope; onAddUser: () => void }) {
  const remote = useMembers(scope);
  const administrator = remote.roles.find((role) => role.code === "org_admin");
  return <section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="flex items-center justify-between px-5 py-3"><div><h3 className="text-sm font-black">系统管理员</h3><p className="mt-0.5 text-[11px] text-slate-400">系统内置管理角色，负责组织、成员与项目空间管理</p></div><button onClick={onAddUser} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"><UserPlus className="h-4 w-4"/>添加用户</button></div><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">角色名称</th><th>角色类型</th><th>权限范围</th><th>维护方式</th></tr></thead><tbody><tr><td className="px-5 py-4 font-bold">系统管理员</td><td><span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] text-violet-700">系统内置</span></td><td>{administrator ? `${administrator.permissions.length} 项系统权限` : "完整系统权限"}</td><td className="text-slate-500">固定角色，仅支持添加用户</td></tr></tbody></table></section>;
}
