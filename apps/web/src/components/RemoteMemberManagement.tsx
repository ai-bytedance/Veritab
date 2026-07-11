import { useState } from "react";
import { CheckCircle2, Copy, MailPlus, ShieldCheck, Trash2, Users } from "lucide-react";
import { useMembers } from "../features/members/api/useMembers";
import { CreatedInvitation, MemberApiScope } from "../features/members/api/types";
import { User } from "../types";

const roles = [
  ["org_admin", "组织管理员"],
  ["space_admin", "空间管理员"],
  ["developer", "开发人员"],
  ["tester", "测试人员"],
  ["viewer", "只读成员"],
] as const;

export default function RemoteMemberManagement({ scope, currentUser }: { scope: MemberApiScope; currentUser: User }) {
  const remote = useMembers(scope);
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState("developer");
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    }
  };

  const createInvitation = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return setMessage("请输入成员邮箱");
    try {
      const result = await remote.invite({ email: normalized, roleCode, expiresInHours: 24 });
      setCreated(result);
      setEmail("");
      setMessage("邀请已创建。激活Token仅显示本次，请通过安全渠道交付。 ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邀请创建失败");
    }
  };

  return (
    <div className="space-y-5">
      {(remote.isLoading || remote.isSaving || remote.error || message) && (
        <div className={`rounded-xl border px-4 py-2 text-xs font-bold ${remote.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-indigo-100 bg-indigo-50 text-indigo-700"}`}>
          {remote.error ? (remote.error instanceof Error ? remote.error.message : "成员服务异常") : remote.isSaving ? "正在保存成员变更…" : remote.isLoading ? "正在加载组织成员…" : message}
        </div>
      )}

      {created && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-amber-900">一次性激活Token</div>
              <div className="text-[10px] text-amber-700">{created.email} · {created.role.name} · {new Date(created.expiresAt).toLocaleString()}</div>
            </div>
            <button onClick={() => setCreated(null)} className="text-[10px] font-bold text-amber-700">关闭</button>
          </div>
          <div className="flex gap-2">
            <input readOnly value={created.activationToken} className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-[10px]" />
            <button onClick={() => void navigator.clipboard.writeText(created.activationToken)} className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 text-[10px] font-bold text-white">
              <Copy className="h-3 w-3" />复制
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MailPlus className="h-4 w-4 text-indigo-600" />
          <div><h3 className="text-xs font-black text-slate-800">邀请新成员</h3><p className="text-[10px] text-slate-400">新成员通过一次性Token自行设置账号和密码</p></div>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@company.com" type="email" className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          <select value={roleCode} onChange={(event) => setRoleCode(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white">
            {roles.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <button disabled={remote.isSaving} onClick={() => void createInvitation()} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            <MailPlus className="h-3.5 w-3.5" />创建邀请
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><Users className="h-4 w-4 text-teal-600" /><h3 className="text-xs font-black text-slate-800">组织成员（{remote.members.length}）</h3></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="text-[10px] uppercase text-slate-400"><th className="p-2">成员</th><th className="p-2">邮箱</th><th className="p-2">角色</th><th className="p-2">状态</th><th className="p-2">最近登录</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{remote.members.map((member) => {
            const self = member.user.id === currentUser.id;
            const currentRole = member.user.roleBindings[0]?.role.code || "viewer";
            return <tr key={member.user.id}>
              <td className="p-2 font-bold text-slate-800">{member.user.displayName}<div className="text-[10px] font-normal text-slate-400">@{member.user.username}{self ? " · 当前用户" : ""}</div></td>
              <td className="p-2 text-slate-600">{member.user.email}</td>
              <td className="p-2"><select disabled={self || remote.isSaving} value={currentRole} onChange={(event) => void run(() => remote.assignRole({ userId: member.user.id, roleCode: event.target.value }), "角色已更新")} className="rounded-lg border border-slate-200 px-2 py-1 bg-white disabled:opacity-60">{roles.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></td>
              <td className="p-2"><button disabled={self || remote.isSaving} onClick={() => void run(() => remote.updateStatus({ userId: member.user.id, status: member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }), "成员状态已更新")} className={`rounded-full border px-2 py-1 text-[10px] font-bold disabled:opacity-50 ${member.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{member.status === "ACTIVE" ? "正常" : "已停用"}</button></td>
              <td className="p-2 text-[10px] text-slate-500">{member.user.lastLoginAt ? new Date(member.user.lastLoginAt).toLocaleString() : "从未登录"}</td>
            </tr>;
          })}</tbody></table></div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><ShieldCheck className="h-4 w-4 text-violet-600" /><h3 className="text-xs font-black text-slate-800">邀请记录（{remote.invitations.length}）</h3></div>
        {remote.invitations.length === 0 ? <p className="py-5 text-center text-xs text-slate-400">暂无邀请</p> : remote.invitations.map((invitation) => {
          const active = !invitation.acceptedAt && !invitation.revokedAt && new Date(invitation.expiresAt) > new Date();
          return <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
            <div className="min-w-0"><div className="truncate text-xs font-bold text-slate-700">{invitation.email}</div><div className="text-[10px] text-slate-400">{invitation.role.name} · 有效期至 {new Date(invitation.expiresAt).toLocaleString()}</div></div>
            <div className="flex items-center gap-2">{invitation.acceptedAt ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" />已接受</span> : invitation.revokedAt ? <span className="text-[10px] font-bold text-slate-400">已撤销</span> : active ? <button disabled={remote.isSaving} onClick={() => void run(() => remote.revokeInvitation(invitation.id), "邀请已撤销")} className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600"><Trash2 className="h-3 w-3" />撤销</button> : <span className="text-[10px] font-bold text-amber-600">已过期</span>}</div>
          </div>;
        })}
      </div>
    </div>
  );
}
