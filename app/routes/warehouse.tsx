import React, { useEffect, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { useProject } from "./project";
import { ShipmentModal } from "./ShipmentDetailPanel";
import CategoryManager from "./CategoryManager";
import { apiFetch } from "../apiFetch";
import StockWithdrawalForm from "./StockWithdrawalForm";
import { useAuth } from "./authContext";
import StockCorrectionForm from "./StockCorrectionForm";
import ProductEditForm from "./ProductEditForm";
import LoadingButton from "../Component/LoadingButton";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

interface Warehouse {
  id: number;
  name: string;
  code: string;
  location: string;
}
interface RawMaterialLine {
  partNumber: string;
  description: string;
  quantity: number;
  shp: string;
}

interface WarehouseAssetLine {
  hardwareProductId: number;
  partNumber: string;
  name: string;
  domain: string;
  materialGroup: string;
  isSerialized: boolean;
  totalQuantity: number;
  defectiveQuantity: number;
  units: {
    id: number;
    serialNumber: string;
    quantity: number;
    defectiveQuantity: number;
    status: string;
  }[];
}

interface PendingShipment {
  id: number;
  deliveryNumber: string;
  scope: string;
  location: string;
  vesselArrivalDate: string | null;
}
const DOMAIN_COLORS: Record<
  string,
  { bg: string; text: string; ring: string; hex: string }
> = {
  RAN: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-200",
    hex: "#7C3AED",
  },
  Consumables: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    hex: "#059669",
  },
  Energy: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    hex: "#D97706",
  },
  Core: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    hex: "#0284C7",
  },
  Microwave: {
    bg: "bg-[#EAF1FC]",
    text: "text-[#124191]",
    ring: "ring-blue-200",
    hex: "#124191",
  },
};
const domainColor = (d: string) =>
  DOMAIN_COLORS[d] ?? {
    bg: "bg-slate-50",
    text: "text-slate-700",
    ring: "ring-slate-200",
    hex: "#64748B",
  };

