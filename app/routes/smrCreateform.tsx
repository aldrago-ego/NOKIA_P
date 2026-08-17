import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "./project";
import {apiFetch} from "../apiFetch";
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
import SiteCreateForm from "./sitesCreateForm";
import LoadingButton from "../Component/LoadingButton";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";

interface Client {
  id: number;
  name: string;
}

interface Site {
  id: number;
  siteName: string;
}
interface Warehouse {
  id: number;
  name: string;
}

interface StockLine {
  hardwareProductId: number;
  partNumber: string;
  name: string;
  totalQuantity: number;
  defectiveQuantity: number;
}

interface DraftLine {
  hardwareProductId: number;
  partNumber: string;
  name: string;
  available: number;
  requestedQuantity: number;
}

export default function SmrCreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const { selectedProjectId } = useProject();
  const [showSiteForm, setShowSiteForm] = useState(false);

  const [smrNumber, setSmrNumber] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Chargement initial : entrepôt, clients, sites, stock disponible ----------
  const {
    data: warehouses,
    error: warehousesError,
    retry: retryWarehouses,
  } = useFetchState<Warehouse[]>(
    (signal) =>
      apiFetch(`${API_BASE}/Warehouses`, { signal }).then((r) => r.json()),
    [],
  );
  const warehouse = warehouses?.[0] ?? null;

  const {
    data: clients,
    error: clientsError,
    retry: retryClients,
  } = useFetchState<Client[]>(
    (signal) => apiFetch(`${API_BASE}/Clients`, { signal }).then((r) => r.json()),
    [],
  );

  const {
    data: sites,
    error: sitesError,
    retry: retrySites,
  } = useFetchState<Site[]>(
    (signal) => apiFetch(`${API_BASE}/Sites`, { signal }).then((r) => r.json()),
    [],
  );

  const {
    data: stockLines,
    loading: stockLoading,
    error: stockError,
    retry: retryStock,
  } = useFetchState<StockLine[] | null>(
    async (signal) => {
      if (!warehouse) return null;
      const res = await apiFetch(
        `${API_BASE}/PhysicalAssets/by-warehouse/${warehouse.id}`,
        { signal },
      );
      const data: any[] = await res.json();
      return data.map((d) => ({
        hardwareProductId: d.hardwareProductId,
        partNumber: d.partNumber,
        name: d.name,
        totalQuantity: d.totalQuantity,
        defectiveQuantity: d.defectiveQuantity,
      }));
    },
    [warehouse],
  );

  function availableQty(line: StockLine) {
    return line.totalQuantity - line.defectiveQuantity;
  }

  const filteredStock = (stockLines ?? []).filter(
    (l) =>
      availableQty(l) > 0 &&
      !lines.some((x) => x.hardwareProductId === l.hardwareProductId) &&
      (search.trim() === "" ||
        l.partNumber.toLowerCase().includes(search.toLowerCase()) ||
        l.name.toLowerCase().includes(search.toLowerCase())),
  );

  function addLine(stockLine: StockLine) {
    setLines((prev) => [
      ...prev,
      {
        hardwareProductId: stockLine.hardwareProductId,
        partNumber: stockLine.partNumber,
        name: stockLine.name,
        available: availableQty(stockLine),
        requestedQuantity: 1,
      },
    ]);
    setSearch("");
  }

  function updateQty(hardwareProductId: number, value: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.hardwareProductId === hardwareProductId
          ? {
              ...l,
              requestedQuantity: Math.max(1, Math.min(value, l.available)),
            }
          : l,
      ),
    );
  }

  function removeLine(hardwareProductId: number) {
    setLines((prev) =>
      prev.filter((l) => l.hardwareProductId !== hardwareProductId),
    );
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!smrNumber.trim()) return setError(t('forms.smrCreate.smrNumberRequired'));
    if (clientId == null) return setError(t('forms.smrCreate.selectClient'));
    if (selectedSiteId == null) return setError(t('forms.smrCreate.selectSite'));
    if (lines.length === 0)
      return setError(t('forms.smrCreate.addAtLeastOneLine'));
    if (warehouse == null || selectedProjectId == null)
      return setError(t('forms.smrCreate.missingContext'));

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/SmrRequests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  smrNumber,
  projectId: selectedProjectId,
  warehouseId: warehouse.id,
  clientId,
  siteId: selectedSiteId,   // au lieu de siteIds: Array.from(...)
  items: lines.map((l) => ({ hardwareProductId: l.hardwareProductId, requestedQuantity: l.requestedQuantity })),
}),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (err: any) {
      setError(err.message || t('forms.smrCreate.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-[#0F172A]">
            {t('forms.smrCreate.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}
          {(warehousesError || clientsError || sitesError) && (
            <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              <span>{t('forms.smrCreate.listsLoadFailed')}</span>
              <button
                type="button"
                onClick={() => { retryWarehouses(); retryClients(); retrySites(); }}
                className="font-semibold underline flex-shrink-0"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {t('forms.smrCreate.smrNumber')}
              </label>
              <input
                value={smrNumber}
                onChange={(e) => setSmrNumber(e.target.value)}
                placeholder={t('forms.smrCreate.smrNumberPlaceholder')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {t('common.client')}
              </label>
              <select
                value={clientId ?? ""}
                onChange={(e) => setClientId(parseInt(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#124191]/30"
              >
                <option value="">{t('common.select')}</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

         
<div className="mb-4">
  <div className="flex items-center justify-between mb-1.5">
    <label className="block text-xs font-semibold text-slate-500">{t('forms.smrCreate.recipientSite')}</label>
    <button
      type="button"
      onClick={() => setShowSiteForm(true)}
      className="text-xs font-semibold text-[#124191] hover:underline"
    >
      {t('forms.smrCreate.newSite')}
    </button>
  </div>
  <select
    value={selectedSiteId ?? ''}
    onChange={(e) => setSelectedSiteId(parseInt(e.target.value))}
    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
  >
    <option value="">{t('common.select')}</option>
    {sites?.map((s) => (
      <option key={s.id} value={s.id}>{s.siteName}</option>
    ))}
  </select>
</div>

          <div className="mb-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {t('forms.smrCreate.addMaterial')}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('forms.smrCreate.searchPlaceholder')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
            />
            {search.trim() !== "" && (
              <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto mb-3">
                {stockError ? (
                  <div className="p-2">
                    <ErrorState message={stockError} onRetry={retryStock} />
                  </div>
                ) : stockLoading || !stockLines ? (
                  <div className="p-3 text-xs text-slate-400">
                    {t('forms.smrCreate.loadingStock')}
                  </div>
                ) : filteredStock.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400">
                    {t('forms.smrCreate.noAvailableMatch')}
                  </div>
                ) : (
                  filteredStock.slice(0, 8).map((l) => (
                    <button
                      type="button"
                      key={l.hardwareProductId}
                      onClick={() => addLine(l)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#EAF1FC] border-b border-slate-50 last:border-0"
                    >
                      <span className="font-mono text-[#124191]">
                        {l.partNumber}
                      </span>{" "}
                      <span className="text-slate-600">{l.name}</span>{" "}
                      <span className="text-xs text-emerald-600 float-right">
                        {t('forms.smrCreate.available', { count: availableQty(l) })}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left font-medium py-2">{t('common.code')}</th>
                  <th className="text-left font-medium py-2">{t('common.description')}</th>
                  <th className="text-right font-medium py-2">{t('forms.smrCreate.availableCol')}</th>
                  <th className="text-right font-medium py-2">{t('forms.smrCreate.requestedQty')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr
                    key={l.hardwareProductId}
                    className="border-b border-slate-50"
                  >
                    <td className="py-2 font-mono text-[#124191]">
                      {l.partNumber}
                    </td>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-right font-mono text-slate-400">
                      {l.available}
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={1}
                        max={l.available}
                        value={l.requestedQuantity}
                        onChange={(e) =>
                          updateQty(
                            l.hardwareProductId,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-20 text-right border border-slate-200 rounded-md px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(l.hardwareProductId)}
                        className="text-slate-300 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {t('common.cancel')}
            </button>
            <LoadingButton
              type="submit"
              disabled={submitting}
              loading={submitting}
              loadingText={t('forms.smrCreate.creating')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60"
            >
              {submitting ? t('forms.smrCreate.creating') : t('forms.smrCreate.submit')}
            </LoadingButton>
          </div>
        </form>
      </div>

      {showSiteForm && (
        <SiteCreateForm
          onClose={() => setShowSiteForm(false)}
          onCreated={() => {
            setShowSiteForm(false);
            retrySites();
          }}
        />
      )}
    </div>
  );
}
      
 
