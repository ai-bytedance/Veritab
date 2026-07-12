import { FormEvent, useState } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import { apiRequest } from "../api/httpClient";

interface Organization { id: string; slug: string; name: string }

export default function OrganizationSetup({ onCreated }: { onCreated: (organization: Organization) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const organization = await apiRequest<Organization>("/organizations", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      onCreated(organization);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "组织创建失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 text-left">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">组织与租户</p>
        <h2 className="mt-2 text-xl font-black text-slate-900">创建您的组织</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">组织用于隔离成员、权限、通知和审计数据。系统会自动生成内部唯一标识，您只需填写组织名称。</p>
      </div>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block space-y-2">
          <span className="text-xs font-bold text-slate-700">组织名称</span>
          <input required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：研发中心" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
        </label>
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        <button disabled={saving} className="mt-5 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
          {saving ? "正在创建…" : "创建组织"}
        </button>
      </form>
    </section>
  );
}
