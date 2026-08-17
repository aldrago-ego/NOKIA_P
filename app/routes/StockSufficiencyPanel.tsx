import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../apiFetch";
import { API_BASE } from "../config";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";

interface SufficiencyRow {
  partNumber: string;
  name: string;
  exported: number;
  pending: number;
  currentStock: number;
  totalAvailable: number;
  isOk: boolean;
}

export default function StockSufficiencyPanel({
  projectId,
}: {
  projectId: number;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    data: rows,
    loading,
    error,
    retry,
  } = useFetchState<SufficiencyRow[]>(
    (signal) =>
      apiFetch(
        `${API_BASE}/SmrRequests/deployments/stock-sufficiency?projectId=${projectId}`,
        { signal },
      ).then((r) => r.json()),
    [projectId],
  );

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  if (loading || !rows) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="h-40 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 text-left hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-sm font-bold text-[#0F172A]">
          {t('stockSufficiency.panelTitle')}
        </h3>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {collapsed ? null : rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-10">
          {t('stockSufficiency.noData')}
        </p>
      ) : (
        <div className="overflow-x-auto animate-[slideDown_.2s_ease]">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-xs text-white bg-[#124191]">
                <th className="text-left font-semibold px-4 py-2">{t('common.code')}</th>
                <th className="text-left font-semibold px-4 py-2">
                  {t('common.description')}
                </th>
                <th className="text-right font-semibold px-4 py-2">
                  {t('stockSufficiency.exported')}
                </th>
                <th className="text-right font-semibold px-4 py-2">
                  {t('stockSufficiency.pending')}
                </th>
                <th className="text-right font-semibold px-4 py-2">{t('stockSufficiency.stock')}</th>
                <th className="text-right font-semibold px-4 py-2">
                  {t('stockSufficiency.available')}
                </th>
                <th className="text-center font-semibold px-4 py-2">
                  {t('common.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.partNumber}
                  className={`border-b border-slate-50 transition-colors ${
                    row.isOk
                      ? "hover:bg-[#EAF1FC]"
                      : "bg-red-50/30 border-l-4 border-l-red-400 hover:bg-red-50/50"
                  }`}
                >
                  <td className="px-4 py-2 font-mono text-[#124191] text-xs">
                    {row.partNumber}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{row.name}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-slate-700">
                    {row.exported}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-500">
                    {row.pending}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-500">
                    {row.currentStock}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-[#0F172A]">
                    {row.totalAvailable}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {row.isOk ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        OK
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        NOK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
