import React, { useEffect, useState } from 'react';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';

interface StockStatus { name: string; threshold: number; currentQuantity: number; isLow: boolean; }

export default function LowStockAlert() {
  const [statuses, setStatuses] = useState<StockStatus[] | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/Categories/stock-status`)
      .then((r) => r.json())
      .then(setStatuses)
      .catch(() => setStatuses([]));
  }, []);

  const lowOnes = statuses?.filter((s) => s.isLow) ?? [];
  if (!statuses || lowOnes.length === 0) return null;

  return (
    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl overflow-hidden animate-[fadeIn_.3s_ease]">
      <div className="flex items-center gap-2 px-4 py-3">
        <svg className="w-4 h-4 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-sm font-semibold text-red-800">
          Stock bas — {lowOnes.map((s) => `${s.name} (${s.currentQuantity}/${s.threshold})`).join(', ')}
        </span>
      </div>
    </div>
  );
}