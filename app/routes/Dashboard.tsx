import React, { useEffect, useState, useCallback, useRef } from "react";
import ShipmentDetailPanel from "./ShipmentDetailPanel";
import { useProject } from "./project";
import SmrDetailPanel from "./SmrDetailPanel";
import { useNavigate } from "react-router";
import RmaDetailPanel from "./RmaDetailPanel";
import { apiFetch } from "../apiFetch";
import SubcontractorDeploymentPanel from "./SubcontractorDeploymentPanel";
import DeploymentMatrixPanel from "./DeploymentMatrixPanel";
import StockSufficiencyPanel from "./StockSufficiencyPanel";
import { useFetchState, checkAccess } from "../useFetchState";
import ErrorState from "../Component/ErrorState";
import { useAuth } from "./authContext";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

// ---------- Types (miroir des DTO C#) ----------
interface Project {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  hasFullTraceability: boolean;
}

interface DashboardStats {
  hwShipment: number;
  realTimeInventory: number;
  smrs: number | null;
  faultyHwRma: number | null;
  hasFullTraceability: boolean;
}

interface DomainSummary {
  domain: string;
  distinctReferences: number;
  totalQuantity: number;
  goodQuantity: number;
  defectiveQuantity: number;
}

interface MaterialGroupSummary {
  materialGroup: string;
  distinctReferences: number;
  totalQuantity: number;
  defectiveQuantity: number;
}

interface ActivityLog {
  id: number;
  type: string;
  description: string;
  performedBy: string;
  timestamp: string;
}

type CardKey = "shipment" | "inventory" | "smrs" | "faulty";

const CARD_CONFIG: {
  key: CardKey;
  labelKey: string;
  badge: string;
  badgeBg: string;
}[] = [
  {
    key: "shipment",
    labelKey: "dashboard.kpi.hwShipment",
    badge: "S",
    badgeBg: "bg-[#124191]",
  },
  {
    key: "inventory",
    labelKey: "dashboard.kpi.realTimeInventory",
    badge: "R",
    badgeBg: "bg-emerald-600",
  },
  { key: "smrs", labelKey: "dashboard.kpi.smrs", badge: "S", badgeBg: "bg-amber-500" },
  { key: "faulty", labelKey: "dashboard.kpi.faultyHwRma", badge: "A", badgeBg: "bg-red-600" },
];

const ACTIVITY_ICON: Record<string, { icon: string; color: string }> = {
  SHIPMENTS_IMPORTED: { icon: "⬇", color: "text-[#124191]" },
  DELIVERY_CONFIRMED: { icon: "✓", color: "text-emerald-600" },
  DEFECT_MARKED: { icon: "⚠", color: "text-red-600" },
  SMR_CREATED: { icon: "▤", color: "text-amber-600" },
};

