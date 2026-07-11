import { Mail, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { User } from "../types";

export default function PersonalCenterModal({ isOpen, onClose, currentUser }: { isOpen: boolean; onClose: () => void; currentUser: User }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white">{currentUser.nickname?.slice(0, 1).toUpperCase() || "U"}</div>
          <div><h2 className="text-lg font-black text-slate-900">{currentUser.nickname}</h2><p className="text-xs text-slate-500">服务端身份资料</p></div>
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
          <div className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-slate-400" /><div><div className="text-[10px] font-bold uppercase text-slate-400">用户名</div><div className="font-semibold text-slate-800">{currentUser.username}</div></div></div>
          <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-400" /><div><div className="text-[10px] font-bold uppercase text-slate-400">邮箱</div><div className="font-semibold text-slate-800">{currentUser.email || "未设置"}</div></div></div>
          <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-slate-400" /><div><div className="text-[10px] font-bold uppercase text-slate-400">当前角色</div><div className="font-semibold text-slate-800">{currentUser.role === "admin" ? "管理员" : "组织成员"}</div></div></div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">密码修改、MFA及外部身份绑定将在对应服务端安全接口完成前保持关闭，浏览器不会保存或校验凭据。</p>
      </div>
    </div>
  );
}
