const STORAGE_KEY = 'nexa_auth';

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  const token = stored ? JSON.parse(stored).token : null;

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = '/login';
  }

  return res;
}