export default function Dashboard() {
  const { t } = useTranslation();
  // ---------- Projets ----------
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    addProject,
    selectedProject,
  } = useProject();
  const { isElevated } = useAuth();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [stockLines, setStockLines] = useState<any[] | null>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [expandedInventoryDomains, setExpandedInventoryDomains] = useState<
    Set<string>
  >(new Set());

  const [openCard, setOpenCard] = useState<CardKey | null>(null);
  const [activitiesCollapsed, setActivitiesCollapsed] = useState(false);

  // ---------- Real-Time Inventory detail ----------
  const [domainSummary, setDomainSummary] = useState<DomainSummary[] | null>(
    null,
  );
  const [domainLoading, setDomainLoading] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [groupCache, setGroupCache] = useState<
    Record<string, MaterialGroupSummary[]>
  >({});
  const [groupLoading, setGroupLoading] = useState<string | null>(null);

  // =========================================================
  // Chargement des projets — une fois, au montage
  // =========================================================
  const navigate = useNavigate();
  const [smrPreview, setSmrPreview] = useState<any[] | null>(null);

  // Toujours réinterroger le serveur — pas de cache "déjà chargé, on ne bouge plus" :
  // le statut d'une SMR (approuvée, approuvée partiellement, complétée…) peut avoir
  // changé depuis la dernière ouverture de ce panneau, il faut le refléter à chaque fois.
  const loadSmrPreview = useCallback(() => {
    if (selectedProjectId == null) return;
    apiFetch(`${API_BASE}/SmrRequests?projectId=${selectedProjectId}`)
      .then((res) => res.json())
      .then((data) => setSmrPreview(data.slice(0, 4)))
      .catch(() => setSmrPreview([]));
  }, [selectedProjectId]);

  // Ferme le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Entrepôt par défaut — fetch auto au montage, dont dépend le chargement (paresseux,
  // au clic) du panneau Real-Time Inventory ci-dessous.
  const {
    data: warehouses,
    error: warehousesError,
    retry: retryWarehouses,
  } = useFetchState<{ id: number }[]>(
    (signal) =>
      apiFetch(`${API_BASE}/Warehouses`, { signal }).then((r) => r.json()),
    [],
  );
  const warehouseId = warehouses?.[0]?.id ?? null;

  const loadStockLines = useCallback(() => {
    if (stockLines || warehouseId == null) return;
    apiFetch(`${API_BASE}/PhysicalAssets/by-warehouse/${warehouseId}`)
      .then((r) => r.json())
      .then(setStockLines)
      .catch(() => setStockLines([]));
  }, [stockLines, warehouseId]);

  function toggleInventoryDomain(domain: string) {
    setExpandedInventoryDomains((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  }

  const groupedStock = React.useMemo(() => {
    const byDomain = new Map<string, Map<string, any[]>>();
    if (!stockLines) return byDomain;
    const filtered = stockSearch.trim()
      ? stockLines.filter(
          (l) =>
            l.partNumber.toLowerCase().includes(stockSearch.toLowerCase()) ||
            l.name.toLowerCase().includes(stockSearch.toLowerCase()),
        )
      : stockLines;
    filtered.forEach((l) => {
      if (!byDomain.has(l.domain)) byDomain.set(l.domain, new Map());
      const gm = byDomain.get(l.domain)!;
      if (!gm.has(l.materialGroup)) gm.set(l.materialGroup, []);
      gm.get(l.materialGroup)!.push(l);
    });
    return byDomain;
  }, [stockLines, stockSearch]);

  // =========================================================
  // Chargement des stats + activités, à chaque changement de projet
  // =========================================================
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    retry: retryStats,
  } = useFetchState<DashboardStats | null>(
    async (signal) => {
      if (selectedProjectId == null) return null;
      const res = await apiFetch(
        `${API_BASE}/Dashboard/stats?projectId=${selectedProjectId}`,
        { signal },
      );
      if (!res.ok) throw new Error("stats apiFetch failed");
      return res.json();
    },
    [selectedProjectId],
  );

  const {
    data: activities,
    loading: activitiesLoading,
    error: activitiesError,
    retry: retryActivities,
  } = useFetchState<ActivityLog[] | null>(
    async (signal) => {
      // Réservé Admin/Supervisor côté backend (ActivityLogsController.GetRecent) — un
      // visiteur ne doit jamais voir cette section basculer en erreur de chargement,
      // donc on ne tente même pas l'appel : elle reste simplement vide pour lui.
      if (!isElevated || selectedProjectId == null) return null;
      const res = await apiFetch(
        `${API_BASE}/ActivityLogs?projectId=${selectedProjectId}&take=10`,
        { signal },
      ).then(checkAccess);
      return res.json();
    },
    [selectedProjectId, isElevated],
  );

  // Réinitialise les panneaux ouverts en changeant de projet — les données affichées
  // ne doivent jamais mélanger deux projets différents
  useEffect(() => {
    setOpenCard(null);
    setDomainSummary(null);
    setSmrPreview(null);
    setExpandedDomain(null);
    setGroupCache({});
  }, [selectedProjectId]);

  // =========================================================
  // Real-Time Inventory : chargement paresseux
  // =========================================================
  const loadDomainSummary = useCallback(() => {
    if (domainSummary || domainLoading) return;
    setDomainLoading(true);
    apiFetch(`${API_BASE}/PhysicalAssets/summary`)
      .then((res) => res.json())
      .then((data) => setDomainSummary(data.byDomain ?? []))
      .catch(() => setDomainSummary([]))
      .finally(() => setDomainLoading(false));
  }, [domainSummary, domainLoading]);

  const loadGroupBreakdown = useCallback(
    (domain: string) => {
      if (groupCache[domain]) return;
      setGroupLoading(domain);
      apiFetch(`${API_BASE}/PhysicalAssets/summary/${domain}`)
        .then((res) => res.json())
        .then((data: MaterialGroupSummary[]) =>
          setGroupCache((prev) => ({ ...prev, [domain]: data })),
        )
        .catch(() => setGroupCache((prev) => ({ ...prev, [domain]: [] })))
        .finally(() => setGroupLoading(null));
    },
    [groupCache],
  );

  // Dans toggleCard, retire le cas spécial 'smrs' qu'on avait ajouté :
  function toggleCard(key: CardKey) {
    const next = openCard === key ? null : key;
    setOpenCard(next);
    if (next === "inventory") loadStockLines();
    if (next !== "inventory") setExpandedDomain(null);
    if (next === "smrs") loadSmrPreview();
  }
  function toggleDomain(domain: string) {
    const next = expandedDomain === domain ? null : domain;
    setExpandedDomain(next);
    if (next) loadGroupBreakdown(domain);
  }

  function handleProjectCreated(project: Project) {
    addProject(project);
    setShowCreateModal(false);
  }

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      {/* ---------- HEADER : titre + sélecteur de projet ---------- */}
     <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
  <div>
    <h1 className="text-lg md:text-xl font-bold text-[#0F172A] mb-1">{t("dashboard.title")}</h1>
    <p className="text-xs md:text-sm text-slate-500">{t("dashboard.subtitle")}</p>
  </div>

  <div className="flex items-center gap-2 flex-wrap" ref={dropdownRef}>
          {/* Dropdown projet */}
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:border-[#124191] transition-colors min-w-[200px] md:min-w-0 flex-1 md:flex-none justify-between"
            >
              <span className="flex items-center gap-2">
                {!projects ? (
                  <span className="inline-block h-4 w-24 bg-slate-200 rounded animate-pulse" />
                ) : selectedProject ? (
                  <>
                    <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-1.5 py-0.5 rounded">
                      {selectedProject.code}
                    </span>
                    {selectedProject.name}
                  </>
                ) : (
                  t("dashboard.noProject")
                )}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  projectDropdownOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {projectDropdownOpen && projects && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1.5 max-h-80 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[#EAF1FC] transition-colors ${
                      p.id === selectedProjectId ? "bg-[#EAF1FC]" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                      <span className="font-medium text-[#0F172A]">
                        {p.name}
                      </span>
                    </span>
                    {!p.hasFullTraceability && (
                      <span
                        title="Données historiques limitées"
                        className="text-[10px] text-slate-400 border border-slate-200 rounded px-1"
                      >
                        archivé
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton créer un projet */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 justify-center bg-[#124191] text-white text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-[#0d3373] transition-colors flex-1 md:flex-none whitespace-nowrap"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14m-7-7h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {t("dashboard.newProject")}
          </button>
        </div>
      </div>

      {/* Bandeau info projet archivé */}
      {selectedProject && !selectedProject.hasFullTraceability && (
        <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5">
          <svg
            className="w-4 h-4 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
          {t("dashboard.archivedBanner")}
        </div>
      )}

      {/* ---------- 4 KPI CARDS ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {CARD_CONFIG.map((cfg, idx) => {
  const value = stats ? statsValue(stats, cfg.key) : null;
  const unavailable = !!(stats && value === null);

  return (
    <button
      key={cfg.key}
      disabled={unavailable}
      onClick={() => !unavailable && toggleCard(cfg.key)}
      style={{ animationDelay: `${idx * 60}ms` }}
      className={`text-left bg-white rounded-xl border p-4 md:p-5 transition-all duration-150 animate-[fadeIn_.4s_ease_backwards]
        ${unavailable ? "opacity-60 cursor-not-allowed" : ""}
        ${
          openCard === cfg.key
            ? "border-[#F2790B] shadow-[0_0_0_1px_#F2790B] -translate-y-0.5"
            : "border-slate-200 hover:border-[#F2790B] hover:-translate-y-0.5 hover:shadow-md"
        }`}
    >
              <div className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-lg ${cfg.badgeBg} text-white font-bold flex items-center justify-center text-sm`}
                >
                  {cfg.badge}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {t(cfg.labelKey)}
                </span>
              </div>

              <div className="mt-3">
                {statsError ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      retryStats();
                    }}
                    title={t("common.retry")}
                    className="text-sm text-red-500 underline decoration-dotted cursor-pointer hover:text-red-600"
                  >
                    {t("dashboard.errorLoading")}
                  </span>
                ) : statsLoading || !stats ? (
                  <span className="inline-block h-7 w-16 bg-slate-200 rounded animate-pulse" />
                ) : unavailable ? (
                  <span className="text-sm text-slate-400 italic">
                    {t("dashboard.unavailable")}
                  </span>
                ) : cfg.key === "inventory" ? (
                  <>
                    <span className="text-slate-300 font-bold text-[#0F172A]">
                      {value!.toLocaleString("fr-FR")}
                    </span>
                    <div className=" text-black mt-1">
                      {activities && activities[0]
                        ? `Dernière transaction : ${new Date(
                            activities[0].timestamp,
                          ).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })} à ${new Date(
                            activities[0].timestamp,
                          ).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "Aucune transaction récente"}
                    </div>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[#0F172A]">
                    {value!.toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ---------- DETAIL PANEL — Real-Time Inventory par Domain ---------- */}
      {openCard === "inventory" && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden text-black animate-[slideDown_.25s_ease]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Real-Time Inventory — matériel en stock (indépendant du projet)
            </h3>
            <button
              onClick={() => setOpenCard(null)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="p-4">
            <input
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Filtrer par code ou description…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#124191]/30"
            />

            {!stockLines && warehousesError ? (
              <ErrorState
                message="Impossible de déterminer l'entrepôt par défaut."
                onRetry={retryWarehouses}
              />
            ) : !stockLines ? (
              <SkeletonRows count={5} />
            ) : stockLines.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Aucune donnée de stock disponible.
              </p>
            ) : (
              Array.from(groupedStock.entries()).map(([domain, groupMap]) => {
                const domainRefs = Array.from(groupMap.values()).flat().length;
                const domainQty = Array.from(groupMap.values())
                  .flat()
                  .reduce((a: number, l: any) => a + l.totalQuantity, 0);
                const isOpen =
                  expandedInventoryDomains.has(domain) ||
                  stockSearch.trim() !== "";

                return (
                  <div
                    key={domain}
                    className="border border-slate-100 rounded-lg mb-2 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleInventoryDomain(domain)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#EAF1FC] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="font-semibold text-sm text-[#0F172A]">
                          {domain}
                        </span>
                        <span className="text-xs text-slate-400">
                          {domainRefs} réf. ·{" "}
                          {domainQty.toLocaleString("fr-FR")} unités
                        </span>
                      </div>
                    </button>

                   {isOpen && (
  <div className="border-t border-slate-100">
    {Array.from(groupMap.entries()).map(
      ([materialGroup, lines]: [string, any[]]) => (
        <div key={materialGroup}>
          <div className="px-4 py-1.5 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            {materialGroup}
          </div>

          {/* Vue tableau — desktop uniquement */}
          <table className="w-full text-sm hidden sm:table">
            <tbody>
              {lines.map((l: any) => (
                <tr key={l.hardwareProductId} className="border-b border-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-[#124191]">
                    {l.partNumber}
                  </td>
                  <td className="px-4 py-2">{l.name}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {l.totalQuantity}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-red-600">
                    {l.defectiveQuantity || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Vue cartes empilées — mobile uniquement */}
          <div className="sm:hidden divide-y divide-slate-50">
            {lines.map((l: any) => (
              <div key={l.hardwareProductId} className="px-4 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-[#124191] font-semibold">
                    {l.partNumber}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#0F172A]">
                    {l.totalQuantity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 truncate pr-2">{l.name}</span>
                  {l.defectiveQuantity > 0 && (
                    <span className="text-xs font-mono text-red-600 whitespace-nowrap">
                      {l.defectiveQuantity} déf.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    )}
  </div>
)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------- DETAIL PANEL — HW Shipment / SMRs / Faulty HW RMA (à câbler) ---------- */}
      {openCard && openCard !== "inventory" && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden animate-[slideDown_.25s_ease]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              {(() => {
                const key = CARD_CONFIG.find((c) => c.key === openCard)?.labelKey;
                return key ? t(key) : null;
              })()}
            </h3>
            <button
              onClick={() => setOpenCard(null)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="p-4">
            {openCard === "shipment" && selectedProjectId != null && (
              <ShipmentDetailPanel projectId={selectedProjectId} />
            )}
            {openCard === "smrs" && (
              <div>
                {!smrPreview ? (
                  <SkeletonRows count={3} compact />
                ) : smrPreview.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Aucune SMR pour ce projet.
                  </p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {smrPreview.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between px-3 py-2 border border-slate-100 rounded-lg text-sm"
                      >
                        <span className="font-mono text-[#124191] font-semibold">
                          {s.smrNumber}
                        </span>
                        <span className="text-slate-500">{s.client?.name}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            s.status === "Approved"
                              ? s.hasShortfall
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                              : s.status === "Rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {s.status === "Approved"
                            ? s.hasShortfall
                              ? "Approuvée (partielle)"
                              : "Approuvée"
                            : s.status === "Rejected"
                              ? "Rejetée"
                              : "En attente"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <a
                  href="/smr"
                  className="text-xs font-semibold text-[#124191] hover:underline"
                >
                  Voir toutes les SMR →
                </a>
              </div>
            )}
            {openCard === "faulty" && selectedProjectId != null && (
              <RmaDetailPanel projectId={selectedProjectId} limit={4} />
            )}
          </div>
        </div>
      )}

      {/* ---------- TABLEAU : ACTIVITÉS RÉCENTES ---------- */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-[fadeIn_.4s_ease]">
        <button
          onClick={() => setActivitiesCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 text-left hover:bg-slate-100 transition-colors"
        >
          <h3 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.recentActivities")}
          </h3>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activitiesCollapsed ? "" : "rotate-180"}`}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {!activitiesCollapsed && (
        <div className="overflow-x-auto animate-[slideDown_.2s_ease]">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Type</th>
                <th className="text-left font-medium px-5 py-3">Description</th>
                <th className="text-left font-medium px-5 py-3">Par</th>
              </tr>
            </thead>
            <tbody>
              {activitiesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={4} className="px-5 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : activitiesError ? (
                <tr>
                  <td colSpan={4} className="px-5 py-2">
                    <ErrorState
                      message={activitiesError}
                      onRetry={retryActivities}
                    />
                  </td>
                </tr>
              ) : !isElevated ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-slate-400 italic"
                  >
                    {t("dashboard.restrictedSection")}
                  </td>
                </tr>
              ) : !activities || activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-slate-400"
                  >
                    {t("dashboard.noRecentActivity")}
                  </td>
                </tr>
              ) : (
                activities.map((a) => {
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
                        {new Date(a.timestamp).toLocaleString("fr-FR")}
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
                })
              )}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-right ">
            <a href="/history" className="text-xs font-semibold text-[#124191] hover:underline">
              {t("dashboard.viewFullHistory")}
            </a>
          </div>
        </div>
        )}
      </div>
      {selectedProjectId != null && (
  <>
    <StockSufficiencyPanel projectId={selectedProjectId} />
    <DeploymentMatrixPanel projectId={selectedProjectId} />
    <SubcontractorDeploymentPanel projectId={selectedProjectId} />
  </>
)}

      

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}

// =========================================================
// Modale de création de projet
// =========================================================
function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !startDate) {
      setError(t("dashboard.createProject.requiredFields"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/Projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          startDate,
          endDate: endDate || null,
        }),
      });
      if (!res.ok) throw new Error("Échec de la création");
      const created: Project = await res.json();
      onCreated(created);
    } catch {
      setError(t("dashboard.createProject.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">{t("dashboard.newProject")}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-black">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {t("dashboard.createProject.name")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dashboard.createProject.namePlaceholder")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {t("dashboard.createProject.code")}
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("dashboard.createProject.codePlaceholder")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {t("dashboard.createProject.startDate")}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {t("dashboard.createProject.endDate")}{" "}
                <span className="text-slate-400 font-normal">{t("dashboard.createProject.optional")}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors disabled:opacity-60"
            >
              {submitting ? t("dashboard.createProject.creating") : t("dashboard.createProject.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
function statsValue(stats: DashboardStats, key: CardKey): number | null {
  switch (key) {
    case "shipment":
      return stats.hwShipment;
    case "inventory":
      return stats.realTimeInventory;
    case "smrs":
      return stats.smrs;
    case "faulty":
      return stats.faultyHwRma;
  }
}

function SkeletonRows({
  count,
  compact = false,
}: {
  count: number;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-slate-100 rounded animate-pulse ${compact ? "h-6" : "h-11"}`}
        />
      ))}
    </div>
  );
}
