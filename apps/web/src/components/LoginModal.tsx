import { FormEvent, useState } from "react";
import { ArrowRight, Lock, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { ApiError, authApi } from "../api/httpClient";
import { User } from "../types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  isForced?: boolean;
}

export default function LoginModal({ isOpen, onClose, onLogin, isForced = false }: LoginModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError("请输入用户名或邮箱及密码。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await authApi.login(identifier.trim(), password);
      onLogin({
        id: result.user.id,
        username: result.user.username,
        nickname: result.user.displayName,
        email: result.user.email,
        group: "server-managed",
        status: "active",
        role: result.user.roleCodes.some((code) => code === "org_admin" || code === "space_admin") ? "admin" : "member",
      });
      setPassword("");
      onClose();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "登录服务暂时不可用，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
        {!isForced && <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-black text-slate-900">Veritab</h2><p className="text-xs text-slate-500">使用组织账号安全登录</p></div>
        </div>
        <form onSubmit={signIn} className="space-y-4">
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-600">用户名或邮箱</span><div className="relative"><UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="请输入用户名或邮箱" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500" /></div></label>
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-600">密码</span><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="请输入密码" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500" /></div></label>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? "正在验证…" : "立即登录"}<ArrowRight className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}
