export const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000/api` : 'http://localhost:5000/api');

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  // Only set application/json if it's not FormData (FormData sets its own boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (data: any) => fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => fetchWithAuth('/auth/me'),
  },
  issues: {
    create: (formData: FormData) => fetchWithAuth('/issues', { method: 'POST', body: formData }),
    getNearby: (lat: number, lng: number) => fetchWithAuth(`/issues/nearby?lat=${lat}&lng=${lng}`),
    getAll: () => fetchWithAuth('/issues/nearby?maxDistance=100000'), // Large radius for all
    updateStatus: (id: string, status: string, comment?: string) => 
      fetchWithAuth(`/issues/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }) }),
    reassign: (id: string, primaryDepartmentId: string, linkedDepartmentIds: string[]) => 
      fetchWithAuth(`/issues/${id}/reassign`, { method: 'PATCH', body: JSON.stringify({ primaryDepartmentId, linkedDepartmentIds }) }),
    confirm: (id: string, isResolved: boolean, comment?: string) => 
      fetchWithAuth(`/issues/${id}/confirm`, { method: 'POST', body: JSON.stringify({ isResolved, comment }) }),
    generateAiPlan: (id: string) => 
      fetchWithAuth(`/issues/${id}/ai-plan`, { method: 'POST' }),
    generateAiOrder: (id: string) =>
      fetchWithAuth(`/issues/${id}/ai-order`, { method: 'POST' }),
    addDependency: (id: string, dependentDepartmentId: string, prerequisiteDepartmentId: string, notes?: string, estimatedTime?: string) => 
      fetchWithAuth(`/issues/${id}/dependency`, { method: 'POST', body: JSON.stringify({ dependentDepartmentId, prerequisiteDepartmentId, notes, estimatedTime }) }),
    getPendingDependencies: () => fetchWithAuth('/issues/dependencies/pending'),
  },
  departments: {
    getAll: () => fetchWithAuth('/departments'),
    getLeaderboard: () => fetchWithAuth('/departments/leaderboard'),
  },
  works: {
    getAll: () => fetchWithAuth('/works'),
    create: (data: any) => fetchWithAuth('/works', { method: 'POST', body: JSON.stringify(data) }),
  },
  complaints: {
    create: (formData: FormData) => fetchWithAuth('/complaints', { method: 'POST', body: formData }),
    getAll: () => fetchWithAuth('/complaints'),
    getById: (id: string) => fetchWithAuth(`/complaints/${id}`),
    updateStatus: (id: string, status: string, note?: string) => 
      fetchWithAuth(`/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
    rate: (id: string, rating: number, comment?: string) => 
      fetchWithAuth(`/complaints/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),
    confirmTriage: (id: string, departmentId: string, note?: string) => 
      fetchWithAuth(`/complaints/${id}/confirm-triage`, { method: 'POST', body: JSON.stringify({ departmentId, note }) }),
    reassign: (id: string, departmentId: string, note?: string) => 
      fetchWithAuth(`/complaints/${id}/reassign`, { method: 'PATCH', body: JSON.stringify({ departmentId, note }) }),
  },
  auditLogs: {
    getAll: () => fetchWithAuth('/complaints/audit-logs'),
  },
  assistant: {
    ask: (question: string) => 
      fetchWithAuth('/assistant/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  }
};
