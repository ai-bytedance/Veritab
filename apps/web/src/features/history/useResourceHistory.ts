import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../api/httpClient";
import { HistoryLog } from "../../types";

interface HistoryScope { organizationId: string; projectSpaceId: string }
type ResourceKind = "requirements" | "defects" | "test-cases";
interface ApiHistoryRecord { id: string; action: string; changes: unknown; createdAt: string; actorId?: string | null; actor?: { id: string; username: string; displayName: string } | null }

const actionLabels: Record<string, string> = { CREATE: "创建", UPDATE: "更新", TRANSITION: "状态流转", DELETE: "删除", EXECUTE: "执行用例", SYNC_LINKS: "更新追溯关联", COMMENT: "添加评论", COMMENT_DELETE: "删除评论" };

export function useResourceHistory(kind: ResourceKind, scope: HistoryScope | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ["resource-history", kind, scope?.organizationId, scope?.projectSpaceId, id],
    enabled: Boolean(scope && id),
    queryFn: async (): Promise<HistoryLog[]> => {
      const records = await apiRequest<ApiHistoryRecord[]>(`/organizations/${scope!.organizationId}/spaces/${scope!.projectSpaceId}/${kind}/${id}/history`);
      return records.map((record) => ({
        id: record.id,
        userId: record.actor?.id ?? record.actorId ?? undefined,
        userName: record.actor?.displayName || record.actor?.username || "系统",
        action: actionLabels[record.action] ?? record.action,
        newValue: record.changes == null ? undefined : typeof record.changes === "string" ? record.changes : JSON.stringify(record.changes),
        createdAt: record.createdAt,
      }));
    },
  });
}
