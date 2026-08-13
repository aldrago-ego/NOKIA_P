import React, { useState } from "react";
import SmrCreateForm from "./smrCreateform";
import smrimportform from "./smrImportForm";
import { apiFetch } from "../apiFetch";
import LoadingButton from "../Component/LoadingButton";
import SmrImportForm from "./smrImportForm";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

interface SmrItem {
  id: number;
  hardwareProductId: number;
  hardwareProduct: { partNumber: string; name: string };
  requestedQuantity: number;
  allocatedQuantity: number;
}
interface SmrSiteItem {
  id: number;
  siteId: number;
  site: { siteName: string };
  hardwareProductId: number;
  hardwareProduct: { partNumber: string; name: string };
  requestedQuantity: number;
  allocatedQuantity: number;
}

interface Smr {
  id: number;
  smrNumber: string;
  status: "Pending" | "Approved" | "Rejected";
  createdDate: string;
  warehouse: { name: string };
  client: { name: string };
  subcontractor?: { name: string } | null;
  items: SmrItem[];
  smrRequestSiteItems?: SmrSiteItem[]; // NOUVEAU
  itemsCount: number; // nombre total de références demandées (pour SMR par site)
  siteItemsCount: number; // nombre total de références demandées (pour SMR par sous-traitant)
}

function statusPill(status: string) {
  if (status === "Approved")
    return (
      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        Approuvée
      </span>
    );
  if (status === "Rejected")
    return (
      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        Rejetée
      </span>
    );
  return (
    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      En attente
    </span>
  );
}

