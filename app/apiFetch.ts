import { API_BASE } from './config';

const STORAGE_KEY = 'nexa_auth';

function getStored() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setStored(data: any) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const stored = getStored();
  if (!stored?.refreshToken) return false;

  const res = await fetch(`${API_BASE}/Auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: stored.refreshToken }),
  });
  if (!res.ok) return false;

  const data = await res.json();
  setStored({
    token: data.token,
    refreshToken: data.refreshToken,
    role: data.role,
    displayName: data.displayName,
  });
  return true;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const stored = getStored();
  const token = stored?.token ?? null;

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(input, { ...init, headers });

  if (res.status === 401 && stored?.refreshToken) {
    // Un seul refresh à la fois même si plusieurs requêtes échouent simultanément
    if (!refreshPromise) refreshPromise = tryRefresh().finally(() => { refreshPromise = null; });
    const refreshed = await refreshPromise;

    if (refreshed) {
      const newStored = getStored();
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set('Authorization', `Bearer ${newStored.token}`);
      res = await fetch(input, { ...init, headers: retryHeaders });
    }
  }

  if (res.status === 401) {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = '/login';
  }

  return res;
}