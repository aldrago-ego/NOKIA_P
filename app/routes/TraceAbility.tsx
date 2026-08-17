import React, { useState } from 'react';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';
import { useProject } from './project';
import { useFetchState } from '../useFetchState';
import ErrorState from '../Component/ErrorState';
import { useTranslation } from 'react-i18next';

interface Deployment {
  id: number;
  quantity: number;
  deployedAt: string;
  siteName: string | null;
  partNumber: string;
  productName: string;
  smrNumber: string | null;
}

export default function TraceabilityPage() {
  const { t } = useTranslation();
  const { selectedProjectId, selectedProject } = useProject();
  const [search, setSearch] = useState('');

  const {
    data: deployments,
    loading: deploymentsLoading,
    error: deploymentsError,
    retry: retryDeployments,
  } = useFetchState<Deployment[] | null>(
    async (signal) => {
      if (selectedProjectId == null) return null;
      const res = await apiFetch(
        `${API_BASE}/SmrRequests/deployments?projectId=${selectedProjectId}`,
        { signal },
      );
      return res.json();
    },
    [selectedProjectId],
  );

  const grouped = React.useMemo(() => {
    if (!deployments) return new Map<string, Deployment[]>();
    const filtered = search.trim()
      ? deployments.filter((d) =>
          (d.siteName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          d.partNumber.toLowerCase().includes(search.toLowerCase()) ||
          d.productName.toLowerCase().includes(search.toLowerCase())
        )
      : deployments;
    const map = new Map<string, Deployment[]>();
    filtered.forEach((d) => {
      const key = d.siteName ?? t('traceability.unknownSite');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [deployments, search]);

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full text-black">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold ">{t('traceability.title')}</h1>
        {selectedProject && (
          <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2 py-0.5 rounded-full font-semibold">
            {selectedProject.code} — {selectedProject.name}
          </span>
        )}
      </div>
      <p className="text-sm mb-6">{t('traceability.subtitle')}</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('traceability.searchPlaceholder')}
        className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-2  mb-5 text-black"
      />

      {deploymentsError ? (
        <ErrorState message={deploymentsError} onRetry={retryDeployments} />
      ) : deploymentsLoading || !deployments ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white border border-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : grouped.size === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">{t('traceability.noMaterialDeployed')}</p>
      ) : (
        Array.from(grouped.entries()).map(([siteName, items]) => (
          <div key={siteName} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <span className="font-bold text-sm text-[#0F172A]">{siteName}</span>
              <span className="text-xs text-slate-400 ml-2">{t('traceability.deliveryCount', { count: items.length })}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left font-medium px-5 py-2">{t('common.code')}</th>
                  <th className="text-left font-medium px-5 py-2">{t('common.description')}</th>
                  <th className="text-right font-medium px-5 py-2">{t('traceability.quantity')}</th>
                  <th className="text-left font-medium px-5 py-2">{t('traceability.viaSmr')}</th>
                  <th className="text-left font-medium px-5 py-2">{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="px-5 py-2 font-mono text-xs text-[#124191]">{d.partNumber}</td>
                    <td className="px-5 py-2">{d.productName}</td>
                    <td className="px-5 py-2 text-right font-mono">{d.quantity}</td>
                    <td className="px-5 py-2 font-mono text-xs text-slate-500">{d.smrNumber ?? '—'}</td>
                    <td className="px-5 py-2 text-xs text-slate-400">{new Date(d.deployedAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}