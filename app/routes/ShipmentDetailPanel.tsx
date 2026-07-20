import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface ShipmentListItem {
  id: number;
  deliveryNumber: string;
  scope: string;
  location: string;
  mot: string;
  vesselDepartureDate: string | null;
  vesselArrivalDate: string | null;
  invoiceNumber: string | null;
  containersCount: number | null;
  waybill: string | null;
  isApproved: boolean;
  status: 'Pending' | 'Delivered';
}

interface ShipmentDetail extends ShipmentListItem {
  approvedBy: string | null;
  approvalDate: string | null;
  materials: { id: number; partNumber: string; name: string; quantity: number; defectiveQuantity: number; serialNumber: string; }[];
  expectedMaterials: { partNumber: string; description: string; expectedQuantity: number }[]; // NOUVEAU
}

export default function ShipmentDetailPanel({ projectId }: { projectId: number }) {
  const [shipments, setShipments] = useState<ShipmentListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setShipments(null);
    setError(false);
    const controller = new AbortController();
    apiFetch(`${API_BASE}/DeliveryNotes?projectId=${projectId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setShipments)
      .catch((err) => err.name !== 'AbortError' && setError(true));
    return () => controller.abort();
  }, [projectId]);

  function refreshList() {
    apiFetch(`${API_BASE}/DeliveryNotes?projectId=${projectId}`)
      .then((res) => res.json())
      .then(setShipments)
      .catch(() => {});
  }

  return (
    <>
    <div className="flex justify-end mb-2">
  <button
    onClick={() => shipments && exportShipmentsToExcel(shipments, projectId)}
    disabled={!shipments || shipments.length === 0}
    className="text-xs font-semibold text-[#124191] hover:underline disabled:opacity-40"
  >
    Exporter en Excel
  </button>
</div>
      <div className="table-wrap text-black">
        {!shipments ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-400 text-center py-6">
            Impossible de charger les shipments.
          </p>
        ) : shipments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Aucun shipment enregistré pour ce projet.
          </p>
        ) : (
          <table className="w-full text-black">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left font-medium px-4 py-2.5">#</th>
                <th className="text-left font-medium px-4 py-2.5">Scope</th>
                <th className="text-left font-medium px-4 py-2.5">Location</th>
                <th className="text-left font-medium px-4 py-2.5">MOT</th>
                <th className="text-left font-medium px-4 py-2.5">Arrivée</th>
                <th className="text-left font-medium px-4 py-2.5">Invoice</th>
                <th className="text-left font-medium px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="border-b border-slate-50 cursor-pointer hover:bg-[#EAF1FC] transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-[#124191]">{s.deliveryNumber}</td>
                  <td className="px-4 py-2.5">{s.scope}</td>
                  <td className="px-4 py-2.5">{s.location}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.mot}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">
                    {s.vesselArrivalDate
                      ? new Date(s.vesselArrivalDate).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{s.invoiceNumber ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {s.status === 'Delivered' ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Livré
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        En attente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId != null && (
        <ShipmentModal
          shipmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onConfirmed={() => {
            setSelectedId(null);
            refreshList();
          }}
        />
      )}
    </>
  );
}
function exportShipmentsToExcel(shipments: ShipmentListItem[], projectId: number) {
  const rows = shipments.map((s) => ({
    'N° Shipment': s.deliveryNumber,
    'Scope': s.scope,
    'Location': s.location,
    'MOT': s.mot,
    'Date départ': s.vesselDepartureDate ? new Date(s.vesselDepartureDate).toLocaleDateString('fr-FR') : '',
    'Date arrivée': s.vesselArrivalDate ? new Date(s.vesselArrivalDate).toLocaleDateString('fr-FR') : '',
    'Invoice': s.invoiceNumber ?? '',
    'Conteneurs': s.containersCount ?? '',
    'Waybill': s.waybill ?? '',
    'Statut': s.status === 'Delivered' ? 'Livré' : 'En attente',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
  XLSX.writeFile(wb, `shipments-projet${projectId}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// =========================================================
// Modale de détail + formulaire de confirmation
// =========================================================
export function ShipmentModal({
  shipmentId,
  onClose,
  onConfirmed,
}: {
  shipmentId: number;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch(`${API_BASE}/DeliveryNotes/${shipmentId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setShipment)
      .catch(() => setError(true));
  }, [shipmentId]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Shipment {shipment?.deliveryNumber ?? '…'}
            </h3>
            {shipment && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {shipment.scope} · {shipment.location}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <p className="text-sm text-red-500">Impossible de charger ce shipment.</p>
          ) : !shipment ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <Field label="Mode de transport" value={shipment.mot} />
                <Field label="Nb. conteneurs" value={shipment.containersCount?.toString() ?? '—'} />
                <Field
                  label="Date de départ"
                  value={
                    shipment.vesselDepartureDate
                      ? new Date(shipment.vesselDepartureDate).toLocaleDateString('fr-FR')
                      : '—'
                  }
                />
                <Field
                  label="Date d'arrivée"
                  value={
                    shipment.vesselArrivalDate
                      ? new Date(shipment.vesselArrivalDate).toLocaleDateString('fr-FR')
                      : '—'
                  }
                />
                <Field label="N° facture" value={shipment.invoiceNumber ?? '—'} mono />
                <Field label="Sea waybill n°" value={shipment.waybill ?? '—'} mono />
              </div>
              {shipment.status === 'Pending' && (
  <CancelShipmentButton shipment={shipment} onCancelled={onConfirmed} />
)}

              {shipment.status === 'Delivered' ? (
                <DeliveredMaterialsTable shipment={shipment} />
              ) : (
                <ConfirmDeliveryForm shipment={shipment} onConfirmed={onConfirmed} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </label>
      <div className={`font-semibold text-[#0F172A] ${mono ? 'font-mono text-sm' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function DeliveredMaterialsTable({ shipment }: { shipment: ShipmentDetail }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
        Matériel réceptionné
        <span className="text-xs font-normal text-slate-400">
          confirmé par {shipment.approvedBy} le{' '}
          {shipment.approvalDate && new Date(shipment.approvalDate).toLocaleDateString('fr-FR')}
        </span>
      </h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
            <th className="text-left font-medium py-2">Code</th>
            <th className="text-left font-medium py-2">Description</th>
            <th className="text-right font-medium py-2">Qté</th>
            <th className="text-right font-medium py-2">Défectueux</th>
          </tr>
        </thead>
        <tbody>
          {shipment.materials.map((m) => (
            <tr key={m.id} className="border-b border-slate-50 text-black">
              <td className="py-2 font-mono text-[#124191]">{m.partNumber}</td>
              <td className="py-2">{m.name}</td>
              <td className="py-2 text-right font-mono">{m.quantity}</td>
              <td className="py-2 text-right font-mono text-red-600">
                {m.defectiveQuantity || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =========================================================
// Formulaire de confirmation d'arrivée (shipment Pending)
// =========================================================
interface AssetLine {
  partNumber: string;
  productName: string;
  materialGroup: string;
  isNewProduct: boolean; // affiché tel quel, l'admin coche s'il sait que c'est nouveau
  domain: string;
  isSerialized: boolean;
  expectedQty: number;
  receivedQty: number;
  scannedSerial: string;
  isManuallyCounted: boolean;
}

const EMPTY_LINE: AssetLine = {
  partNumber: '',
  productName: '',
  materialGroup: '',
  isNewProduct: false,
  domain: 'RAN',
  isSerialized: true,
  expectedQty: 0,
  receivedQty: 0,
  scannedSerial: '',
  isManuallyCounted: false,
};

const DOMAINS = ['RAN', 'Microwave', 'Energy', 'Core', 'Consumables'];

function ConfirmDeliveryForm({
  shipment,
  onConfirmed,
}: {
  shipment: ShipmentDetail;
  onConfirmed: () => void;
}) {
  const [supervisorName, setSupervisorName] = useState('');
  const [lines, setLines] = useState<AssetLine[]>(() => {
  if (shipment.expectedMaterials && shipment.expectedMaterials.length > 0) {
    return shipment.expectedMaterials.map((m) => ({
      ...EMPTY_LINE,
      partNumber: m.partNumber,
      productName: m.description,
      expectedQty: m.expectedQuantity,
      receivedQty: m.expectedQuantity, // suppose reçu conforme par défaut ; l'admin ajuste si écart
    }));
  }
  return [{ ...EMPTY_LINE }];
});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(idx: number, patch: Partial<AssetLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supervisorName.trim()) {
      setError('Le nom du superviseur est requis.');
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.partNumber.trim())) {
      setError('Chaque ligne doit avoir un code matériel.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/Deliveries/approve-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryNumber: shipment.deliveryNumber,
          purchaseOrder: '',
          supervisorName,
          verifiedAssets: lines.map((l) => ({
            partNumber: l.partNumber,
            productName: l.productName,
            materialGroup: l.materialGroup,
            domain: l.isNewProduct ? l.domain : undefined,
            isSerialized: l.isNewProduct ? l.isSerialized : undefined,
            expectedQty: l.expectedQty,
            receivedQty: l.receivedQty,
            scannedSerial: l.scannedSerial,
            isManuallyCounted: l.isManuallyCounted,
          })),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Échec de la confirmation.');
      }
      onConfirmed();
    } catch (err: any) {
      setError(err.message ?? 'Échec de la confirmation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-black">
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
        Ce shipment est en attente — confirmez ce qui a été réellement reçu pour l'injecter en
        stock.
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="mb-4 text-black">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          Nom du superviseur
        </label>
        <input
          value={supervisorName}
          onChange={(e) => setSupervisorName(e.target.value)}
          placeholder="ex : Al Tchagnao"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
        />
      </div>

      <h4 className="text-sm font-semibold text-[#0F172A] mb-2 text-black">Matériel réceptionné</h4>
      <div className="space-y-3 mb-3">
        {lines.map((line, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-3 relative">
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(idx)}
                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                placeholder="Code matériel (Part Number)"
                value={line.partNumber}
                onChange={(e) => updateLine(idx, { partNumber: e.target.value })}
                className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#124191]"
              />
              <input
                placeholder="Description"
                value={line.productName}
                onChange={(e) => updateLine(idx, { productName: e.target.value })}
                className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#124191]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2 text-black">
              <input
                type="number"
                placeholder="Qté attendue"
                value={line.expectedQty || ''}
                onChange={(e) => updateLine(idx, { expectedQty: parseInt(e.target.value) || 0 })}
                className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#124191]"
              />
              <input
                type="number"
                placeholder="Qté reçue"
                value={line.receivedQty || ''}
                onChange={(e) => updateLine(idx, { receivedQty: parseInt(e.target.value) || 0 })}
                className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#124191]"
              />
              <input
                placeholder="N° série scanné (optionnel)"
                value={line.scannedSerial}
                onChange={(e) => updateLine(idx, { scannedSerial: e.target.value })}
                className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#124191]"
              />
            </div>

            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={line.isManuallyCounted}
                  onChange={(e) => updateLine(idx, { isManuallyCounted: e.target.checked })}
                />
                Compté manuellement
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={line.isNewProduct}
                  onChange={(e) => updateLine(idx, { isNewProduct: e.target.checked })}
                />
                Nouvelle référence (pas encore au catalogue)
              </label>
            </div>

            {line.isNewProduct && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Domaine</label>
                  <select
                    value={line.domain}
                    onChange={(e) => updateLine(idx, { domain: e.target.value })}
                    className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#124191]"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Groupe matériel</label>
                  <input
                    value={line.materialGroup}
                    onChange={(e) => updateLine(idx, { materialGroup: e.target.value })}
                    placeholder="ex : BTS Hardware"
                    className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#124191]"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 col-span-2 mt-1">
                  <input
                    type="checkbox"
                    checked={line.isSerialized}
                    onChange={(e) => updateLine(idx, { isSerialized: e.target.checked })}
                  />
                  Matériel sérialisé (1 unité = 1 numéro de série ; décocher pour un lot/consommable)
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="text-xs font-semibold text-[#124191] hover:underline mb-5"
      >
        + Ajouter une ligne de matériel
      </button>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors disabled:opacity-60"
        >
          {submitting ? 'Confirmation…' : 'Confirmer la réception et injecter en stock'}
        </button>
      </div>
    </form>
  );
}
//fonction pour annuler le flux d'une cargaison
function CancelShipmentButton({
  shipment,
  onCancelled,
}: {
  shipment: ShipmentDetail;
  onCancelled: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/DeliveryNotes/${shipment.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onCancelled();
    } catch (err: any) {
      setError(err.message || "Échec de l'annulation.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-red-600 hover:underline mb-4"
      >
        Annuler ce shipment (livraison non arrivée / problème transport)
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
      <p className="text-sm text-red-700 mb-2">
        Confirmer l'annulation du shipment <strong>{shipment.deliveryNumber}</strong> ? Cette action est définitive.
      </p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? 'Annulation…' : 'Oui, annuler'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
        >
          Retour
        </button>
      </div>
    </div>
  );
}