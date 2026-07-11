import { ChangeEvent, useEffect, useState } from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { apiRequest } from "../api/httpClient";
import { RequirementApiScope } from "../features/requirements/api/types";

interface StoredFile { id: string; originalName: string; contentType: string; actualSize: number | null; createdAt: string; }

export default function ResourceAttachments({ scope, resourceType, resourceId }: { scope: RequirementApiScope; resourceType: "REQUIREMENT" | "DEFECT" | "TEST_CASE"; resourceId: string }) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = `/organizations/${scope.organizationId}/spaces/${scope.projectSpaceId}/files`;
  const load = async () => setFiles(await apiRequest<StoredFile[]>(`${root}?resourceType=${resourceType}&resourceId=${resourceId}`));
  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "附件加载失败。")); }, [root, resourceType, resourceId]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const reservation = await apiRequest<{ file: { id: string }; upload: { url: string; headers: Record<string, string> } }>(`${root}/uploads`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", size: file.size }) });
      const response = await fetch(reservation.upload.url, { method: "PUT", headers: reservation.upload.headers, body: file });
      if (!response.ok) throw new Error(`对象存储上传失败（${response.status}）。`);
      await apiRequest(`${root}/${reservation.file.id}/complete`, { method: "POST" });
      await apiRequest(`${root}/${reservation.file.id}/attachment`, { method: "PATCH", body: JSON.stringify({ resourceType, resourceId }) });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "附件上传失败。");
    } finally {
      setBusy(false);
    }
  };

  const download = async (id: string) => {
    try {
      const result = await apiRequest<{ url: string }>(`${root}/${id}/download`);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "下载链接生成失败。"); }
  };

  const remove = async (id: string) => {
    try { await apiRequest(`${root}/${id}`, { method: "DELETE" }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "附件删除失败。"); }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Paperclip className="h-4 w-4 text-indigo-500" />附件</div><label className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white"><Upload className="h-3.5 w-3.5" />{busy ? "上传中…" : "上传文件"}<input type="file" disabled={busy} onChange={upload} className="hidden" /></label></div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>}
      {files.length === 0 ? <p className="text-[11px] text-slate-400">暂无附件</p> : <div className="space-y-2">{files.map((file) => <div key={file.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{file.originalName}</p><p className="text-[9px] text-slate-400">{file.actualSize === null ? "-" : `${Math.ceil(file.actualSize / 1024)} KB`}</p></div><div className="flex gap-1"><button type="button" onClick={() => void download(file.id)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Download className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void remove(file.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>}
    </section>
  );
}
