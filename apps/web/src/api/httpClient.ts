export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface LoginResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: { id: string; username: string; email: string; displayName: string; roleCodes: string[] };
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = (await response.json()) as LoginResponse;
        accessToken = result.accessToken;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retryAfterRefresh = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retryAfterRefresh && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) {
    let payload: { code?: string; detail?: string | string[] } | undefined;
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      payload = undefined;
    }
    const detail = Array.isArray(payload?.detail) ? payload.detail.join("; ") : payload?.detail;
    throw new ApiError(response.status, payload?.code || `HTTP_${response.status}`, detail || "Request failed", payload);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const result = await apiRequest<LoginResponse>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ identifier, password }) },
      false,
    );
    setAccessToken(result.accessToken);
    return result;
  },

  async restoreSession(): Promise<LoginResponse> {
    const result = await apiRequest<LoginResponse>("/auth/refresh", { method: "POST" }, false);
    setAccessToken(result.accessToken);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" }, false);
    } finally {
      setAccessToken(null);
    }
  },
};
