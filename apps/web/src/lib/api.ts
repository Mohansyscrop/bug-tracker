const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = `${baseUrl}/api/v1`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    let res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include', // httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Auto-refresh token on 401 Unauthorized if not an auth endpoint
    if (res.status === 401 && !path.startsWith('/auth/')) {
      try {
        const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          // Retry original request with newly acquired cookie
          res = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });
        }
      } catch {
        // If refresh fails, continue to throw standard ApiError
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(res.status, error.message ?? 'Request failed');
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    const url = params
      ? `${path}?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        )}`
      : path;
    return this.request<T>(url);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient(BASE_URL);

// ── Auth ────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ data: any }>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post<{ data: any }>('/auth/register', { name, email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ data: any }>('/auth/me'),
  refresh: () => api.post<{ data: any }>('/auth/refresh'),
};

// ── Projects ────────────────────────────────────────────────

export const projectsApi = {
  list: () => api.get<{ data: any[] }>('/projects'),
  create: (dto: any) => api.post<{ data: any }>('/projects', dto),
  get: (id: string) => api.get<{ data: any }>(`/projects/${id}`),
  update: (id: string, dto: any) => api.put<{ data: any }>(`/projects/${id}`, dto),
  members: (id: string) => api.get<{ data: any[] }>(`/projects/${id}/members`),
  addMember: (id: string, dto: any) => api.post(`/projects/${id}/members`, dto),
  updateMemberRole: (id: string, userId: string, projectRole: string) =>
    api.patch<{ data: any }>(`/projects/${id}/members/${userId}`, { projectRole }),
  removeMember: (id: string, userId: string) => api.delete(`/projects/${id}/members/${userId}`),
  milestones: (id: string) => api.get<{ data: any[] }>(`/projects/${id}/milestones`),
  createMilestone: (id: string, dto: any) => api.post(`/projects/${id}/milestones`, dto),
  components: (id: string) => api.get<{ data: any[] }>(`/projects/${id}/components`),
  createComponent: (id: string, dto: any) => api.post(`/projects/${id}/components`, dto),
  stats: (id: string) => api.get<{ data: any }>(`/projects/${id}/stats`),
};

// ── Bugs ────────────────────────────────────────────────────

export const bugsApi = {
  list: (params?: any) => api.get<{ data: any[]; meta: any }>('/bugs', params),
  create: (dto: any) => api.post<{ data: any }>('/bugs', dto),
  get: (id: string) => api.get<{ data: any }>(`/bugs/${id}`),
  update: (id: string, dto: any) => api.put<{ data: any }>(`/bugs/${id}`, dto),
  transition: (id: string, dto: any) => api.patch<{ data: any }>(`/bugs/${id}/status`, dto),
  bulkUpdate: (dto: any) => api.patch('/bugs/bulk-update', dto),
  delete: (id: string) => api.delete(`/bugs/${id}`),
  toggleWatch: (id: string) => api.post<{ data: any }>(`/bugs/${id}/watch`),
  activityLog: (id: string) => api.get<{ data: any[] }>(`/bugs/${id}/activity-log`),
  createLink: (id: string, dto: any) => api.post(`/bugs/${id}/links`, dto),
};

// ── Comments ────────────────────────────────────────────────

export const commentsApi = {
  list: (bugId: string) => api.get<{ data: any[] }>(`/bugs/${bugId}/comments`),
  create: (bugId: string, bodyMarkdown: string) =>
    api.post<{ data: any }>(`/bugs/${bugId}/comments`, { bodyMarkdown }),
  update: (bugId: string, commentId: string, bodyMarkdown: string) =>
    api.put(`/bugs/${bugId}/comments/${commentId}`, { bodyMarkdown }),
  delete: (bugId: string, commentId: string) =>
    api.delete(`/bugs/${bugId}/comments/${commentId}`),
};

// ── Notifications ────────────────────────────────────────────

export const notificationsApi = {
  list: (page = 1, limit = 20) => api.get<{ data: any[]; meta: any }>('/notifications', { page, limit }),
  unreadCount: () => api.get<{ data: { count: number } }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ── Users ────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get<any[]>('/users'),
  me: () => api.get<{ data: any }>('/users/me'),
  update: (dto: any) => api.patch('/users/me', dto),
  create: (dto: {
    name: string;
    email: string;
    password: string;
    globalRole?: string;
    projectMembers?: { projectId: string; projectRole: string }[];
  }) => api.post<any>('/users', dto),
  updateRole: (id: string, globalRole: string) =>
    api.patch<any>(`/users/${id}/role`, { globalRole }),
  updateProjects: (id: string, projectMembers: { projectId: string; projectRole: string }[]) =>
    api.patch<any>(`/users/${id}/projects`, { projectMembers }),
  delete: (id: string) => api.delete<any>(`/users/${id}`),
};

// ── QA Testing Cycles ────────────────────────────────────────

export const testingCyclesApi = {
  list: (projectId?: string) =>
    api.get<any[]>('/testing-cycles', projectId ? { projectId } : undefined),
  getOverview: (projectId?: string) =>
    api.get<any>('/testing-cycles/overview', projectId ? { projectId } : undefined),
  get: (id: string) => api.get<any>(`/testing-cycles/${id}`),
  create: (dto: any) => api.post<any>('/testing-cycles', dto),
  update: (id: string, dto: any) => api.put<any>(`/testing-cycles/${id}`, dto),
  delete: (id: string) => api.delete<any>(`/testing-cycles/${id}`),

  // Requirements
  listRequirements: (projectId: string) =>
    api.get<any[]>(`/testing-cycles/requirements/${projectId}`),
  createRequirement: (dto: any) =>
    api.post<any>('/testing-cycles/requirements', dto),
  updateRequirement: (id: string, dto: any) =>
    api.put<any>(`/testing-cycles/requirements/${id}`, dto),
  deleteRequirement: (id: string) =>
    api.delete<any>(`/testing-cycles/requirements/${id}`),

  // Test Suites & Test Cases
  createSuite: (dto: { testingCycleId: string; name: string; description?: string }) =>
    api.post<any>('/testing-cycles/suites', dto),
  createTestCase: (dto: any) =>
    api.post<any>('/testing-cycles/test-cases', dto),
  recordExecution: (dto: { testingCycleId: string; testCaseId: string; status: string; actualResult?: string; notes?: string }) =>
    api.post<any>('/testing-cycles/executions', dto),
};
