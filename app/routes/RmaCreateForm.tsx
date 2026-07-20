import React, { useEffect, useState } from 'react';
import {apiFetch} from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://nokia-p-1.onrender.com/api';

interface DefectiveAsset { id: number; serialNumber: string; partNumber: string; name: string; defectiveQuantity: number; }
interface DraftLine { physicalAssetId: number; partNumber: string; name: string; max: number; quantity: number; }

export default function RmaCreateForm({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [defective, setDefective] = useState<DefectiveAsset[] | null>(null);
  const [rmaNumber, setRmaNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/Warehouses`).then((r) => r.json()).then((data) => setWarehouseId(data[0]?.id ?? null));
  }, []);

  useEffect(() => {
    if (warehouseId == null) return;
    apiFetch(`${API_BASE}/PhysicalAssets/defective?warehouseId=${warehouseId}`)
      .then((r) => r.json())
      .then(setDefective)
      .catch(() => setDefective([]));
  }, [warehouseId]);

  function addLine(asset: DefectiveAsset) {
    setLines((prev) => [
      ...prev,
      { physicalAssetId: asset.id, partNumber: asset.partNumber, name: asset.name, max: asset.defectiveQuantity, quantity: asset.defectiveQuantity },
    ]);
  }

  function updateQty(id: number, v: number) {
    setLines((prev) => prev.map((l) => (l.physicalAssetId === id ? { ...l, quantity: Math.max(1, Math.min(v, l.max)) } : l)));
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.physicalAssetId !== id));
  }

  const available = (defective ?? []).filter((d) => !lines.some((l) => l.physicalAssetId === d.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rmaNumber.trim()) return setError('Numéro RMA requis.');
    if (lines.length === 0) return setError('Ajoutez au moins une référence défectueuse.');
    if (warehouseId == null) return setError('Entrepôt introuvable.');

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/RmaRequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          warehouseId,
          rmaNumber,
          notes,
          items: lines.map((l) => ({ physicalAssetId: l.physicalAssetId, quantity: l.quantity })),
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
    <div className="fixed inset-0 bg-black/40 text-black flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-[#0F172A]">Nouvelle RMA</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">N° RMA</label>
          <input value={rmaNumber} onChange={(e) => setRmaNumber(e.target.value)} placeholder="ex : RMA-0091" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono mb-4" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Note (optionnel)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex : câble coupé lors de l'installation" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Matériel défectueux disponible</label>
          <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto mb-4">
            {!defective ? (
              <div className="p-3 text-xs text-slate-400">Chargement…</div>
            ) : available.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">Aucun matériel défectueux disponible.</div>
            ) : (
              available.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => addLine(d)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#EAF1FC] border-b border-slate-50 last:border-0"
                >
                  <span className="font-mono text-[#124191]">{d.partNumber}</span> <span className="text-slate-600">{d.name}</span>
                  <span className="text-xs text-red-600 float-right">{d.defectiveQuantity} défectueux</span>
                </button>
              ))
            )}
          </div>

          {lines.length > 0 && (
            <table className="w-full text-sm mb-4 text-black">
              <tbody className="divide-y divide-slate-100 text-black">
                {lines.map((l) => (
                  <tr key={l.physicalAssetId} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-[#124191]">{l.partNumber}</td>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-right">
                      <input type="number" min={1} max={l.max} value={l.quantity} onChange={(e) => updateQty(l.physicalAssetId, parseInt(e.target.value) || 1)} className="w-16 text-right border border-slate-200 rounded-md px-2 py-1 text-xs font-mono" />
                    </td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => removeLine(l.physicalAssetId)} className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
              {submitting ? 'Création…' : 'Créer la RMA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}