const ACTIVITY_ICON: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  DELIVERY_CONFIRMED: {
    icon: "↓",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  SHIPMENTS_IMPORTED: {
    icon: "↓",
    color: "text-[#124191]",
    bg: "bg-[#EAF1FC]",
  },
  SMR_APPROVED: { icon: "↑", color: "text-amber-600", bg: "bg-amber-50" },
  STOCK_LOANED: { icon: "↑", color: "text-amber-600", bg: "bg-amber-50" },
  STOCK_LOAN_RETURNED: {
    icon: "↓",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  RMA_SHIPPED: { icon: "↑", color: "text-red-600", bg: "bg-red-50" },
  STOCK_CORRECTED: { icon: "⇄", color: "text-slate-600", bg: "bg-slate-100" },
  DEFECT_MARKED: { icon: "⚠", color: "text-red-600", bg: "bg-red-50" },
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)
    return `Aujourd'hui, ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  const days = Math.floor(hours / 24);
  if (days === 1)
    return `Hier, ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function WarehousePage() {
  const { selectedProjectId, selectedProject } = useProject();
  const { isAdmin, isElevated } = useAuth();

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null,
  );
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [lines, setLines] = useState<WarehouseAssetLine[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // ---------- Filtres (nouveaux) ----------
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "good" | "defective">(
    "",
  );

  const [pendingShipments, setPendingShipments] = useState<
    PendingShipment[] | null
  >(null);
  const [reviewShipmentId, setReviewShipmentId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // ---------- Activité récente (nouveau) ----------
  const [recentActivity, setRecentActivity] = useState<any[] | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/Warehouses`)
      .then((res) => res.json())
      .then((data: Warehouse[]) => {
        if (data.length > 0) setSelectedWarehouseId(data[0].id);
      })
      .catch(() => setError(true));
  }, []);

  const loadLines = useCallback(() => {
    if (selectedWarehouseId == null) return;
    setLines(null);
    setError(false);
    apiFetch(`${API_BASE}/PhysicalAssets/by-warehouse/${selectedWarehouseId}`)
      .then((res) => res.json())
      .then(setLines)
      .catch(() => setError(true));
  }, [selectedWarehouseId]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const loadPendingShipments = useCallback(() => {
    if (selectedProjectId == null) return;
    apiFetch(`${API_BASE}/DeliveryNotes?projectId=${selectedProjectId}`)
      .then((res) => res.json())
      .then((data: any[]) => {
        setPendingShipments(
          data
            .filter((s) => s.status === "Pending")
            .map((s) => ({
              id: s.id,
              deliveryNumber: s.deliveryNumber,
              scope: s.scope,
              location: s.location,
              vesselArrivalDate: s.vesselArrivalDate,
            })),
        );
      })
      .catch(() => setPendingShipments([]));
  }, [selectedProjectId]);

  useEffect(() => {
    loadPendingShipments();
  }, [loadPendingShipments]);

  const loadRecentActivity = useCallback(() => {
    if (selectedProjectId == null) return;
    apiFetch(
      `${API_BASE}/ActivityLogs/history?projectId=${selectedProjectId}&page=1&pageSize=5`,
    )
      .then((r) => r.json())
      .then((data) => setRecentActivity(data.items))
      .catch(() => setRecentActivity([]));
  }, [selectedProjectId]);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function handleConfirmed() {
    setReviewShipmentId(null);
    loadPendingShipments();
    loadLines();
    loadRecentActivity();
    showToast("Livraison confirmée — matériel injecté en stock");
  }

  async function updateDefect(assetId: number, value: number, maxQty: number) {
    if (value < 0 || value > maxQty) return;
    try {
      const res = await apiFetch(
        `${API_BASE}/PhysicalAssets/${assetId}/defect`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defectiveQuantity: value }),
        },
      );
      if (!res.ok) throw new Error();
      loadLines();
      showToast("Statut mis à jour");
    } catch {
      showToast("Échec de la mise à jour");
    }
  }

  // ---------- Agrégats globaux ----------
  const totalRefs = lines?.length ?? 0;
  const totalQty = lines?.reduce((a, l) => a + l.totalQuantity, 0) ?? 0;
  const totalDefect = lines?.reduce((a, l) => a + l.defectiveQuantity, 0) ?? 0;

  // ---------- Agrégats par domaine (pour mini-cards + donut) ----------
  const domainStats = useMemo(() => {
    if (!lines) return [];
    const map = new Map<string, { refs: number; qty: number }>();
    lines.forEach((l) => {
      const cur = map.get(l.domain) ?? { refs: 0, qty: 0 };
      cur.refs += 1;
      cur.qty += l.totalQuantity;
      map.set(l.domain, cur);
    });
    return Array.from(map.entries())
      .map(([domain, stats]) => ({
        domain,
        ...stats,
        pct: totalQty > 0 ? (stats.qty / totalQty) * 100 : 0,
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [lines, totalQty]);

  // ---------- Lignes filtrées (recherche + domaine + statut) ----------
  const filteredLines = useMemo(() => {
    if (!lines) return [];
    return lines.filter((l) => {
      if (domainFilter && l.domain !== domainFilter) return false;
      if (statusFilter === "defective" && l.defectiveQuantity === 0)
        return false;
      if (statusFilter === "good" && l.defectiveQuantity > 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !l.partNumber.toLowerCase().includes(q) &&
          !l.name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [lines, domainFilter, statusFilter, search]);

  // Regroupe les lignes filtrées par MaterialGroup pour l'affichage du tableau
  const filteredGrouped = useMemo(() => {
    const map = new Map<string, WarehouseAssetLine[]>();
    filteredLines.forEach((l) => {
      if (!map.has(l.materialGroup)) map.set(l.materialGroup, []);
      map.get(l.materialGroup)!.push(l);
    });
    return map;
  }, [filteredLines]);

  const activeDomainLabel = domainFilter || "Tous les domaines";
  const activeDomainRefs = filteredLines.length;
  const activeDomainQty = filteredLines.reduce(
    (a, l) => a + l.totalQuantity,
    0,
  );

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      {/* ---------- En-tête ---------- */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#0F172A]">Warehouse</h1>
            {selectedProject && (
              <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2.5 py-1 rounded-full font-semibold">
                {selectedProject.code} — {selectedProject.name}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Détail du matériel présent actuellement en entrepôt
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {isElevated && (
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2.5 hover:border-[#124191] hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Importer (Excel)
          </button>
          )}
          {isElevated && (
          <button
            onClick={() => setShowWithdrawalForm(true)}
            disabled={!lines || lines.length === 0}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2.5 hover:border-[#124191] hover:shadow-sm transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21V9m0 12l-4-4m4 4l4-4M4 5h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Donner à un client
          </button>
          )}
{isAdmin && (
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2.5 hover:border-[#124191] hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            Catégories
          </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowStockCorrection(true)}
              className="flex items-center gap-1.5 bg-[#F2790B] text-sm font-semibold text-white rounded-lg px-4 py-2.5 hover:bg-[#d96a06] hover:shadow-md transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Mettre à jour le stock
            </button>
          )}
        </div>
      </div>

      {/* ---------- Bandeau shipments en attente ---------- */}
      
      { isElevated && pendingShipments && pendingShipments.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden animate-[fadeIn_.3s_ease]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <svg
              className="w-4 h-4 text-amber-600 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <span className="text-sm font-semibold text-amber-800">
              {pendingShipments.length} shipment(s) en attente de confirmation
              pour ce projet
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingShipments.map((s) => (
              <button
                key={s.id}
                onClick={() => setReviewShipmentId(s.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-amber-100/60 transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[#124191] font-semibold">
                    {s.deliveryNumber}
                  </span>
                  <span className="text-slate-500">
                    {s.scope} · {s.location}
                  </span>
                </span>
                <span className="text-xs font-semibold text-amber-700">
                  Confirmer la réception →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- KPI : global + par domaine ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard
          label="Références"
          value={totalRefs}
          accent="text-[#124191]"
          bg="bg-[#EAF1FC]"
          icon="box"
        />
        <KpiCard
          label="Qté totale"
          value={totalQty}
          accent="text-[#124191]"
          bg="bg-[#EAF1FC]"
          icon="stack"
        />
        <KpiCard
          label="Défectueux"
          value={totalDefect}
          accent="text-red-600"
          bg="bg-red-50"
          icon="alert"
          danger
        />
        {domainStats.slice(0, 4).map((d) => {
          const c = domainColor(d.domain);
          return (
            <KpiCard
              key={d.domain}
              label={d.domain}
              value={d.qty}
              sub={`${d.refs} réf.`}
              accent={c.text}
              bg={c.bg}
              icon="dot"
            />
          );
        })}
      </div>

      {/* ---------- Recherche + filtres ---------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M21 21l-4.3-4.3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par code ou description…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191] transition-all"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="flex-1 sm:flex-none border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#124191]/30"
          >
            <option value="">Toutes les catégories</option>
            {domainStats.map((d) => (
              <option key={d.domain} value={d.domain}>
                {d.domain}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#124191]/30"
          >
            <option value="">Tous statuts</option>
            <option value="good">Bon état</option>
            <option value="defective">Défectueux</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400 text-center py-10">
          Impossible de charger le stock de cet entrepôt.
        </p>
      ) : !lines ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_320px_1fr] gap-4">
          {/* ---------- Colonne 1 : Donut inventaire par catégorie ---------- */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-[#0F172A] mb-4">
              Inventaire par catégorie
            </h3>
            <DomainDonut stats={domainStats} total={totalQty} />
            <div className="mt-4 space-y-2">
              {domainStats.map((d) => {
                const c = domainColor(d.domain);
                return (
                  <button
                    key={d.domain}
                    onClick={() =>
                      setDomainFilter(domainFilter === d.domain ? "" : d.domain)
                    }
                    className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-lg transition-colors ${
                      domainFilter === d.domain
                        ? "bg-slate-50 ring-1 " + c.ring
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-slate-600 font-medium">
                        {d.domain}
                      </span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      {d.qty.toLocaleString("fr-FR")} ({d.pct.toFixed(1)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------- Colonne 2 : Activité récente ---------- */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-[#0F172A] mb-4">
              Activité récente
            </h3>
            {!recentActivity ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-slate-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Aucune activité récente.
              </p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((a) => {
                  const cfg = ACTIVITY_ICON[a.type] ?? {
                    icon: "•",
                    color: "text-slate-500",
                    bg: "bg-slate-100",
                  };
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0"
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color} font-bold text-sm`}
                      >
                        {cfg.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 leading-snug line-clamp-2">
                          {a.description}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {timeAgo(a.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <a
              href="/history"
              className="block text-xs font-semibold text-[#124191] hover:underline mt-3"
            >
              Voir tout l'historique →
            </a>
          </div>

          {/* ---------- Colonne 3 : tableau détaillé ---------- */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="font-bold text-sm text-[#0F172A] block truncate">
                {activeDomainLabel}{" "}
                <span className="text-slate-400 font-normal text-xs">
                  ({activeDomainRefs} réf. ·{" "}
                  {activeDomainQty.toLocaleString("fr-FR")} unités)
                </span>
              </span>
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              {filteredLines.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">
                  Aucun matériel ne correspond à ce filtre.
                </p>
              ) : (
                Array.from(filteredGrouped.entries()).map(
                  ([materialGroup, groupLines]) => (
                    <div key={materialGroup}>
                      <div className="px-5 py-2 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide sticky top-0">
                        {materialGroup}
                      </div>
                      <table className="w-full text-sm hidden sm:table">
                        <thead>
                          <tr className="text-xs text-slate-400 border-b border-slate-100">
                            <th className="text-left font-medium px-5 py-2">
                              Code
                            </th>
                            <th className="text-left font-medium px-5 py-2">
                              Description
                            </th>
                            <th className="text-right font-medium px-5 py-2">
                              Qté
                            </th>
                            <th className="text-right font-medium px-5 py-2">
                              Déf.
                            </th>
                            <th className="text-left font-medium px-5 py-2">
                              Statut
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-black">
                          {groupLines.map((line) => (
                            <MaterialRows
                              key={line.hardwareProductId}
                              line={line}
                              onDefectSave={updateDefect}
                              onEdit={
                                isElevated
                                  ? () =>
                                      setEditingProductId(
                                        line.hardwareProductId,
                                      )
                                  : undefined
                              }
                            />
                          ))}
                        </tbody>
                      </table>

                      {/* Vue cartes empilées — mobile uniquement */}
                      <div className="sm:hidden divide-y divide-slate-50">
                        {groupLines.map((line) => (
                          <MaterialCard
                            key={line.hardwareProductId}
                            line={line}
                            onDefectSave={updateDefect}
                            onEdit={
                              isElevated
                                ? () =>
                                    setEditingProductId(line.hardwareProductId)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-lg shadow-xl z-50 animate-[slideUp_.2s_ease]">
          {toast}
        </div>
      )}

      {/* ---------- Modales (inchangées) ---------- */}
      {reviewShipmentId != null && (
        <ShipmentModal
          shipmentId={reviewShipmentId}
          onClose={() => setReviewShipmentId(null)}
          onConfirmed={handleConfirmed}
        />
      )}
      {showImportModal && (
        <ImportShipmentsModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            loadPendingShipments();
            showToast("Import terminé — vérifiez les shipments en attente");
          }}
        />
      )}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => {
            setShowCategoryManager(false);
            loadLines();
          }}
        />
      )}
      {showWithdrawalForm &&
        lines &&
        selectedWarehouseId != null &&
        selectedProjectId != null && (
          <StockWithdrawalForm
            warehouseId={selectedWarehouseId}
            projectId={selectedProjectId}
            stockLines={lines}
            onClose={() => setShowWithdrawalForm(false)}
            onDone={() => {
              setShowWithdrawalForm(false);
              loadLines();
              loadRecentActivity();
              showToast("Matériel donné au client — stock mis à jour");
            }}
          />
        )}
      {showStockCorrection &&
        lines &&
        selectedWarehouseId != null &&
        selectedProjectId != null && (
          <StockCorrectionForm
            warehouseId={selectedWarehouseId}
            projectId={selectedProjectId}
            stockLines={lines}
            onClose={() => setShowStockCorrection(false)}
            onDone={() => {
              setShowStockCorrection(false);
              loadLines();
              loadRecentActivity();
              showToast("Stock mis à jour");
            }}
          />
        )}
      {editingProductId != null && (
        <ProductEditForm
          hardwareProductId={editingProductId}
          onClose={() => setEditingProductId(null)}
          onSaved={() => {
            setEditingProductId(null);
            loadLines();
            showToast("Fiche produit mise à jour");
          }}
        />
      )}
    </div>
  );
}

// ---------- Sous-composants ----------

function KpiCard({
  label,
  value,
  sub,
  accent,
  bg,
  icon,
  danger,
}: {
  label: string;
  value: number;
  sub?: string;
  accent: string;
  bg: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`w-8 h-8 rounded-lg ${bg} ${accent} flex items-center justify-center`}
        >
          {icon === "alert" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          ) : icon === "box" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9.5L12 4l9 5.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          ) : icon === "stack" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="w-2 h-2 rounded-full bg-current" />
          )}
        </span>
      </div>
      <div
        className={`text-xl font-bold ${danger && value > 0 ? "text-red-600" : "text-[#0F172A]"}`}
      >
        {value.toLocaleString("fr-FR")}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">
        {label}
        {sub ? ` · ${sub}` : ""}
      </div>
    </div>
  );
}

