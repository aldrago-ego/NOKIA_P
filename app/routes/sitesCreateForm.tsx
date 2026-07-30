import React, { useEffect, useState } from 'react';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';

interface Client { id: number; name: string; }

export default function SiteCreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [siteName, setSiteName] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/Clients`).then((r) => r.json()).then(setClients).catch(() => setClients([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!siteName.trim()) return setError('Nom du site requis.');
    if (clientId == null) return setError('Sélectionnez un client.');

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/Sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName, clientId, address, city, country, latitude, longitude,
        }),
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
          <h3 className="text-base font-bold text-[#0F172A]">Nouveau site</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nom du site</label>
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="ex : Yas Togo — Site Kara Nord" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client</label>
          <select value={clientId ?? ''} onChange={(e) => setClientId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
            <option value="">Sélectionner…</option>
            {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Adresse</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

          <div className="grid grid-cols-2 gap-2 mb-3">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude (optionnel)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude (optionnel)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
              {submitting ? 'Création…' : 'Créer le site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}