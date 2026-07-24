import React, { useState } from 'react';
import { apiFetch } from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://nokia-p-1.onrender.com/api';
const DOMAINS = ['RAN', 'Microwave', 'Energy', 'Core', 'Consumables'];

interface StockLine { hardwareProductId: number; partNumber: string; name: string; totalQuantity: number; }
interface DraftItem {
  hardwareProductId: number | null;
  partNumber: string;
  description: string;
  domain: string;
  materialGroup: string;
  isSerialized: boolean;
  currentQuantity: number | null; // null si nouvelle référence
  newQuantity: number;
  isNew: boolean;
}

const EMPTY: DraftItem = {
  hardwareProductId: null, partNumber: '', description: '', domain: 'RAN',
  materialGroup: '', isSerialized: true, currentQuantity: null, newQuantity: 0, isNew: true,
};

export default function StockCorrectionForm({
  warehouseId,
  projectId,
  stockLines,
  onClose,
  onDone,
}: {
  warehouseId: number;
  projectId: number;
  stockLines: StockLine[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = stockLines.filter(
    (l) => !items.some((i) => i.hardwareProductId === l.hardwareProductId) &&
      (search.trim() === '' || l.partNumber.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()))
  );

  function addExisting(l: StockLine) {
    setItems((prev) => [...prev, {
      ...EMPTY, hardwareProductId: l.hardwareProductId, partNumber: l.partNumber, description: l.name,
      currentQuantity: l.totalQuantity, newQuantity: l.totalQuantity, isNew: false,
    }]);
    setSearch('');
  }

  function addNew() {
    setItems((prev) => [...prev, { ...EMPTY }]);
  }

  function update(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return setError('Ajoutez au moins une référence à corriger.');
    if (items.some((it) => it.isNew && (!it.partNumber.trim() || !it.description.trim()))) {
      return setError('Code et description requis pour chaque nouvelle référence.');
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/PhysicalAssets/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          projectId,
          reason,
          items: items.map((it) => ({
            hardwareProductId: it.hardwareProductId,
            partNumber: it.partNumber,
            description: it.description,
            domain: it.isNew ? it.domain : undefined,
            materialGroup: it.isNew ? it.materialGroup : undefined,
            isSerialized: it.isNew ? it.isSerialized : undefined,
            newQuantity: it.newQuantity,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || 'Échec de la mise à jour.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-[#0F172A]">Mettre à jour le stock</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-black">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
            Correction directe — à utiliser uniquement pour rattraper un écart constaté (matériel déjà en stock non tracé, erreur historique). Réservé à l'administrateur.
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Motif (recommandé)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex : ASIB déjà en stock avant la livraison Shipment 5" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Corriger une référence existante</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un code ou une description…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
          {search.trim() !== '' && (
            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto mb-3">
              {filtered.length === 0 ? (
                <div className="p-3 text-xs text-slate-400">Aucune référence correspondante.</div>
              ) : (
                filtered.slice(0, 8).map((l) => (
                  <button type="button" key={l.hardwareProductId} onClick={() => addExisting(l)} className="w-full text-left px-3 py-2 text-sm hover:bg-[#EAF1FC] border-b border-slate-50 last:border-0">
                    <span className="font-mono text-[#124191]">{l.partNumber}</span> <span className="text-slate-600">{l.name}</span>
                    <span className="text-xs text-slate-400 float-right">actuel : {l.totalQuantity}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <button type="button" onClick={addNew} className="text-xs font-semibold text-[#124191] hover:underline mb-4">
            + Ajouter une référence totalement nouvelle
          </button>

          <div className="space-y-3 mb-4">
            {items.map((it, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 relative">
                <button type="button" onClick={() => remove(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 text-xs">✕</button>

                {it.isNew ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={it.partNumber} onChange={(e) => update(idx, { partNumber: e.target.value })} placeholder="Code matériel" className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono" />
                      <input value={it.description} onChange={(e) => update(idx, { description: e.target.value })} placeholder="Description" className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select value={it.domain} onChange={(e) => update(idx, { domain: e.target.value })} className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs">
                        {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input value={it.materialGroup} onChange={(e) => update(idx, { materialGroup: e.target.value })} placeholder="Groupe matériel" className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs" />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                      <input type="checkbox" checked={it.isSerialized} onChange={(e) => update(idx, { isSerialized: e.target.checked })} />
                      Matériel sérialisé
                    </label>
                  </>
                ) : (
                  <div className="mb-2 text-sm">
                    <span className="font-mono text-[#124191]">{it.partNumber}</span> <span className="text-slate-600">{it.description}</span>
                    <span className="text-xs text-slate-400 ml-2">(actuel : {it.currentQuantity})</span>
                  </div>
                )}

                <label className="block text-[10px] text-slate-400 mb-1">Quantité totale souhaitée après correction</label>
                <input type="number" min={0} value={it.newQuantity} onChange={(e) => update(idx, { newQuantity: parseInt(e.target.value) || 0 })} className="w-32 border border-slate-200 rounded-md px-2.5 py-1.5 text-sm font-mono" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
              {submitting ? 'Mise à jour…' : 'Appliquer la correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}