function DomainDonut({
  stats,
  total,
}: {
  stats: { domain: string; qty: number; pct: number }[];
  total: number;
}) {
  const size = 160,
    stroke = 22,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={stroke}
        />
        {stats.map((d) => {
          const dash = (d.pct / 100) * c;
          const circle = (
            <circle
              key={d.domain}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={domainColor(d.domain).hex}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="transition-all duration-500"
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-[#0F172A]">
          {total.toLocaleString("fr-FR")}
        </span>
        <span className="text-[10px] text-slate-400">Total articles</span>
      </div>
    </div>
  );
}

// ---------- Sous-composants ----------

function StatChip({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
      <span className="text-slate-400">{label}</span>
      <span
        className={`font-mono font-bold ${danger && value > 0 ? "text-red-600" : "text-[#0F172A]"}`}
      >
        {value.toLocaleString("fr-FR")}
      </span>
    </div>
  );
}

function StatusPill({ defective }: { defective: boolean }) {
  return defective ? (
    <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      Défectueux
    </span>
  ) : (
    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      Bon état
    </span>
  );
}

function DefectInput({
  value,
  max,
  onSave,
}: {
  value: number;
  max: number;
  onSave: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <input
      type="number"
      min={0}
      max={max}
      value={local}
      onChange={(e) => setLocal(parseInt(e.target.value) || 0)}
      onBlur={() => local !== value && onSave(local)}
      className="w-16 text-right border border-slate-200 rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
    />
  );
}
// Convertit une cellule Excel (Date object, nombre de série, ou texte "M/D/YYYY") en ISO string
function excelCellToIsoDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, m, d, y] = usMatch;
      return new Date(
        Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)),
      ).toISOString();
    }

    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback.toISOString();
  }

  return null;
}

