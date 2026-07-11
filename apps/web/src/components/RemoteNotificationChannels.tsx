import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../api/httpClient";
import { RequirementApiScope } from "../features/requirements/api/types";

type Provider = "FEISHU" | "WECOM" | "DINGTALK";
interface Channel { id: string; provider: Provider; name: string; enabled: boolean; endpointConfigured: boolean; secretConfigured: boolean; version: number; }

export default function RemoteNotificationChannels({ scope }: { scope: RequirementApiScope }) {
  const [provider, setProvider] = useState<Provider>("FEISHU");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [endpoint, setEndpoint] = useState("");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const root = `/organizations/${scope.organizationId}/spaces/${scope.projectSpaceId}/notifications`;
  const current = channels.find((channel) => channel.provider === provider && channel.name === "default");

  const load = async () => setChannels(await apiRequest<Channel[]>(`${root}/channels`));
  useEffect(() => { void load().catch((reason) => setMessage(reason instanceof Error ? reason.message : "渠道加载失败。")); }, [root]);
  useEffect(() => { setEndpoint(""); setSecret(""); setEnabled(current?.enabled ?? false); setMessage(null); }, [provider, current?.id, current?.version]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`${root}/channels/${provider}`, {
        method: "PUT",
        body: JSON.stringify({ version: current?.version ?? 0, name: "default", enabled, ...(endpoint ? { endpoint } : {}), ...(secret ? { secret } : {}) }),
      });
      await load();
      setEndpoint("");
      setSecret("");
      setMessage("渠道配置已加密保存。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "渠道保存失败。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-4xl space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div><h3 className="text-xs font-black text-slate-800">外部通知渠道</h3><p className="mt-1 text-[11px] text-slate-400">Webhook 地址和签名密钥仅加密存储于服务端，保存后不会返回浏览器。</p></div>
      <div className="grid grid-cols-3 gap-2">{(["FEISHU", "WECOM", "DINGTALK"] as Provider[]).map((value) => <button type="button" key={value} onClick={() => setProvider(value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${provider === value ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>{value === "FEISHU" ? "飞书" : value === "WECOM" ? "企业微信" : "钉钉"}</button>)}</div>
      <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Webhook HTTPS 地址</span><input type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder={current?.endpointConfigured ? "已配置；留空表示保留" : "https://..."} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-500" /></label>
      <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">签名密钥</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={current?.secretConfigured ? "已配置；留空表示保留" : "可选"} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-500" /></label>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />启用该渠道</label>
      {message && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>}
      <div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "保存中…" : "保存渠道"}</button></div>
    </form>
  );
}
