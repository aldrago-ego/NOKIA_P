import React, { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { useProject } from "./project";
import { ShipmentModal } from "./ShipmentDetailPanel";
import CategoryManager from "./CategoryManager";
import { apiFetch } from "../apiFetch";
import StockWithdrawalForm from "./StockWithdrawalForm";
import { useAuth } from "./authContext";
import StockCorrectionForm from "./StockCorrectionForm";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "https://nokia-p-1.onrender.com/api";

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

export default function WarehousePage() {
  const { selectedProjectId, selectedProject } = useProject();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { isAdmin } = useAuth();
  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null,
  );
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  const [lines, setLines] = useState<WarehouseAssetLine[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set(),
  );
  const [toast, setToast] = useState<string | null>(null);

  // ---------- Shipments en attente de confirmation (scopé au projet actif) ----------
  const [pendingShipments, setPendingShipments] = useState<
    PendingShipment[] | null
  >(null);
  const [reviewShipmentId, setReviewShipmentId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // ---------- Chargement de l'entrepôt (un seul, sélection automatique) ----------
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
    fetch(`${API_BASE}/PhysicalAssets/by-warehouse/${selectedWarehouseId}`)
      .then((res) => res.json())
      .then(setLines)
      .catch(() => setError(true));
  }, [selectedWarehouseId]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  // ---------- Charge les shipments Pending du projet actif ----------
  const loadPendingShipments = useCallback(() => {
    if (selectedProjectId == null) return;
    fetch(`${API_BASE}/DeliveryNotes?projectId=${selectedProjectId}`)
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function handleConfirmed() {
    setReviewShipmentId(null);
    loadPendingShipments(); // la ligne confirmée disparaît de la liste d'attente
    loadLines(); // le matériel injecté apparaît dans le stock
    showToast("Livraison confirmée — matériel injecté en stock");
  }

  // ---------- Regroupement par Domain > MaterialGroup ----------
  const grouped = React.useMemo(() => {
    if (!lines) return null;
    const filtered = search.trim()
      ? lines.filter(
          (l) =>
            l.partNumber.toLowerCase().includes(search.toLowerCase()) ||
            l.name.toLowerCase().includes(search.toLowerCase()),
        )
      : lines;

    const byDomain = new Map<string, Map<string, WarehouseAssetLine[]>>();
    filtered.forEach((l) => {
      if (!byDomain.has(l.domain)) byDomain.set(l.domain, new Map());
      const groupMap = byDomain.get(l.domain)!;
      if (!groupMap.has(l.materialGroup)) groupMap.set(l.materialGroup, []);
      groupMap.get(l.materialGroup)!.push(l);
    });
    return byDomain;
  }, [lines, search]);

  function toggleDomain(domain: string) {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  }

  async function updateDefect(assetId: number, value: number, maxQty: number) {
    if (value < 0 || value > maxQty) return;
    try {
      const res = await fetch(`${API_BASE}/PhysicalAssets/${assetId}/defect`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defectiveQuantity: value }),
      });
      if (!res.ok) throw new Error();
      loadLines();
      showToast("Statut mis à jour");
    } catch {
      showToast("Échec de la mise à jour");
    }
  }

  const totalRefs = lines?.length ?? 0;
  const totalQty = lines?.reduce((a, l) => a + l.totalQuantity, 0) ?? 0;
  const totalDefect = lines?.reduce((a, l) => a + l.defectiveQuantity, 0) ?? 0;

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#0F172A]">Warehouse</h1>
            {selectedProject && (
              <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2 py-0.5 rounded-full font-semibold">
                {selectedProject.code} — {selectedProject.name}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Détail du matériel présent actuellement en entrepôt
          </p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2.5 hover:border-[#124191] transition-colors"
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
          Importer shipments (Excel)
        </button>

        <button
          onClick={() => setShowWithdrawalForm(true)}
          disabled={!lines || lines.length === 0}
          className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2.5 hover:border-[#124191] transition-colors disabled:opacity-50"
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
          Donner à un client (sans SMR)
        </button>
        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2.5 hover:border-[#124191] transition-colors"
        >
          Gérer les catégories
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowStockCorrection(true)}
            className="flex items-center gap-1.5 bg-white border border-amber-300 text-sm font-semibold text-amber-700 rounded-lg px-4 py-2.5 hover:bg-amber-50 transition-colors"
          >
            Mettre à jour le stock
          </button>
        )}
      </div>

      {/* ---------- Bandeau : shipments en attente de confirmation ---------- */}
      {pendingShipments && pendingShipments.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
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

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3 text-sm text-black text-slate-500">
        <div className="flex gap-2 flex-wrap">
          <StatChip label="Références" value={totalRefs} />
          <StatChip label="Qté totale" value={totalQty} />
          <StatChip label="Défectueux" value={totalDefect} danger />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par code ou description…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191] text-black"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-400 text-center py-10">
          Impossible de charger le stock de cet entrepôt.
        </p>
      ) : !grouped ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : grouped.size === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">
          Aucun matériel ne correspond à ce filtre.
        </p>
      ) : (
        Array.from(grouped.entries()).map(([domain, groupMap]) => {
          const domainQty = Array.from(groupMap.values())
            .flat()
            .reduce((a, l) => a + l.totalQuantity, 0);
          const domainRefs = Array.from(groupMap.values()).flat().length;
          const isOpen = expandedDomains.has(domain) || search.trim() !== "";

          return (
            <div
              key={domain}
              className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden"
            >
              <button
                onClick={() => toggleDomain(domain)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-[#EAF1FC] transition-colors"
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
                  <span className="font-bold text-sm text-[#0F172A]">
                    {domain}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {domainRefs} réf. · {domainQty.toLocaleString("fr-FR")}{" "}
                    unités
                  </span>
                </div>
              </button>

              {isOpen && (
                <div>
                  {Array.from(groupMap.entries()).map(
                    ([materialGroup, groupLines]) => (
                      <div
                        key={materialGroup}
                        className="border-t border-slate-100 text-black"
                      >
                        <div className="px-5 py-2 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {materialGroup}
                        </div>
                        <table className="w-full text-sm text-black">
                          <thead>
                            <tr className="text-xs text-slate-400 border-b border-slate-100">
                              <th className="text-left font-medium px-5 py-2">
                                Code
                              </th>
                              <th className="text-left font-medium px-5 py-2">
                                Description
                              </th>
                              <th className="text-right font-medium px-5 py-2">
                                Qté en stock
                              </th>
                              <th className="text-right font-medium px-5 py-2">
                                Qté défectueuse
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
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-lg shadow-xl z-50">
          {toast}
        </div>
      )}

      {/* Modale de confirmation de réception (réutilise le formulaire du Dashboard) */}
      {reviewShipmentId != null && (
        <ShipmentModal
          shipmentId={reviewShipmentId}
          onClose={() => setReviewShipmentId(null)}
          onConfirmed={handleConfirmed}
        />
      )}

      {/* Modale d'import avec confirmation explicite du projet cible */}
      {showImportModal && (
        <ImportShipmentsModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            loadPendingShipments();
            showToast(
              "Import terminé — vérifiez les shipments en attente ci-dessous",
            );
          }}
        />
      )}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => {
            setShowCategoryManager(false);
            loadLines(); // recharge le stock pour refléter les nouvelles catégories immédiatement
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
              showToast("Stock mis à jour");
            }}
          />
        )}
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

        const res = await fetch(`${API_BASE}/DeliveryNotes/import`, {
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
              <button
                onClick={handleImport}
                disabled={busy}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors disabled:opacity-60"
              >
                {busy ? "Import…" : "Importer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function exportWarehouseToExcel(lines: WarehouseAssetLine[]) {
  const rows = lines.flatMap((line) =>
    line.units.map((u) => ({
      Domaine: line.domain,
      "Groupe matériel": line.materialGroup,
      "Code (Part Number)": line.partNumber,
      Description: line.name,
      "N° série / Lot": u.serialNumber,
      Quantité: u.quantity,
      "Quantité défectueuse": u.defectiveQuantity,
      Statut: u.defectiveQuantity > 0 ? "Défectueux" : "Bon état",
    })),
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Warehouse");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `warehouse-export-${date}.xlsx`);
}
// Regroupe toutes les unités d'un même code matériel en une seule ligne agrégée.
// Se déplie au clic pour éditer le statut défectueux de chaque numéro de série/lot individuellement.
function MaterialRows({
  line,
  onDefectSave,
}: {
  line: WarehouseAssetLine;
  onDefectSave: (assetId: number, value: number, maxQty: number) => void;
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