// Localise dynamiquement le tableau "Shipment" dans la feuille : son en-tête n'est
// ni à la première ligne ni à la première colonne, et varie selon les exports du client.
function extractShipmentRows(rows: any[][]): any[] {
  const headerRowIdx = rows.findIndex((row) =>
    row.some(
      (cell) =>
        typeof cell === "string" && /^shipment\s*no\.?$/i.test(cell.trim()),
    ),
  );
  if (headerRowIdx === -1) return [];

  const headerRow = rows[headerRowIdx];
  const subHeaderRow = rows[headerRowIdx + 1] ?? [];

  const colIndex = (pattern: RegExp, searchRow: any[] = headerRow) =>
    searchRow.findIndex(
      (cell) => typeof cell === "string" && pattern.test(cell.trim()),
    );

  const shipmentNoCol = colIndex(/^shipment\s*no\.?$/i);
  const scopeCol = colIndex(/^scope$/i);
  const locationCol = colIndex(/^location$/i);
  const motCol = colIndex(/^mot$/i);
  const invoiceCol = colIndex(/^shipping invoice/i);
  const containersCol = colIndex(/^nbre de conteneurs/i);
  const waybillCol = colIndex(/^sea waybill/i);

  // Les deux colonnes "Vessel / Flight" partagent le même libellé ; on les distingue
  // via la ligne de sous-en-tête juste en dessous ("dep date" / "arrival date").
  const depDateCol = colIndex(/^dep date$/i, subHeaderRow);
  const arrDateCol = colIndex(/^arrival date$/i, subHeaderRow);
  const hasSubHeader = depDateCol !== -1 || arrDateCol !== -1;
  const dataStart = headerRowIdx + (hasSubHeader ? 2 : 1);

  const result: any[] = [];
  const materialCol = 0;
  const descriptionCol = 1;
  const qtyCol = 2;
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const shipmentNo = shipmentNoCol !== -1 ? row[shipmentNoCol] : null;
    if (shipmentNo === null || shipmentNo === undefined || shipmentNo === "")
      continue;
    const scope = scopeCol !== -1 ? String(row[scopeCol] ?? "").trim() : "";
    const location =
      locationCol !== -1 ? String(row[locationCol] ?? "").trim() : "";
    if (!scope || !location) continue; // filtre les lignes mal alignées (quantité prise pour un n° de shipment)

    result.push({
      shipmentNo: String(shipmentNo),
      scope: scopeCol !== -1 ? String(row[scopeCol] ?? "") : "",
      location: locationCol !== -1 ? String(row[locationCol] ?? "") : "",
      mot: motCol !== -1 ? String(row[motCol] ?? "") : "",
      vesselDepartureDate:
        depDateCol !== -1 ? excelCellToIsoDate(row[depDateCol]) : null,
      vesselArrivalDate:
        arrDateCol !== -1 ? excelCellToIsoDate(row[arrDateCol]) : null,
      invoiceNumber: invoiceCol !== -1 ? String(row[invoiceCol] ?? "") : "",
      containersCount:
        containersCol !== -1 ? parseInt(row[containersCol]) || null : null,
      waybill: waybillCol !== -1 ? String(row[waybillCol] ?? "") : "",
      materials: row[materialCol] // NOUVEAU
        ? [
            {
              partNumber: String(row[materialCol]),
              description: String(row[descriptionCol] ?? ""),
              expectedQuantity: parseInt(row[qtyCol]) || 0,
            },
          ]
        : [],
    });
  }
  return result;
}
function findMaterialSheet(workbook: XLSX.WorkBook): any[][] | null {
  let best: any[][] | null = null;
  let bestScore = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    const headerRowIdx = rows.findIndex(
      (row) =>
        row.some(
          (c) => typeof c === "string" && /^material$/i.test(c.trim()),
        ) && row.some((c) => typeof c === "string" && /^shp$/i.test(c.trim())),
    );
    if (headerRowIdx === -1) continue;

    // Score = nombre de lignes réellement rattachées à un SHP — permet de préférer
    // la feuille la plus complète si plusieurs feuilles ont la même structure (Sheet1 vs Sheet2)
    const headerRow = rows[headerRowIdx];
    const shpCol = headerRow.findIndex(
      (c) => typeof c === "string" && /^shp$/i.test(c.trim()),
    );
    const score = rows.slice(headerRowIdx + 1).filter((r) => r[shpCol]).length;

    if (score > bestScore) {
      bestScore = score;
      best = rows.slice(headerRowIdx); // garde la ligne d'en-tête + les données
    }
  }
  return best;
}

