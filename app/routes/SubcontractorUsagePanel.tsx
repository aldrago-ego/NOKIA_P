import React, { useEffect, useState } from 'react';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';

interface SubcontractorStat { subcontractor: string; totalQuantity: number; distinctSites: number; distinctMaterials: number; }
interface UsageItem { partNumber: string; name: string; totalDeployed: number; }

export default function SubcontractorUsagePanel({ projectId }: { projectId: number }) {
  const [stats, setStats] = useState<SubcontractorStat[] | null>(null);
  const [ranking, setRanking] = useState<{ mostUsed: UsageItem[]; leastUsed: UsageItem[] } | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/SmrRequests/deployments/by-subcontractor?projectId=${projectId}`)
      .then((r) => r.json()).then(setStats).catch(() => setStats([]));
    apiFetch(`${API_BASE}/SmrRequests/deployments/usage-ranking?projectId=${projectId}&take=5`)
      .then((r) => r.json()).then(setRanking).catch(() => setRanking({ mostUsed: [], leastUsed: [] }));
  }, [projectId]);

  const maxQty = stats && stats.length > 0 ? Math.max(...stats.map((s) => s.totalQuantity)) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Répartition par sous-traitant */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-[#0F172A] mb-4">Matériel utilisé par sous-traitant</h3>
        {!stats ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : stats.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Aucun déploiement enregistré pour ce projet.</p>
        ) : (
          <div className="space-y-3">
            {stats.map((s) => (
              <div key={s.subcontractor}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{s.subcontractor}</span>
                  <span className="font-mono text-slate-400">{s.totalQuantity.toLocaleString('fr-FR')} · {s.distinctSites} sites</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#124191] rounded-full transition-all duration-500"
                    style={{ width: `${(s.totalQuantity / maxQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plus / moins utilisé */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-[#0F172A] mb-4">Matériel le plus / moins déployé</h3>
        {!ranking ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Le plus déployé</p>
              {ranking.mostUsed.length === 0 ? (
                <p className="text-xs text-slate-400">—</p>
              ) : (
                ranking.mostUsed.map((m) => (
                  <div key={m.partNumber} className="text-xs mb-1.5">
                    <div className="font-mono text-[#124191]">{m.partNumber}</div>
                    <div className="text-slate-500 truncate">{m.name} · <span className="font-semibold">{m.totalDeployed}</span></div>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-2">Le moins déployé</p>
              {ranking.leastUsed.length === 0 ? (
                <p className="text-xs text-slate-400">—</p>
              ) : (
                ranking.leastUsed.map((m) => (
                  <div key={m.partNumber} className="text-xs mb-1.5">
                    <div className="font-mono text-[#124191]">{m.partNumber}</div>
                    <div className="text-slate-500 truncate">{m.name} · <span className="font-semibold">{m.totalDeployed}</span></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}