import React, { useEffect, useState, useCallback } from "react";
import SmrCreateForm from "./smrCreateform";
import { apiFetch } from "../apiFetch";
import LoadingButton from "../Component/LoadingButton";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

interface SmrItem {
  id: number;
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
  items: SmrItem[];
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
  const [smrs, setSmrs] = useState<Smr[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = useCallback(() => {
    apiFetch(`${API_BASE}/SmrRequests?projectId=${projectId}`)
      .then((res) => res.json())
      .then(setSmrs)
      .catch(() => setError(true));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-xs font-semibold text-white bg-[#124191] rounded-lg px-3 py-1.5 hover:bg-[#0d3373]"
        >
          + Nouvelle SMR
        </button>
      </div>
      <div className="table-wrap">
        {!smrs ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-11 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-400 text-center py-6">
            Impossible de charger les SMR.
          </p>
        ) : smrs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Aucune SMR pour ce projet.
          </p>
        ) : (
          <table className="w-full text-sm">
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
                    {s.items.length}
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
    </>
  );
}

function SmrModal({
  smrId,
  onClose,
  onDone,
}: {
  smrId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [smr, setSmr] = useState<Smr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shortages, setShortages] = useState<any[] | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [actor, setActor] = useState("");

  useEffect(() => {
    apiFetch(`${API_BASE}/SmrRequests/${smrId}`)
      .then((r) => r.json())
      .then(setSmr)
      .catch(() => setError("Impossible de charger cette SMR."));
  }, [smrId]);

  async function handleApprove(force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/SmrRequests/${smrId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedBy: actor || "Admin",
          forcePartialAllocation: force,
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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
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
          {!smr ? (
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
              <div className="mb-4">{statusPill(smr.status)}</div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left font-medium py-2">Code</th>
                    <th className="text-left font-medium py-2">Description</th>
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
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
                  Stock insuffisant pour {shortages.length} référence(s) (voir
                  colonne "Alloué" ci-dessus).
                  <button
                    onClick={() => handleApprove(true)}
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
        </div>
      </div>
    </div>
  );
}