// Regroupe les lignes de matériel par numéro de shipment (via la colonne SHP),
// en sommant les quantités pour un même matériel (le fichier SAP a souvent des
// lignes dupliquées avec quantité 0 puis quantité réelle — la somme reste correcte).
function extractExpectedMaterialsBySHP(
  workbook: XLSX.WorkBook,
): Record<string, ExpectedMaterialLine[]> {
  const sheetRows = findMaterialSheet(workbook);
  if (!sheetRows) return {};

  const headerRow = sheetRows[0];
  const colIndex = (pattern: RegExp) =>
    headerRow.findIndex(
      (c: any) => typeof c === "string" && pattern.test(c.trim()),
    );

  const materialCol = colIndex(/^material$/i);
  const descriptionCol = colIndex(/^description$/i);
  const qtyCol = colIndex(/^order quantity$/i);
  const shpCol = colIndex(/^shp$/i);

  if (materialCol === -1 || qtyCol === -1 || shpCol === -1) return {};

  // clé = "1", "2"... (numéro de shipment extrait de "SHP1", "SHP2"...)
  const grouped: Record<string, Map<string, ExpectedMaterialLine>> = {};

  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    const shpValue = String(row[shpCol] ?? "").trim();
    const match = shpValue.match(/^SHP(\d+)$/i);

    if (!match) continue;

    const shipmentNo = match[1];
    const partNumber = String(row[materialCol] ?? "").trim();
    const qty = parseInt(row[qtyCol]) || 0;
    if (!partNumber) continue;

    if (!grouped[shipmentNo]) grouped[shipmentNo] = new Map();
    const existing = grouped[shipmentNo].get(partNumber);
    if (existing) {
      existing.expectedQuantity += qty;
    } else {
      grouped[shipmentNo].set(partNumber, {
        partNumber,
        description:
          descriptionCol !== -1 ? String(row[descriptionCol] ?? "") : "",
        expectedQuantity: qty,
      });
    }
  }

  const result: Record<string, ExpectedMaterialLine[]> = {};
  for (const [shipmentNo, map] of Object.entries(grouped)) {
    result[shipmentNo] = Array.from(map.values());
  }
  return result;
}

