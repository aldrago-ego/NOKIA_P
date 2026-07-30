import React, { useEffect, useState } from 'react';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';

const DOMAINS = ['RAN', 'Microwave', 'Energy', 'Core', 'Consumables'];

interface Product {
  id: number;
  partNumber: string;
  name: string;
  domain: string;
  materialGroup: string;
  isSerialized: boolean;
}

export default function ProductEditForm({
  hardwareProductId,
  onClose,
  onSaved,
}: {
  hardwareProductId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('RAN');
  const [materialGroup, setMaterialGroup] = useState('');
  const [isSerialized, setIsSerialized] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/HardwareProducts/${hardwareProductId}`)
      .then((r) => r.json())
      .then((p: Product) => {
        setProduct(p);
        setName(p.name);
        setDomain(p.domain);
        setMaterialGroup(p.materialGroup);
        setIsSerialized(p.isSerialized);
      })
      .catch(() => setError('Impossible de charger cette fiche.'));
  }, [hardwareProductId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/HardwareProducts/${hardwareProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain, materialGroup, isSerialized }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Échec de la mise à jour.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">
            Modifier {product?.partNumber ?? '…'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {!product ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Domaine</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Groupe matériel</label>
            <input value={materialGroup} onChange={(e) => setMaterialGroup(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

            <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-5">
              <input type="checkbox" checked={isSerialized} onChange={(e) => setIsSerialized(e.target.checked)} />
              Matériel sérialisé (n'affecte pas les unités déjà en stock)
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}