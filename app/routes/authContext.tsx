import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const STORAGE_KEY = 'nexa_auth';

export type Role = 'SuperAdmin' | 'Admin' | 'Supervisor' | 'Viewer';

interface AuthContextValue {
  role: Role | null;
  userName: string | null;
  isAdmin: boolean;        // Admin OU SuperAdmin — le SuperAdmin hérite de tous les droits Admin
  isElevated: boolean;     // Admin, SuperAdmin OU Supervisor — actions courantes de gestion
  isSuperAdmin: boolean;   // SuperAdmin STRICT — seul lui accède à la gestion des administrateurs
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
const isBrowser = typeof window !== 'undefined';

function readStoredAuth() {
  if (!isBrowser) return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => readStoredAuth()?.role ?? null);
  const [userName, setUserName] = useState<string | null>(() => readStoredAuth()?.displayName ?? null);

 async function login(username: string, password: string) {
  const res = await apiFetch(`${API_BASE}/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Identifiants invalides.');

  const data = await res.json();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    token: data.token,
    refreshToken: data.refreshToken, // NOUVEAU
    role: data.role,
    displayName: data.displayName,
  }));
  setRole(data.role);
  setUserName(data.displayName);
}

function logout() {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    const { refreshToken } = JSON.parse(stored);
    if (refreshToken) {
      fetch(`${API_BASE}/Auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {}); // best-effort, ne bloque pas la déconnexion locale
    }
  }
  setRole(null);
  setUserName(null);
  sessionStorage.removeItem(STORAGE_KEY);
}

  return (
<AuthContext.Provider value={{
  role,
  userName,
  isAdmin: role === 'Admin' || role === 'SuperAdmin',
  isElevated: role === 'Admin' || role === 'SuperAdmin' || role === 'Supervisor',
  isSuperAdmin: role === 'SuperAdmin',
  login,
  logout
}}>      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}