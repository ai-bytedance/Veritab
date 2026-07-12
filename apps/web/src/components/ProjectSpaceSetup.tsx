import { FormEvent, useState } from "react";
import { FolderPlus, LoaderCircle } from "lucide-react";
import { apiRequest } from "../api/httpClient";
import { RequirementApiScope } from "../features/requirements/api/types";

export default function ProjectSpaceSetup({ organizationId, onCreated }: { organizationId: string; onCreated: (scope: RequirementApiScope) => void }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const project = await apiRequest<{ id: string }>(`/organizations/${organizationId}/spaces`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), key: key.trim().toUpperCase() }),
      });
      onCreated({ organizationId, projectSpaceId: project.id });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "项目空间创建失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><FolderPlus className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-black text-slate-900">创建第一个项目空间</h2><p className="mt-1 text-xs leading-5 text-slate-500">项目空间承载需求、缺陷、用例和代码变更。只有在您确认后才会创建。</p></div>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2"><span className="text-xs font-bold text-slate-700">项目空间名称</span><input required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：核心平台" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" /></label>
          <label className="space-y-2"><span className="text-xs font-bold text-slate-700">空间 Key</span><input required minLength={2} maxLength={16} pattern="[A-Z][A-Z0-9]*" value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} placeholder="例如：CORE" className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-indigo-500" /></label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 sm:col-span-2">{error}</p>}
          <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white disabled:opacity-50 sm:col-span-2">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? "正在创建…" : "创建并进入项目空间"}</button>
        </form>
      </div>
    </section>
  );
}
