import React from "react";
import { apiFetch } from "../apiFetch";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

interface MatrixRow {
  partNumber: string;
  name: string;
  bySubcontractor: Record<string, number>;
  total: number;
  received: number; // NOUVEAU
}

export default function DeploymentMatrixPanel({
  projectId,
}: {
  projectId: number;
}) {
  const {
    data,
    loading,
    error,
    retry,
  } = useFetchState<{
    subcontractors: string[];
    rows: MatrixRow[];
  }>(
    (signal) =>
      apiFetch(
        `${API_BASE}/SmrRequests/deployments/matrix?projectId=${projectId}`,
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

  if (loading || !data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="h-40 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (data.rows.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-bold text-[#0F172A]">
          Matériel déployé par sous-traitant
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr>
              <th colSpan={2} className="border-b border-slate-100 px-4 py-2" />
              <th
                colSpan={data.subcontractors.length}
                className="text-center text-xs font-bold text-white bg-[#F2790B] px-4 py-2"
              >
                Sous-traitants
              </th>
              <th className="border-b border-slate-100 px-4 py-2" />
            </tr>
            <tr className="text-xs text-white bg-[#124191]">
              <th className="text-left font-semibold px-4 py-2">Code</th>
              <th className="text-left font-semibold px-4 py-2">Description</th>
              {data.subcontractors.map((s) => (
                <th
                  key={s}
                  className="text-right font-semibold px-4 py-2 whitespace-nowrap"
                >
                  {s}
                </th>
              ))}
              <th className="text-right font-semibold px-4 py-2">Reçu</th>
              <th className="text-right font-semibold px-4 py-2 bg-[#0d3373]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                key={row.partNumber}
                className="border-b border-slate-50 hover:bg-[#EAF1FC] transition-colors"
              >
                <td className="px-4 py-2 font-mono text-[#124191] text-xs">
                  {row.partNumber}
                </td>
                <td className="px-4 py-2 text-slate-700">{row.name}</td>
                {data.subcontractors.map((s) => {
                  const qty = row.bySubcontractor[s] ?? 0;
                  return (
                    <td
                      key={s}
                      className="px-4 py-2 text-right font-mono text-xs"
                    >
                      {qty > 0 ? (
                        <span className="text-[#F2790B] font-bold">{qty}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2 text-right font-mono text-emerald-600 font-semibold">
                  {row.received}
                </td>
                <td
                  className={`px-4 py-2 text-right font-mono font-bold bg-slate-50 ${
                    row.total > row.received ? "text-red-600" : "text-[#0F172A]"
                  }`}
                >
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