interface ExpectedMaterialLine {
  partNumber: string;
  description: string;
  expectedQuantity: number;
}

// =========================================================
// Modale d'import — demande confirmation explicite du projet cible
// =========================================================
function ImportShipmentsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { projects, selectedProjectId } = useProject();
  const [targetProjectId, setTargetProjectId] = useState<number | null>(
    selectedProjectId,
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    skippedDetails?: string[];
  } | null>(null);

  const targetProject = projects?.find((p) => p.id === targetProjectId);

  async function handleImport() {
    if (!file) {
      setError("Sélectionnez un fichier Excel.");
      return;
    }
    if (targetProjectId == null) {
      setError("Sélectionnez le projet auquel rattacher cet import.");
      return;
    }
    setBusy(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });

        // Cherche la feuille shipment sur TOUTES les feuilles, pas seulement la première
        let shipmentSheetRows: any[][] | null = null;
        for (const sheetName of wb.SheetNames) {
          const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
            header: 1,
            defval: "",
          });
          const hasHeader = rows.some((row) =>
            row.some(
              (cell) =>
                typeof cell === "string" &&
                /^shipment\s*no\.?$/i.test(cell.trim()),
            ),
          );
          if (hasHeader) {
            shipmentSheetRows = rows;
            break;
          }
        }

        if (!shipmentSheetRows) {
          setError(
            'Aucune feuille avec un tableau "Shipment no." trouvée dans ce fichier.',
          );
          setBusy(false);
          return;
        }

        const parsedRows = extractShipmentRows(shipmentSheetRows);
        const materialsBySHP = extractExpectedMaterialsBySHP(wb);

        // Fusion : attache le manifeste complet (Sheet1) à chaque shipment détecté (Feuil1)
        const enrichedRows = parsedRows.map((r) => ({
          ...r,
          materials: materialsBySHP[r.shipmentNo] ?? r.materials ?? [],
        }));

        if (enrichedRows.length === 0) {
          setError(
            "Aucune ligne de shipment exploitable détectée dans ce fichier.",
          );
          setBusy(false);
          return;
        }

        const res = await apiFetch(`${API_BASE}/DeliveryNotes/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetProjectId,
            rows: enrichedRows,
          }),
        });
        if (!res.ok) throw new Error(await res.text());

        const data2 = await res.json();
        setResult(data2);
      } catch (err: any) {
        setError(err.message || "Échec de l'import.");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">
            Importer des shipments
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-3 py-2.5 mb-4">
              <svg
                className="w-4 h-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {result.created} shipment(s) importé(s) pour{" "}
              <strong>{targetProject?.name}</strong>
              {result.skippedDetails && result.skippedDetails.length > 0 && (
                <ul className="text-xs text-slate-500 list-disc pl-4 mb-3 max-h-32 overflow-y-auto">
                  {result.skippedDetails.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Ces shipments sont en attente — confirmez leur réception depuis le
              bandeau "en attente de confirmation" pour les injecter en stock.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onImported}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors"
              >
                Terminé
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-[#EAF1FC] border border-[#c7dbf5] text-[#124191] text-xs rounded-lg px-3 py-2.5 mb-4">
              Confirmez à quel projet rattacher cet import — les shipments
              resteront en attente tant qu'ils ne sont pas validés
              individuellement.
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Projet cible
              </label>
              <select
                value={targetProjectId ?? ""}
                onChange={(e) => setTargetProjectId(parseInt(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
              >
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                    {p.isCurrent ? " (actif)" : ""}
                  </option>
                ))}
              </select>
              {targetProject && !targetProject.isCurrent && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Ce n'est pas le projet actuellement actif — vérifiez que c'est
                  intentionnel.
                </p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Fichier Excel
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-[#EAF1FC] file:text-[#124191] file:text-xs file:font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <LoadingButton
                onClick={handleImport}
                disabled={busy}
                loading={busy}
                loadingText="Import…"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors disabled:opacity-60"
              >
                {busy ? "Import…" : "Importer"}
              </LoadingButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MaterialRows({
  line,
  onDefectSave,
  onEdit,
}: {
  line: WarehouseAssetLine;
  onDefectSave: (assetId: number, value: number, maxQty: number) => void;
  onEdit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleUnits = line.units.length > 1;

  if (!hasMultipleUnits) {
    const u = line.units[0];
    if (!u) return null;
    return (
      <tr className="border-b border-slate-50 hover:bg-[#EAF1FC]">
        <td className="px-5 py-2 font-mono text-xs text-[#124191]">
          {line.partNumber}
          {line.isSerialized && (
            <span className="text-slate-400"> · {u.serialNumber}</span>
          )}
        </td>
        <td className="px-5 py-2">{line.name}</td>
        <td className="px-5 py-2 text-right font-mono">{u.quantity}</td>
        <td className="px-5 py-2 text-right">
          <DefectInput
            value={u.defectiveQuantity}
            max={u.quantity}
            onSave={(v) => onDefectSave(u.id, v, u.quantity)}
          />
        </td>
        <td className="px-5 py-2">
          <StatusPill defective={u.defectiveQuantity > 0} />
          {onEdit && (
            <button
              onClick={onEdit}
              className="ml-2 text-[10px] text-[#124191] hover:underline"
            >
              Modifier
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-[#EAF1FC] cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-5 py-2 font-mono text-xs text-[#124191]">
          <span
            className={`inline-block mr-1.5 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            ▸
          </span>
          {line.partNumber}
          <span className="text-slate-400 font-sans">
            {" "}
            · {line.units.length} unités
          </span>
        </td>
        <td className="px-5 py-2">{line.name}</td>
        <td className="px-5 py-2 text-right font-mono font-semibold">
          {line.totalQuantity}
        </td>
        <td className="px-5 py-2 text-right font-mono">
          {line.defectiveQuantity > 0 ? (
            <span className="text-red-600 font-semibold">
              {line.defectiveQuantity}
            </span>
          ) : (
            <span className="text-slate-300">0</span>
          )}
        </td>
        <td className="px-5 py-2">
          <StatusPill defective={line.defectiveQuantity > 0} />
        </td>
      </tr>

      {expanded &&
        line.units.map((u) => (
          <tr key={u.id} className="border-b border-slate-50 bg-slate-50/40">
            <td className="px-5 py-2 pl-10 font-mono text-xs text-slate-400">
              {line.isSerialized ? u.serialNumber : `Lot ${u.serialNumber}`}
            </td>
            <td className="px-5 py-2 text-slate-300 text-xs">—</td>
            <td className="px-5 py-2 text-right font-mono text-slate-500">
              {u.quantity}
            </td>
            <td className="px-5 py-2 text-right">
              <DefectInput
                value={u.defectiveQuantity}
                max={u.quantity}
                onSave={(v) => onDefectSave(u.id, v, u.quantity)}
              />
            </td>
            <td className="px-5 py-2">
              <StatusPill defective={u.defectiveQuantity > 0} />
            </td>
          </tr>
        ))}
    </>
  );
}

