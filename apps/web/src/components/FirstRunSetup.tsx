import { FormEvent, useEffect, useState } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import { apiRequest } from "../api/httpClient";
import { RequirementApiScope } from "../features/requirements/api/types";

interface Organization { id: string; slug: string; name: string }

export default function FirstRunSetup({ onReady }: { onReady: (scope: RequirementApiScope) => void }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<Organization[]>("/organizations")
      .then((organizations) => setOrganization(organizations[0] ?? null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "组织信息加载失败。"));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const savedOrganization = organization ?? await apiRequest<Organization>("/organizations", {
        method: "POST",
        body: JSON.stringify({ name: organizationName.trim(), slug: organizationSlug.trim() }),
      });
      setOrganization(savedOrganization);
      const project = await apiRequest<{ id: string }>(`/organizations/${savedOrganization.id}/spaces`, {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim(), key: projectKey.trim().toUpperCase() }),
      });
      onReady({ organizationId: savedOrganization.id, projectSpaceId: project.id });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "首次设置失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Building2 className="h-5 w-5" /></div>
        <div><h2 className="text-base font-black text-slate-800">首次设置</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">系统已保持空数据初始化。创建您自己的组织和第一个项目空间后即可开始使用。</p></div>
      </div>
      {!organization && <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">组织名称</span><input required minLength={2} maxLength={160} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="例如：研发中心" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-indigo-500" /></label>
        <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">组织标识</span><input required minLength={3} maxLength={64} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={organizationSlug} onChange={(event) => setOrganizationSlug(event.target.value.toLowerCase())} placeholder="例如：rd-center" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-indigo-500" /></label>
      </div>}
      {organization && <p className="mb-5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">当前组织：{organization.name}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">项目空间名称</span><input required minLength={2} maxLength={160} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="例如：核心平台" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-indigo-500" /></label>
        <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">空间 Key</span><input required minLength={2} maxLength={16} pattern="[A-Z][A-Z0-9]*" value={projectKey} onChange={(event) => setProjectKey(event.target.value.toUpperCase())} placeholder="例如：CORE" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono uppercase outline-none focus:border-indigo-500" /></label>
      </div>
      {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
      <button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? "正在创建…" : "创建并进入项目空间"}</button>
    </form>
  );
}
