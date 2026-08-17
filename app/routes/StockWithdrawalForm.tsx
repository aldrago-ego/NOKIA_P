import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface StockLine { hardwareProductId: number; partNumber: string; name: string; totalQuantity: number; defectiveQuantity: number; }
interface DraftLine { hardwareProductId: number; partNumber: string; name: string; available: number; quantity: number; }

export default function StockWithdrawalForm({
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
  const { t } = useTranslation();
  const [partyName, setPartyName] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function available(l: StockLine) { return l.totalQuantity - l.defectiveQuantity; }

  const filtered = stockLines.filter(
    (l) => available(l) > 0 && !lines.some((x) => x.hardwareProductId === l.hardwareProductId) &&
      (search.trim() === '' || l.partNumber.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()))
  );

  function addLine(l: StockLine) {
    setLines((prev) => [...prev, { hardwareProductId: l.hardwareProductId, partNumber: l.partNumber, name: l.name, available: available(l), quantity: 1 }]);
    setSearch('');
  }
  function updateQty(id: number, v: number) {
    setLines((prev) => prev.map((l) => (l.hardwareProductId === id ? { ...l, quantity: Math.max(1, Math.min(v, l.available)) } : l)));
  }
  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.hardwareProductId !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyName.trim()) return setError(t('forms.withdrawal.clientNameRequired'));
    if (lines.length === 0) return setError(t('forms.withdrawal.addAtLeastOneRef'));

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/StockLoans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          warehouseId,
          direction: 'Loaned',
          partyName,
          notes,
          items: lines.map((l) => ({ hardwareProductId: l.hardwareProductId, partNumber: l.partNumber, description: l.name, quantity: l.quantity })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || t('forms.withdrawal.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[86vh] overflow-y-auto shadow-2xl animate-[slideUp_.3s_ease]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-[#0F172A]">{t('forms.withdrawal.title')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
            {t('forms.withdrawal.directNoticeSmr')}
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('forms.withdrawal.clientName')}</label>
          <input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={t('forms.withdrawal.clientNamePlaceholder')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('common.notes')}</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('forms.withdrawal.notesPlaceholder')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4" />

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('forms.withdrawal.addMaterial')}</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('forms.withdrawal.searchPlaceholder')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
          {search.trim() !== '' && (
            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto mb-3">
              {filtered.length === 0 ? (
                <div className="p-3 text-xs text-slate-400">{t('forms.withdrawal.noAvailableMatch')}</div>
              ) : (
                filtered.slice(0, 8).map((l) => (
                  <button type="button" key={l.hardwareProductId} onClick={() => addLine(l)} className="w-full text-left px-3 py-2 text-sm hover:bg-[#EAF1FC] border-b border-slate-50 last:border-0">
                    <span className="font-mono text-[#124191]">{l.partNumber}</span> <span className="text-slate-600">{l.name}</span>
                    <span className="text-xs text-emerald-600 float-right">{t('forms.withdrawal.available', { count: available(l) })}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {lines.length > 0 && (
            <table className="w-full text-sm mb-4">
              <tbody>
                {lines.map((l) => (
                  <tr key={l.hardwareProductId} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-[#124191]">{l.partNumber}</td>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-right">
                      <input type="number" min={1} max={l.available} value={l.quantity} onChange={(e) => updateQty(l.hardwareProductId, parseInt(e.target.value) || 1)} className="w-16 text-right border border-slate-200 rounded-md px-2 py-1 text-xs font-mono" />
                    </td>
                    <td className="py-2 text-right"><button type="button" onClick={() => removeLine(l.hardwareProductId)} className="text-slate-300 hover:text-red-500 text-xs">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
              {submitting ? t('forms.withdrawal.processing') : t('forms.withdrawal.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}