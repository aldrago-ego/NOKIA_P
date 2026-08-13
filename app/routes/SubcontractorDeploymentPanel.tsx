import React, { useEffect, useState } from "react";
import { apiFetch } from "../apiFetch";
import { API_BASE } from "../config";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";

interface SubStat { subcontractor: string; totalQuantity: number; distinctSites: number; distinctMaterials: number; }
interface UsageItem { partNumber: string; name: string; totalDeployed: number; totalReceived?: number; }

const COLORS = ["#124191", "#33D6C7", "#F2790B", "#7C3AED", "#DC2626"];

export default function SubcontractorDeploymentPanel({ projectId }: { projectId: number }) {
  const [mounted, setMounted] = useState(false); // déclenche l'animation de croissance des barres

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    retry: retryStats,
  } = useFetchState<SubStat[]>(
    (signal) =>
      apiFetch(
        `${API_BASE}/SmrRequests/deployments/by-subcontractor?projectId=${projectId}`,
        { signal },
      ).then((r) => r.json()),
    [projectId],
  );

  const {
    data: ranking,
    loading: rankingLoading,
    error: rankingError,
    retry: retryRanking,
  } = useFetchState<{ mostUsed: UsageItem[]; leastUsed: UsageItem[] }>(
    (signal) =>
      apiFetch(
        `${API_BASE}/SmrRequests/deployments/usage-ranking?projectId=${projectId}&take=5`,
        { signal },
      ).then((r) => r.json()),
    [projectId],
  );

  useEffect(() => {
    // Petit délai avant de déclencher la transition CSS, pour garantir que le navigateur
    // parte bien de width:0 avant d'animer vers la vraie valeur (sinon la transition
    // ne se joue pas si la valeur finale est déjà présente au premier rendu).
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [stats]);

  const maxQty = stats && stats.length > 0 ? Math.max(...stats.map((s) => s.totalQuantity)) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Diagramme en bâtonnets */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-[slideDown_.3s_ease]">
        <h3 className="text-sm font-bold text-[#0F172A] mb-5">Matériel déployé par sous-traitant</h3>
        {statsError ? (
          <ErrorState message={statsError} onRetry={retryStats} />
        ) : statsLoading || !stats ? (
          <div className="h-48 bg-slate-100 rounded animate-pulse" />
        ) : stats.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-10">Aucun déploiement enregistré pour ce projet.</p>
        ) : (
          <div className="flex items-end gap-4 h-48 px-2">
            {stats.map((s, i) => {
              const pct = maxQty > 0 ? (s.totalQuantity / maxQty) * 100 : 0;
              return (
                <div key={s.subcontractor} className="flex-1 flex flex-col items-center justify-end h-full group">
                  {/* Valeur au survol / toujours visible au-dessus de la barre */}
                  <span className="text-xs font-bold text-[#0F172A] mb-1.5 transition-opacity">
                    {s.totalQuantity.toLocaleString("fr-FR")}
                  </span>
                  {/* Le bâtonnet lui-même — grandit depuis 0 au montage */}
                  <div
                    className="w-full max-w-[42px] rounded-t-lg transition-all ease-out group-hover:opacity-80 cursor-default"
                    style={{
                      height: mounted ? `${pct}%` : "0%",
                      backgroundColor: COLORS[i % COLORS.length],
                      transitionDuration: "700ms",
                      transitionDelay: `${i * 80}ms`,
                      minHeight: s.totalQuantity > 0 ? "4px" : "0",
                    }}
                    title={`${s.subcontractor} — ${s.totalQuantity} unités, ${s.distinctSites} sites`}
                  />
                  {/* Étiquette du sous-traitant */}
                  <span className="text-[11px] font-semibold text-slate-600 mt-2 text-center truncate w-full">
                    {s.subcontractor}
                  </span>
                  <span className="text-[10px] text-slate-400">{s.distinctSites} sites</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plus / moins déployé — inchangé */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-[slideDown_.3s_ease]">
        <h3 className="text-sm font-bold text-[#0F172A] mb-4">Matériel le plus / moins déployé</h3>
        {rankingError ? (
          <ErrorState message={rankingError} onRetry={retryRanking} />
        ) : rankingLoading || !ranking ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Le plus déployé</p>
              {ranking.mostUsed.length === 0 ? <p className="text-xs text-slate-400">—</p> : ranking.mostUsed.map((m) => (
                <div key={m.partNumber} className="text-xs mb-1.5">
                  <div className="font-mono text-[#124191]">{m.partNumber}</div>
                  <div className="text-slate-500 truncate">{m.name} · <span className="font-semibold">{m.totalDeployed}</span></div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-2">Reçu mais non déployé</p>
              {ranking.leastUsed.length === 0 ? (
                <p className="text-xs text-slate-400">Tout le matériel reçu a été déployé.</p>
              ) : ranking.leastUsed.map((m) => (
                <div key={m.partNumber} className="text-xs mb-1.5">
                  <div className="font-mono text-[#124191]">{m.partNumber}</div>
                  <div className="text-slate-500 truncate">
                    {m.name} · <span className="font-semibold text-amber-700">{m.totalReceived} reçu(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}