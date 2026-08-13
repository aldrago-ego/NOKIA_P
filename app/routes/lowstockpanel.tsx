import React from "react";
import { apiFetch } from "../apiFetch";
import { useFetchState } from "../useFetchState";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

interface LowStockItem {
  partNumber: string;
  name: string;
  category: string;
  quantity: number;
  threshold: number;
}

export default function LowStockPanel() {
  const {
    data: items,
    error,
    retry,
  } = useFetchState<LowStockItem[]>(
    (signal) =>
      apiFetch(`${API_BASE}/Categories/low-stock-items`, { signal }).then(
        (r) => r.json(),
      ),
    [],
  );

  // Bandeau d'alerte : pas de skeleton (silencieux tant que rien à signaler), mais
  // une erreur persistante ne doit pas disparaître silencieusement — elle est signalée.
  if (error) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        <span>Impossible de vérifier les seuils de stock bas.</span>
        <button
          onClick={retry}
          className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-slate-200 text-xs font-semibold text-[#0F172A] rounded-lg px-3 py-1.5 hover:border-[#124191] hover:shadow-sm transition-all"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl overflow-hidden animate-[fadeIn_.3s_ease]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200">
        <svg className="w-4 h-4 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span className="text-sm font-semibold text-red-800">
          {items.length} référence(s) sous leur seuil d'alerte
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-red-400 border-b border-red-100">
            <th className="text-left font-medium px-4 py-2">Code</th>
            <th className="text-left font-medium px-4 py-2">Description</th>
            <th className="text-right font-medium px-4 py-2">Qté en stock</th>
            <th className="text-right font-medium px-4 py-2">Seuil</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.partNumber} className="border-b border-red-100 last:border-0">
              <td className="px-4 py-2 font-mono text-red-700 text-xs">{it.partNumber}</td>
              <td className="px-4 py-2 text-slate-700">{it.name}</td>
              <td className="px-4 py-2 text-right font-mono font-bold text-red-600">{it.quantity}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">{it.threshold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}