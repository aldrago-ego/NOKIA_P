import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://nokia-p-1.onrender.com/api';
const STORAGE_KEY = 'nexa_auth';

export type Role = 'Admin' | 'Viewer';

interface AuthContextValue {
  role: Role | null;
  userName: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { role: r, displayName } = JSON.parse(stored);
        setRole(r);
        setUserName(displayName);
      } catch {}
    }
  }, []);

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
      role: data.role,
      displayName: data.displayName,
    }));
    setRole(data.role);
    setUserName(data.displayName);
  }

  function logout() {
    setRole(null);
    setUserName(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ role, userName, isAdmin: role === 'Admin', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}