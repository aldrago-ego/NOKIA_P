import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';
import { useFetchState } from '../useFetchState';

interface StockStatus { name: string; threshold: number; currentQuantity: number; isLow: boolean; }

// Bandeau compact — vue par catégorie, complémentaire à LowStockPanel (détail par référence).
export default function LowStockAlert() {
  const { t } = useTranslation();
  const {
    data: statuses,
    error,
    retry,
  } = useFetchState<StockStatus[]>(
    (signal) =>
      apiFetch(`${API_BASE}/Categories/stock-status`, { signal }).then((r) => r.json()),
    [],
  );

  // Bandeau silencieux tant que rien à signaler ; une erreur persistante ne doit
  // pas disparaître silencieusement pour autant — elle est signalée avec un retry.
  if (error) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 animate-[fadeIn_.3s_ease]">
        <span>{t('warehouse.lowStockAlert.checkFailed')}</span>
        <button
          onClick={retry}
          className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-slate-200 text-xs font-semibold text-[#0F172A] rounded-lg px-3 py-1.5 hover:border-[#124191] hover:shadow-sm transition-all duration-200"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const lowOnes = statuses?.filter((s) => s.isLow) ?? [];
  if (!statuses || lowOnes.length === 0) return null;

  return (
    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl overflow-hidden animate-[fadeIn_.3s_ease]">
      <div className="flex items-center gap-2 px-4 py-3">
        <svg className="w-4 h-4 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-sm font-semibold text-red-800">
          {t('warehouse.lowStockAlert.lowStock', {
            details: lowOnes.map((s) => `${s.name} (${s.currentQuantity}/${s.threshold})`).join(', '),
          })}
        </span>
      </div>
    </div>
  );
}
