import React, { useState } from 'react';
import { useAuth } from './authContext';
import RmaCreateForm from './RmaCreateForm';
import { apiFetch } from '../apiFetch';
import { useFetchState } from '../useFetchState';
import ErrorState from '../Component/ErrorState';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface RmaItem { id: number; quantity: number; partNumber: string; name: string; }
interface Rma {
  id: number;
  rmaNumber: string;
  status: 'Pending' | 'Shipped' | 'Closed';
  notes: string | null;
  courierReference: string | null;
  createdDate: string;
  shippedDate: string | null;
  closedDate: string | null;
  items: RmaItem[];
}

// t est passé en paramètre — appelé dans une boucle JSX, un hook n'y serait pas légal.
function statusPill(status: string, t: TFunction) {
  if (status === 'Shipped') return <span className="text-xs font-semibold text-[#124191] bg-[#EAF1FC] px-2 py-0.5 rounded-full">{t('rma.status.shipped')}</span>;
  if (status === 'Closed') return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{t('rma.status.closed')}</span>;
  return <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{t('rma.status.pending')}</span>;
}

export default function RmaDetailPanel({ projectId, limit }: { projectId: number; limit?: number }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: rmas,
    loading: rmasLoading,
    error,
    retry: load,
  } = useFetchState<Rma[]>(
    (signal) =>
      apiFetch(`${API_BASE}/RmaRequests?projectId=${projectId}`, {
        signal,
      }).then((r) => r.json()),
    [projectId],
  );

  const displayed = limit && rmas ? rmas.slice(0, limit) : rmas;

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-semibold text-white bg-[#124191] rounded-lg px-3 py-1.5 hover:bg-[#0d3373]"
          >
            {t('rma.newRma')}
          </button>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rmasLoading || !displayed ? (
        <div className="space-y-2 p-1">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-slate-100 rounded animate-pulse" />)}</div>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">{t('rma.noRmaForProject')}</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-100 rounded-lg text-sm hover:bg-[#EAF1FC] transition-colors text-left"
            >
              <span className="font-mono text-[#124191] font-semibold">{r.rmaNumber}</span>
              <span className="text-slate-500">{t('rma.referenceCount', { count: r.items.length })}</span>
              {statusPill(r.status, t)}
            </button>
          ))}
        </div>
      )}

      {limit && rmas && rmas.length > limit && (
        <a href="/rma" className="block text-xs font-semibold text-[#124191] hover:underline mt-3">
          {t('rma.viewAll')}
        </a>
      )}

      {selectedId != null && (
        <RmaModal rmaId={selectedId} onClose={() => setSelectedId(null)} onDone={() => { setSelectedId(null); load(); }} />
      )}
      {showCreate && (
        <RmaCreateForm projectId={projectId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </>
  );
}

function RmaModal({ rmaId, onClose, onDone }: { rmaId: number; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  // erreur de mutation (expédition/clôture/annulation) — distincte de l'erreur de chargement
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [courierRef, setCourierRef] = useState('');
  const [actor, setActor] = useState('');

  const {
    data: rma,
    loading: rmaLoading,
    error: loadError,
    retry: retryRma,
  } = useFetchState<any>(
    (signal) =>
      apiFetch(`${API_BASE}/RmaRequests/${rmaId}`, { signal }).then((r) => r.json()),
    [rmaId],
  );

  async function handleShip() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/RmaRequests/${rmaId}/ship`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierReference: courierRef, performedBy: actor || 'Admin' }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || t('rma.shipFailed'));
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/RmaRequests/${rmaId}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedBy: actor || 'Admin' }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || t('rma.closeFailed'));
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      const res = await apiFetch(`${API_BASE}/RmaRequests/${rmaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || t('rma.cancelFailed'));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-[#0F172A]">RMA {rma?.rmaNumber ?? '…'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 text-sm text-black">
          {loadError ? (
            <ErrorState message={loadError} onRetry={retryRma} />
          ) : rmaLoading || !rma ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : (
            <>
              <div className="mb-4">{statusPill(rma.status, t)}</div>

              <table className="w-full text-sm mb-4 text-black">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left font-medium py-2">{t('common.code')}</th>
                    <th className="text-left font-medium py-2">{t('common.description')}</th>
                    <th className="text-right font-medium py-2">{t('rma.returnedQty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rma.items.map((it: any) => (
                    <tr key={it.id} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-[#124191]">{it.partNumber}</td>
                      <td className="py-2">{it.name}</td>
                      <td className="py-2 text-right font-mono">{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rma.notes && <p className="text-xs text-slate-500 mb-3">{t('rma.noteLabel')} {rma.notes}</p>}
              {rma.courierReference && <p className="text-xs text-slate-500 mb-3">{t('rma.courierRefLabel')} <span className="font-mono">{rma.courierReference}</span></p>}

              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}

              {isAdmin && rma.status === 'Pending' && (
                <>
                  <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder={t('rma.yourName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
                  <input value={courierRef} onChange={(e) => setCourierRef(e.target.value)} placeholder={t('rma.courierRefPlaceholder')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCancel} disabled={busy} className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg">{t('rma.cancelRma')}</button>
                    <button onClick={handleShip} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
                      {busy ? t('rma.processing') : t('rma.markShipped')}
                    </button>
                  </div>
                </>
              )}

              {isAdmin && rma.status === 'Shipped' && (
                <div className="flex justify-end">
                  <button onClick={handleClose} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60">
                    {busy ? t('rma.processing') : t('rma.closeRma')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}