function MaterialCard({
  line,
  onDefectSave,
  onEdit,
}: {
  line: WarehouseAssetLine;
  onDefectSave: (assetId: number, value: number, maxQty: number) => void;
  onEdit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleUnits = line.units.length > 1;

  if (!hasMultipleUnits) {
    const u = line.units[0];
    if (!u) return null;
    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-[#124191] font-semibold">
            {line.partNumber}
            {line.isSerialized && (
              <span className="text-slate-400 font-normal">
                {" "}
                · {u.serialNumber}
              </span>
            )}
          </span>
          <StatusPill defective={u.defectiveQuantity > 0} />
        </div>
        <p className="text-xs text-slate-600 mb-2">{line.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#0F172A]">
            {u.quantity}{" "}
            <span className="text-xs font-normal text-slate-400">en stock</span>
          </span>
          <div className="flex items-center gap-2">
            <DefectInput
              value={u.defectiveQuantity}
              max={u.quantity}
              onSave={(v) => onDefectSave(u.id, v, u.quantity)}
            />
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-[11px] text-[#124191] hover:underline whitespace-nowrap"
              >
                Modifier
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-[#124191] font-semibold">
            <span
              className={`inline-block mr-1 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              ▸
            </span>
            {line.partNumber}{" "}
            <span className="text-slate-400 font-normal">
              · {line.units.length} unités
            </span>
          </span>
          <StatusPill defective={line.defectiveQuantity > 0} />
        </div>
        <p className="text-xs text-slate-600 mb-1">{line.name}</p>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-[#0F172A]">
            {line.totalQuantity}{" "}
            <span className="text-xs font-normal text-slate-400">total</span>
          </span>
          {line.defectiveQuantity > 0 && (
            <span className="font-mono text-red-600 text-xs">
              {line.defectiveQuantity} défectueux
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="bg-slate-50/40 divide-y divide-slate-100">
          {line.units.map((u) => (
            <div
              key={u.id}
              className="px-4 py-2.5 pl-8 flex items-center justify-between"
            >
              <span className="font-mono text-xs text-slate-500">
                {line.isSerialized ? u.serialNumber : `Lot ${u.serialNumber}`}
                <span className="ml-2 text-slate-400">· {u.quantity}</span>
              </span>
              <div className="flex items-center gap-2">
                <DefectInput
                  value={u.defectiveQuantity}
                  max={u.quantity}
                  onSave={(v) => onDefectSave(u.id, v, u.quantity)}
                />
                <StatusPill defective={u.defectiveQuantity > 0} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
