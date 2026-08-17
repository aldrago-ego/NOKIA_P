import React, { useState } from "react";
import { apiFetch } from "../apiFetch";
import { API_BASE } from "../config";
import { useProject } from "./project";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";
import { useTranslation } from "react-i18next";

interface ActivityLog {
  id: number;
  type: string;
  description: string;
  performedBy: string;
  timestamp: string;
}

const ACTIVITY_ICON: Record<string, { icon: string; color: string }> = {
  SHIPMENTS_IMPORTED: { icon: "⬇", color: "text-[#124191]" },
  DELIVERY_CONFIRMED: { icon: "✓", color: "text-emerald-600" },
  SHIPMENT_CANCELLED: { icon: "✕", color: "text-red-600" },
  DEFECT_MARKED: { icon: "⚠", color: "text-red-600" },
  SMR_CREATED: { icon: "▤", color: "text-amber-600" },
  SMR_APPROVED: { icon: "✓", color: "text-emerald-600" },
  SMR_REJECTED: { icon: "✕", color: "text-red-600" },
  RMA_CREATED: { icon: "↩", color: "text-amber-600" },
  RMA_SHIPPED: { icon: "→", color: "text-[#124191]" },
  RMA_CLOSED: { icon: "✓", color: "text-emerald-600" },
  STOCK_LOANED: { icon: "↗", color: "text-amber-600" },
  STOCK_BORROWED: { icon: "↙", color: "text-[#124191]" },
  STOCK_LOAN_RETURNED: { icon: "✓", color: "text-emerald-600" },
  STOCK_CORRECTED: { icon: "✎", color: "text-amber-600" },
};

const PAGE_SIZE = 25;

export default function HistoryPage() {
  const { t } = useTranslation();
  const { selectedProjectId, selectedProject } = useProject();

  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: types } = useFetchState<string[] | null>(
    async (signal) => {
      if (selectedProjectId == null) return null;
      const res = await apiFetch(
        `${API_BASE}/ActivityLogs/types?projectId=${selectedProjectId}`,
        { signal },
      );
      return res.json();
    },
    [selectedProjectId],
  );

  const {
    data: page_,
    loading: logsLoading,
    error: logsError,
    retry: retryLogs,
  } = useFetchState<{ items: ActivityLog[]; total: number; totalPages: number } | null>(
    async (signal) => {
      if (selectedProjectId == null) return null;
      const params = new URLSearchParams({
        projectId: String(selectedProjectId),
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (selectedType) params.set("type", selectedType);

      const res = await apiFetch(`${API_BASE}/ActivityLogs/history?${params}`, {
        signal,
      });
      return res.json();
    },
    [selectedProjectId, page, selectedType],
  );

  const logs = page_?.items ?? null;
  const total = page_?.total ?? 0;
  const totalPages = page_?.totalPages ?? 1;

  function handleTypeChange(value: string) {
    setSelectedType(value);
    setPage(1); // revient à la première page à chaque changement de filtre
  }

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
        <h1 className="text-lg sm:text-xl font-bold text-black">
          {t("history.title")}
        </h1>
        {selectedProject && (
          <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2 py-0.5 rounded-full font-semibold">
            {selectedProject.code} — {selectedProject.name}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">
        {t("history.subtitle")}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <select
          value={selectedType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full sm:w-auto border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#124191]/30 text-black focus:border-[#124191] transition-all"
        >
          <option value="">{t("history.allTypes")}</option>
          {types?.map((activityType) => (
            <option key={activityType} value={activityType}>
              {activityType.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {total > 0 && (
          <span className="text-xs text-slate-400">
            {t("history.totalCount", { count: total })}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {logsError ? (
          <ErrorState message={logsError} onRetry={retryLogs} />
        ) : logsLoading || !logs ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-400 text-sm">
            {t("history.noActivities")}
          </p>
        ) : (
          <>
            {/* Vue tableau — desktop uniquement */}
            <table className="w-full text-sm hidden sm:table">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="text-left font-medium px-5 py-3">{t("common.date")}</th>
                  <th className="text-left font-medium px-5 py-3">{t("common.type")}</th>
                  <th className="text-left font-medium px-5 py-3">
                    {t("common.description")}
                  </th>
                  <th className="text-left font-medium px-5 py-3">{t("common.by")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((a) => {
                  const cfg = ACTIVITY_ICON[a.type] ?? {
                    icon: "•",
                    color: "text-slate-400",
                  };
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-slate-50 hover:bg-[#EAF1FC] transition-colors"
                    >
                      <td className="px-5 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${cfg.color}`}>
                          {cfg.icon} {a.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {a.description}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {a.performedBy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Vue cartes empilées — mobile uniquement */}
            <div className="sm:hidden divide-y divide-slate-50">
              {logs.map((a) => {
                const cfg = ACTIVITY_ICON[a.type] ?? {
                  icon: "•",
                  color: "text-slate-400",
                };
                return (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold text-sm ${cfg.color}`}>
                        {cfg.icon} {a.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mb-1">
                      {a.description}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t("history.byLabel", { name: a.performedBy })}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#124191] bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 whitespace-nowrap"
          >
            ← <span className="hidden xs:inline">{t("history.previous")}</span>
          </button>
          <span className="text-xs text-slate-400">
            {t("common.page")} {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm font-semibold text-[#124191] bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            {t("history.next")} →
          </button>
        </div>
      )}
    </div>
  );
}