export default function SmrDetailPanel({ projectId }: { projectId: number }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  const {
    data: smrs,
    loading: smrsLoading,
    error,
    retry: load,
  } = useFetchState<Smr[]>(
    (signal) =>
      apiFetch(`${API_BASE}/SmrRequests?projectId=${projectId}`, {
        signal,
      }).then((res) => res.json()),
    [projectId],
  );

  return (
    <>
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-xs font-semibold text-[#124191] bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:border-[#124191]"
        >
          + Nouvelle SMR (par site)
        </button>
        <button
          onClick={() => setShowImportForm(true)}
          className="text-xs font-semibold text-white bg-[#124191] rounded-lg px-3 py-1.5 hover:bg-[#0d3373]"
        >
          + Importer SMR (sous-traitant)
        </button>
      </div>
      <div className="table-wrap">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : smrsLoading || !smrs ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-11 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : smrs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Aucune SMR pour ce projet.
          </p>
        ) : (
          <table className="w-full text-black text-sm border border-slate-100 rounded-lg">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left font-medium px-4 py-2.5">N° SMR</th>
                <th className="text-left font-medium px-4 py-2.5">Client</th>
                <th className="text-left font-medium px-4 py-2.5">Entrepôt</th>
                <th className="text-left font-medium px-4 py-2.5">
                  Réf. demandées
                </th>
                <th className="text-left font-medium px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody>
              {smrs.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="border-b border-slate-50 cursor-pointer hover:bg-[#EAF1FC]"
                >
                  <td className="px-4 py-2.5 font-mono text-[#124191]">
                    {s.smrNumber}
                  </td>
                  <td className="px-4 py-2.5">{s.client?.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {s.warehouse?.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {s.itemsCount > 0 ? s.itemsCount : s.siteItemsCount}
                  </td>
                  <td className="px-4 py-2.5">{statusPill(s.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId != null && (
        <SmrModal
          smrId={selectedId}
          onClose={() => setSelectedId(null)}
          onDone={() => {
            setSelectedId(null);
            load();
          }}
        />
      )}
      {showCreateForm && (
        <SmrCreateForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            load(); // rafraîchit la liste des SMR pour voir la nouvelle demande apparaître
          }}
        />
      )}
      {showImportForm && (
        <SmrImportForm
          projectId={projectId}
          onClose={() => setShowImportForm(false)}
          onImported={() => {
            setShowImportForm(false);
            load();
          }}
        />
      )}
    </>
  );
}
// composant pour l'affichage d'une SMR en détail, avec approbation ou rejet par un superviseur.
function SmrModal({
  smrId,
  onClose,
  onDone,
}: {
  smrId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  // erreur de mutation (approbation/rejet) — distincte de l'erreur de chargement ci-dessous
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shortages, setShortages] = useState<any[] | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [actor, setActor] = useState("");

  const {
    data: smr,
    loading: smrLoading,
    error: loadError,
    retry: retrySmr,
  } = useFetchState<Smr>(
    (signal) =>
      apiFetch(`${API_BASE}/SmrRequests/${smrId}`, { signal }).then((r) =>
        r.json(),
      ),
    [smrId],
  );

  async function handleApprove(
    force = false,
    overrides?: { siteItemId: number; confirmedQuantity: number }[],
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/SmrRequests/${smrId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedBy: actor || "Admin",
          forcePartialAllocation: force,
          siteItemOverrides: overrides,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setShortages(data.shortages);
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || "Échec de l'approbation.");
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/SmrRequests/${smrId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, rejectedBy: actor || "Admin" }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone();
    } catch (err: any) {
      setError(err.message || "Échec du rejet.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-[#0F172A]">
            SMR {smr?.smrNumber ?? "…"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loadError ? (
            <ErrorState message={loadError} onRetry={retrySmr} />
          ) : smrLoading || !smr ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 bg-slate-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                {statusPill(smr.status)}
                {smr.subcontractor && (
                  <span className="text-xs font-semibold text-slate-500">
                    Sous-traitant : {smr.subcontractor.name}
                  </span>
                )}
              </div>

              {smr.subcontractor ? (
                <SmrSubcontractorReview
                  smr={smr}
                  error={error}
                  shortages={shortages}
                  busy={busy}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  rejecting={rejecting}
                  setRejecting={setRejecting}
                  reason={reason}
                  setReason={setReason}
                  actor={actor}
                  setActor={setActor}
                />
              ) : (
                <>
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-100">
                        <th className="text-left font-medium py-2">Code</th>
                        <th className="text-left font-medium py-2">
                          Description
                        </th>
                        <th className="text-right font-medium py-2">Demandé</th>
                        <th className="text-right font-medium py-2">Alloué</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smr.items.map((it) => {
                        const shortage = shortages?.find(
                          (s) => s.hardwareProductId === it.hardwareProductId,
                        );
                        return (
                          <tr key={it.id} className="border-b border-slate-50">
                            <td className="py-2 font-mono text-[#124191]">
                              {it.hardwareProduct.partNumber}
                            </td>
                            <td className="py-2">{it.hardwareProduct.name}</td>
                            <td className="py-2 text-right font-mono">
                              {it.requestedQuantity}
                            </td>
                            <td className="py-2 text-right font-mono">
                              {shortage ? (
                                <span className="text-red-600">
                                  {shortage.available} dispo
                                </span>
                              ) : (
                                it.allocatedQuantity || "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                      {error}
                    </div>
                  )}

                  {shortages && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm">
                      <p className="font-semibold mb-2 text-amber-800">
                        Stock insuffisant pour {shortages.length} référence(s) :
                      </p>
                      <ul className="text-xs space-y-1 mb-2 max-h-40 overflow-y-auto">
                        {shortages.map((s: any) => (
                          <li
                            key={s.partNumber}
                            className="font-mono text-amber-900"
                          >
                            {s.partNumber} — demandé {s.requested}, disponible{" "}
                            {s.available}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleApprove(true)}
                        disabled={busy}
                        className="text-xs font-semibold text-amber-900 underline"
                      >
                        Approuver quand même avec allocation partielle
                      </button>
                    </div>
                  )}

                  {smr.status === "Pending" && (
                    <>
                      <input
                        value={actor}
                        onChange={(e) => setActor(e.target.value)}
                        placeholder="Votre nom (superviseur)"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
                      />

                      {rejecting && (
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Motif du rejet (optionnel)"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
                        />
                      )}

                      <div className="flex gap-2 justify-end">
                        {!rejecting ? (
                          <>
                            <button
                              onClick={() => setRejecting(true)}
                              disabled={busy}
                              className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              Rejeter
                            </button>
                            <LoadingButton
                              onClick={() => handleApprove(false)}
                              disabled={busy}
                              loading={busy}
                              loadingText="Traitement…"
                              className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60"
                            >
                              Approuver
                            </LoadingButton>
                          </>
                        ) : (
                          <>
                            <LoadingButton
                              onClick={() => setRejecting(false)}
                              disabled={busy}
                              loading={busy}
                              loadingText="Annulation…"
                              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              Annuler
                            </LoadingButton>
                            <button
                              onClick={handleReject}
                              disabled={busy}
                              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                            >
                              {busy ? "Rejet…" : "Confirmer le rejet"}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant pour l'étape de revue d'une SMR par un sous-traitant, avec ajustement des quantités confirmées et approbation/rejet.
function SmrSubcontractorReview({
  smr,
  error,
  shortages,
  busy,
  onApprove,
  onReject,
  rejecting,
  setRejecting,
  reason,
  setReason,
  actor,
  setActor,
}: {
  smr: any;
  error: string | null;
  shortages: any[] | null;
  busy: boolean;
  onApprove: (
    force: boolean,
    overrides?: { siteItemId: number; confirmedQuantity: number }[],
  ) => void;
  onReject: () => void;
  rejecting: boolean;
  setRejecting: (v: boolean) => void;
  reason: string;
  setReason: (v: string) => void;
  actor: string;
  setActor: (v: string) => void;
}) {
  const [confirmed, setConfirmed] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      (smr.smrRequestSiteItems ?? []).map((it: any) => [
        it.id,
        it.requestedQuantity,
      ]),
    ),
  );

  const bySite = React.useMemo(() => {
    const map = new Map<string, any[]>();
    (smr.smrRequestSiteItems ?? []).forEach((it: any) => {
      const key = it.site.siteName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return map;
  }, [smr]);

  function handleApproveClick(force: boolean) {
    const overrides = Object.entries(confirmed).map(([id, qty]) => ({
      siteItemId: parseInt(id),
      confirmedQuantity: qty,
    }));
    onApprove(force, overrides);
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">
        Comparez ce qui a été importé du fichier Excel (colonne "Sur le papier")
        avec ce que vous constatez réellement sur site, puis ajustez la quantité
        confirmée si nécessaire.
      </p>

      <div className="max-h-64 overflow-y-auto mb-4">
        {Array.from(bySite.entries()).map(([siteName, items]) => (
          <div key={siteName} className="mb-3">
            <div className="text-xs font-bold text-[#0F172A] bg-slate-50 px-2 py-1.5 rounded-t-md">
              {siteName}
            </div>
            <table className="w-full text-sm border border-t-0 border-slate-100 rounded-b-md">
              <thead>
                <tr className="text-[10px] text-slate-400 border-b border-slate-100">
                  <th className="text-left font-medium px-2 py-1.5">Code</th>
                  <th className="text-right font-medium px-2 py-1.5">
                    Sur le papier
                  </th>
                  <th className="text-right font-medium px-2 py-1.5">
                    Confirmé
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} className="border-b border-slate-50">
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-[#124191] text-xs">
                        {it.hardwareProduct.partNumber}
                      </span>
                      <span className="block text-slate-500 text-[11px]">
                        {it.hardwareProduct.name}
                      </span>
                    </td>

                    <td className="px-2 py-1.5 text-right font-mono text-slate-400 text-xs">
                      {it.requestedQuantity}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={it.requestedQuantity}
                        value={confirmed[it.id] ?? it.requestedQuantity}
                        onChange={(e) =>
                          setConfirmed((prev) => ({
                            ...prev,
                            [it.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}
      {shortages && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
          Stock insuffisant pour {shortages.length} référence(s).
          <button
            onClick={() => handleApproveClick(true)}
            disabled={busy}
            className="block mt-2 text-xs font-semibold text-amber-900 underline"
          >
            Approuver quand même avec allocation partielle
          </button>
        </div>
      )}

      {smr.status === "Pending" && (
        <>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Votre nom (superviseur)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
          />
          {rejecting && (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motif du rejet (optionnel)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
            />
          )}
          <div className="flex gap-2 justify-end">
            {!rejecting ? (
              <>
                <button
                  onClick={() => setRejecting(true)}
                  disabled={busy}
                  className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Rejeter
                </button>
                <LoadingButton
                  onClick={() => handleApproveClick(false)}
                  disabled={busy}
                  loading={busy}
                  loadingText="Traitement…"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60"
                >
                  Approuver
                </LoadingButton>
              </>
            ) : (
              <>
                <LoadingButton
                  onClick={() => setRejecting(false)}
                  disabled={busy}
                  loading={busy}
                  loadingText="Annulation…"
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </LoadingButton>
                <button
                  onClick={onReject}
                  disabled={busy}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? "Rejet…" : "Confirmer le rejet"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
