import React, { useEffect, useState, useCallback } from "react";
import { useProject } from "./project";
import {apiFetch} from "../apiFetch";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

interface Client {
  id: number;
  name: string;
}
// APRÈS
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
  const { selectedProjectId } = useProject();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [sites, setSites] = useState<Site[] | null>(null);
  const [stockLines, setStockLines] = useState<StockLine[] | null>(null);

  const [smrNumber, setSmrNumber] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<number>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Chargement initial : entrepôt, clients, sites, stock disponible ----------
  useEffect(() => {
    apiFetch(`${API_BASE}/Warehouses`)
      .then((r) => r.json())
      .then((data: Warehouse[]) => setWarehouse(data[0] ?? null));
    apiFetch(`${API_BASE}/Clients`)
      .then((r) => r.json())
      .then(setClients)
      .catch(() => setClients([]));
    apiFetch(`${API_BASE}/Sites`)
      .then((r) => r.json())
      .then(setSites)
      .catch(() => setSites([]));
  }, []);

  useEffect(() => {
    if (!warehouse) return;
    apiFetch(`${API_BASE}/PhysicalAssets/by-warehouse/${warehouse.id}`)
      .then((r) => r.json())
      .then((data: any[]) =>
        setStockLines(
          data.map((d) => ({
            hardwareProductId: d.hardwareProductId,
            partNumber: d.partNumber,
            name: d.name,
            totalQuantity: d.totalQuantity,
            defectiveQuantity: d.defectiveQuantity,
          })),
        ),
      )
      .catch(() => setStockLines([]));
  }, [warehouse]);

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

  function toggleSite(id: number) {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!smrNumber.trim()) return setError("Le numéro de SMR est requis.");
    if (clientId == null) return setError("Sélectionnez un client.");
    if (selectedSiteIds.size === 0)
      return setError("Sélectionnez au moins un site.");
    if (lines.length === 0)
      return setError("Ajoutez au moins une ligne de matériel.");
    if (warehouse == null || selectedProjectId == null)
      return setError("Contexte projet/entrepôt manquant.");

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
          siteIds: Array.from(selectedSiteIds),
          items: lines.map((l) => ({
            hardwareProductId: l.hardwareProductId,
            requestedQuantity: l.requestedQuantity,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (err: any) {
      setError(err.message || "Échec de la création.");
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
            Nouvelle demande SMR
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                N° SMR
              </label>
              <input
                value={smrNumber}
                onChange={(e) => setSmrNumber(e.target.value)}
                placeholder="ex : SMR-2211"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Client
              </label>
              <select
                value={clientId ?? ""}
                onChange={(e) => setClientId(parseInt(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#124191]/30"
              >
                <option value="">Sélectionner…</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Sites destinataires
            </label>
            <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
              {!sites ? (
                <div className="p-3 text-xs text-slate-400">Chargement…</div>
              ) : sites.length === 0 ? (
                <div className="p-3 text-xs text-slate-400">
                  Aucun site disponible.
                </div>
              ) : (
                sites.map((s) => (
                  // APRÈS
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSiteIds.has(s.id)}
                      onChange={() => toggleSite(s.id)}
                    />
                    {s.siteName}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Ajouter du matériel (issu du stock disponible)
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un code ou une description…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
            />
            {search.trim() !== "" && (
              <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto mb-3">
                {!stockLines ? (
                  <div className="p-3 text-xs text-slate-400">
                    Chargement du stock…
                  </div>
                ) : filteredStock.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400">
                    Aucune référence disponible correspondante.
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
                        {availableQty(l)} dispo
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
                  <th className="text-left font-medium py-2">Code</th>
                  <th className="text-left font-medium py-2">Description</th>
                  <th className="text-right font-medium py-2">Disponible</th>
                  <th className="text-right font-medium py-2">Qté demandée</th>
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
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60"
            >
              {submitting ? "Création…" : "Créer la demande SMR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
