import React, { useState, useEffect } from 'react';
import { Links, Meta, NavLink, Outlet, Scripts, ScrollRestoration, useNavigate } from 'react-router';
import { ProjectProvider } from './project';
import { useAuth } from './authContext';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    to: '/warehouse',
    label: 'Warehouse',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M3 9.5L12 4l9 5.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 20v-7h6v7" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    to: '/smr',
    label: 'SMR Requests',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M3 3h13v13H3zM16 8h4l3 4v4h-7z" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="18" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    to: '/rma',
    label: 'Faulty HW RMA',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    to: '/loans',
    label: 'Prêts & Emprunts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/traceability',
    label: 'Traçabilité',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M9 20l-5-5 5-5M4 15h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/clients',
    label: 'Clients',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'Historique',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function AppLayout() {
  const { role, userName, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setChecked(true);
    if (!role) navigate('/login', { replace: true });
  }, [role]);

  if (!checked || !role) return null;

  return (
    <ProjectProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6FA] font-sans">
        {/* ---------- Overlay mobile (referme le menu au clic en dehors) ---------- */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* ---------- Sidebar : fixed hors-écran sur mobile, statique sur desktop ---------- */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0d3373] text-white flex flex-col justify-between transform transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
          <div className="absolute top-0 right-0 w-px h-full bg-blue-400/10" />

          <div>
            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
              <span className="text-xl font-black tracking-[0.15em] text-white">NOKIA</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-blue-300/70">v2.0</span>
                {/* Bouton fermer, visible seulement sur mobile */}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="md:hidden text-blue-200 hover:text-white transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <nav className="p-3 space-y-1 mt-2">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      isActive ? 'bg-white/10 text-white' : 'text-blue-200/80 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${
                          isActive ? 'bg-[#F2790B]' : 'bg-transparent'
                        }`}
                      />
                      <span className={isActive ? 'text-[#F2790B]' : ''}>{item.icon}</span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-blue-300/70">{userName} ({role})</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F2790B] to-[#c85f00] flex items-center justify-center font-bold text-[11px] text-white shadow-sm">
                {userName?.charAt(0).toUpperCase() ?? 'N'}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left text-[11px] text-blue-300/60 hover:text-red-300 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* ---------- Header ---------- */}
          <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Bouton hamburger, visible seulement sur mobile */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden text-slate-600 hover:text-[#124191] transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {/* Logo compact, visible seulement sur mobile (la sidebar desktop l'affiche déjà) */}
              <span className="md:hidden text-sm font-black tracking-[0.1em] text-[#124191]">NOKIA</span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isAdmin ? 'bg-[#EAF1FC] text-[#124191]' : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="hidden sm:inline">{userName} — {role}</span>
              <span className="sm:hidden">{role}</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#124191" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}