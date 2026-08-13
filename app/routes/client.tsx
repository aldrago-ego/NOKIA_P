import React, { useState } from 'react';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';
import { useAuth } from './authContext';
import { useFetchState } from '../useFetchState';
import ErrorState from '../Component/ErrorState';

interface Client {
  id: number;
  name: string;
  companyName: string;
  email: string;
}

export default function ClientsPage() {
  const { isElevated } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
    retry: reloadClients,
  } = useFetchState<Client[]>(
    (signal) => apiFetch(`${API_BASE}/Clients`, { signal }).then((r) => r.json()),
    [],
  );

  const filtered = (clients ?? []).filter(
    (c) => search.trim() === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] mb-1">Clients</h1>
          <p className="text-sm text-slate-500">Clients rattachés aux sites et demandes SMR</p>
        </div>
        {isElevated && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-[#124191] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[#0d3373] transition-colors"
          >
            + Nouveau client
          </button>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un client…"
        className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-2 text-black mb-5"
      />

      {clientsError ? (
        <ErrorState message={clientsError} onRetry={reloadClients} />
      ) : clientsLoading || !clients ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white border border-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Aucun client trouvé.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left font-medium px-5 py-3">Nom</th>
                <th className="text-left font-medium px-5 py-3">Société</th>
                <th className="text-left font-medium px-5 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="px-5 py-3 font-semibold text-[#0F172A]">{c.name}</td>
                  <td className="px-5 py-3 text-slate-500">{c.companyName}</td>
                  <td className="px-5 py-3 text-slate-500">{c.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ClientCreateForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); reloadClients(); }}
        />
      )}
    </div>
  );
}

function ClientCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Nom requis.');

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/Clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyName, email }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Échec de la création.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">Nouveau client</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-black">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-black">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Société</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-5" />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
              {submitting ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}