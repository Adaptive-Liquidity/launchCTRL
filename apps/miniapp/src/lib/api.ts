const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
  }

  return data;
}

export const api = {
  auth: {
    telegram: (initData: string) =>
      request<{ success: true; data: { token: string; user: { id: string; telegramFirstName: string; telegramUsername: string | null }; expiresAt: string } }>('/api/auth/telegram', {
        method: 'POST',
        body: { initData },
      }),
    logout: (token: string) =>
      request('/api/auth/logout', { method: 'POST', token }),
  },

  users: {
    me: (token: string) => request<{ success: true; data: unknown }>('/api/users/me', { token }),
  },

  workspaces: {
    list: (token: string) =>
      request<{ success: true; data: unknown[] }>('/api/workspaces', { token }),
    create: (token: string, data: { name: string; description?: string }) =>
      request<{ success: true; data: unknown }>('/api/workspaces', { method: 'POST', body: data, token }),
    get: (token: string, id: string) =>
      request<{ success: true; data: unknown }>(`/api/workspaces/${id}`, { token }),
    entities: (token: string, workspaceId: string) =>
      request<{ success: true; data: unknown[] }>(`/api/workspaces/${workspaceId}/entities`, { token }),
    addEntity: (token: string, workspaceId: string, data: unknown) =>
      request<{ success: true; data: unknown }>(`/api/workspaces/${workspaceId}/entities`, { method: 'POST', body: data, token }),
    runs: (token: string, workspaceId: string) =>
      request<{ success: true; data: unknown[] }>(`/api/workspaces/${workspaceId}/runs`, { token }),
    audit: (token: string, workspaceId: string) =>
      request<{ success: true; data: unknown[] }>(`/api/workspaces/${workspaceId}/audit`, { token }),
    assets: (token: string, workspaceId: string) =>
      request<{ success: true; data: unknown[] }>(`/api/workspaces/${workspaceId}/assets`, { token }),
  },

  plans: {
    create: (token: string, workspaceId: string, answers: unknown) =>
      request<{ success: true; data: unknown }>(`/api/${workspaceId}/plans`, { method: 'POST', body: answers, token }),
    list: (token: string, workspaceId: string) =>
      request<{ success: true; data: unknown[] }>(`/api/${workspaceId}/plans`, { token }),
    get: (token: string, planId: string) =>
      request<{ success: true; data: unknown }>(`/api/plans/${planId}`, { token }),
    approve: (token: string, planId: string, workspaceId: string) =>
      request<{ success: true; data: unknown }>(`/api/plans/${planId}/approve`, { method: 'POST', body: { workspaceId }, token }),
  },

  runs: {
    start: (token: string, data: { planId: string; workspaceId: string; isDryRun: boolean }) =>
      request<{ success: true; data: unknown }>('/api/runs', { method: 'POST', body: data, token }),
    get: (token: string, runId: string) =>
      request<{ success: true; data: unknown }>(`/api/runs/${runId}`, { token }),
  },

  assets: {
    get: (token: string, assetId: string) =>
      request<{ success: true; data: unknown }>(`/api/assets/${assetId}`, { token }),
    update: (token: string, assetId: string, data: { content: string }) =>
      request<{ success: true; data: unknown }>(`/api/assets/${assetId}`, { method: 'PATCH', body: data, token }),
  },

  skills: {
    list: (token: string) =>
      request<{ success: true; data: unknown[] }>('/api/skills', { token }),
  },
};
