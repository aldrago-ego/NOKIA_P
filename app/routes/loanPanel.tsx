import React, { useState } from 'react';
import { apiFetch } from '../apiFetch';
import { useAuth } from './authContext';
import { useFetchState } from '../useFetchState';
import ErrorState from '../Component/ErrorState';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface LoanItem { id: number; partNumber: string; description: string; quantity: number; }
interface Loan {
  id: number;
  direction: 'Loaned' | 'Borrowed';
  partyName: string;
  notes: string | null;
  status: 'Active' | 'Returned';
  loanDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  items: LoanItem[];
}

export default function LoansPanel({ projectId }: { projectId: number }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'Loaned' | 'Borrowed'>('Loaned');
  const [showBorrowForm, setShowBorrowForm] = useState(false);

  const {
    data: loans,
    loading: loansLoading,
    error,
    retry: load,
  } = useFetchState<Loan[]>(
    (signal) =>
      apiFetch(`${API_BASE}/StockLoans?projectId=${projectId}&direction=${tab}`, {
        signal,
      }).then((r) => r.json()),
    [projectId, tab],
  );

  async function handleReturn(id: number) {
    const res = await apiFetch(`${API_BASE}/StockLoans/${id}/return`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performedBy: 'Admin' }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={() => setTab('Loaned')} className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${tab === 'Loaned' ? 'bg-[#124191] text-white' : 'bg-slate-100 text-slate-600'}`}>
            Prêtés
          </button>
          <button onClick={() => setTab('Borrowed')} className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${tab === 'Borrowed' ? 'bg-[#124191] text-white' : 'bg-slate-100 text-slate-600'}`}>
            Empruntés
          </button>
        </div>
        {isAdmin && tab === 'Borrowed' && (
          <button onClick={() => setShowBorrowForm(true)} className="text-xs font-semibold text-white bg-[#124191] rounded-lg px-3 py-1.5 hover:bg-[#0d3373]">
            + Nouvel emprunt
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loansLoading || !loans ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-slate-100 rounded animate-pulse" />)}</div>
      ) : loans.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Aucun {tab === 'Loaned' ? 'prêt' : 'emprunt'} enregistré.</p>
      ) : (
        <div className="space-y-2">
          {loans.map((l) => (
            <div key={l.id} className="border border-slate-100 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-[#0F172A]">{l.partyName}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.status === 'Active' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {l.status === 'Active' ? 'En cours' : 'Rendu'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                {l.items.map((i) => `${i.partNumber} (${i.quantity})`).join(', ')}
              </div>
              {l.notes && <p className="text-xs text-slate-400 mb-2">{l.notes}</p>}
              {isAdmin && l.status === 'Active' && (
                <button onClick={() => handleReturn(l.id)} className="text-xs font-semibold text-[#124191] hover:underline">
                  Marquer comme rendu
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showBorrowForm && (
        <BorrowForm projectId={projectId} onClose={() => setShowBorrowForm(false)} onCreated={() => { setShowBorrowForm(false); load(); }} />
      )}
    </div>
  );
}

function BorrowForm({ projectId, onClose, onCreated }: { projectId: number; onClose: () => void; onCreated: () => void }) {
  const [partyName, setPartyName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: warehouses,
    error: warehousesError,
    retry: retryWarehouses,
  } = useFetchState<{ id: number }[]>(
    (signal) => apiFetch(`${API_BASE}/Warehouses`, { signal }).then((r) => r.json()),
    [],
  );
  const warehouseId = warehouses?.[0]?.id ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyName.trim() || !partNumber.trim()) return setError('Source et référence requises.');
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/StockLoans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, warehouseId, direction: 'Borrowed', partyName, notes,
          items: [{ partNumber, description, quantity }],
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">Nouvel emprunt</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
          {warehousesError && (
            <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              <span>Impossible de déterminer l'entrepôt par défaut.</span>
              <button type="button" onClick={retryWarehouses} className="font-semibold underline flex-shrink-0">
                Réessayer
              </button>
            </div>
          )}
          <input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Emprunté auprès de…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
          <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="Code matériel" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
              {submitting ? 'Création…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}