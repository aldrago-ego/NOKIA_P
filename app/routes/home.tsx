import React, { type JSX } from 'react';
import { ProjectProvider } from './project';
import Dashboard from './Dashboard';
import Warehouse from './warehouse';

type Tab = 'dashboard' | 'warehouse';

const NAV_ITEMS: { key: Tab; label: string; icon: JSX.Element }[] = [
  {
    key: 'dashboard',
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
    key: 'warehouse',
    label: 'Warehouse',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
        <path d="M3 9.5L12 4l9 5.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 20v-7h6v7" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = React.useState<Tab>('dashboard');

  return (
    <ProjectProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6FA] font-sans">
        {/* ================= SIDEBAR ================= */}
        <aside className="w-64 bg-[#0d3373] text-white flex flex-col justify-between relative">
          {/* Fine ligne bleu clair sur la bordure droite pour la profondeur */}
          <div className="absolute top-0 right-0 w-px h-full bg-blue-400/10" />

          <div>
            {/* Logo */}
            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
              <span className="text-xl font-black tracking-[0.15em] text-white">NOKIA</span>
              <span className="text-[10px] font-mono text-blue-300/70">v2.0</span>
            </div>

            {/* Nav */}
            <nav className="p-3 space-y-1 mt-2">
              {NAV_ITEMS.map((item) => {
                const active = currentTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setCurrentTab(item.key)}
                    className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150
                      ${
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-blue-200/80 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {/* Barre d'accent orange — uniquement sur l'onglet actif */}
                    <span
                      className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${
                        active ? 'bg-[#F2790B]' : 'bg-transparent'
                      }`}
                    />
                    <span className={active ? 'text-[#F2790B]' : ''}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}

              <div className="pt-5 pb-1 px-4 text-[10px] font-bold uppercase text-blue-300/50 tracking-widest">
                Modules à venir
              </div>
              <button
                disabled
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-blue-300/40 cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Clients
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-blue-300/40 cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
                  <path d="M3 3h13v13H3zM16 8h4l3 4v4h-7z" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="18" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                SMR Requests
              </button>
            </nav>
          </div>

          {/* Footer sidebar */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-blue-300/70">Internship Project</span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F2790B] to-[#c85f00] flex items-center justify-center font-bold text-[11px] text-white shadow-sm">
              N
            </div>
          </div>
        </aside>

        {/* ================= CONTENU PRINCIPAL ================= */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0F172A]">
              {currentTab === 'dashboard' ? 'Dashboard' : 'Warehouse'}
            </span>
            <div className="flex items-center gap-2 bg-[#EAF1FC] px-3 py-1.5 rounded-full text-xs font-semibold text-[#124191]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Admin Mode
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {currentTab === 'dashboard' && <Dashboard />}
            {currentTab === 'warehouse' && <Warehouse />}
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}