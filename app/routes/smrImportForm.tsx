import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';
import { useFetchState } from '../useFetchState';

interface Subcontractor { id: number; name: string; }
interface Client { id: number; name: string; }

export default function SmrImportForm({
  projectId,
  onClose,
  onImported,
}: {
  projectId: number;
  onClose: () => void;
  onImported: () => void;
}) {
  const [subcontractorId, setSubcontractorId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [smrNumber, setSmrNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skippedSites: number } | null>(null);

  const {
    data: subcontractors,
    error: subcontractorsError,
    retry: retrySubcontractors,
  } = useFetchState<Subcontractor[]>(
    (signal) => apiFetch(`${API_BASE}/Subcontractors`, { signal }).then((r) => r.json()),
    [],
  );
  const {
    data: clients,
    error: clientsError,
    retry: retryClients,
  } = useFetchState<Client[]>(
    (signal) => apiFetch(`${API_BASE}/Clients`, { signal }).then((r) => r.json()),
    [],
  );
  const {
    data: warehouses,
    error: warehousesError,
    retry: retryWarehouses,
  } = useFetchState<{ id: number }[]>(
    (signal) => apiFetch(`${API_BASE}/Warehouses`, { signal }).then((r) => r.json()),
    [],
  );
  const warehouseId = warehouses?.[0]?.id ?? null;

  // Déplie la matrice pivot (sites en colonnes, matériel en lignes) en lignes plates.
  function parsePivotSheet(rows: any[][]): { siteName: string; siteType: string; partNumber: string; description: string; quantity: number }[] {
  // Cherche dynamiquement la ligne contenant "Code" — fonctionne qu'il y ait ou non
  // une ligne de titre au-dessus (ex: "ZEMTIC" fusionné avant les en-têtes réels).
  const headerRowIdx = rows.findIndex((row) =>
    row.some((c) => typeof c === 'string' && /^code$/i.test(c.trim()))
  );
  if (headerRowIdx === -1) return [];

  const headerRow = rows[headerRowIdx];      // Code | Items | Site1 | Site2 | ... | TOTAL
  const typeRow = rows[headerRowIdx + 1] ?? []; // (vide) | (vide) | urban | suburb | ... | (vide)

  const codeColIdx = headerRow.findIndex((c) => typeof c === 'string' && /^code$/i.test(c.trim()));
  const totalColIdx = headerRow.findIndex((c) => typeof c === 'string' && /^total$/i.test(c.trim()));

  if (codeColIdx === -1) return [];

  const siteColStart = codeColIdx + 2; // après Code + Items
  const siteColEnd = totalColIdx !== -1 ? totalColIdx : headerRow.length;

  // Vérifie si la ligne suivante contient vraiment des types de site (urban/suburb/rur-high),
  // sinon les données commencent juste après l'en-tête, sans ligne de sous-type.
  const hasTypeRow = typeRow.slice(siteColStart, siteColEnd).some(
    (c) => typeof c === 'string' && /^(urban|suburb|rur-high)$/i.test(c.trim())
  );
  const dataStart = headerRowIdx + (hasTypeRow ? 2 : 1);

  const out: { siteName: string; siteType: string; partNumber: string; description: string; quantity: number }[] = [];

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    const partNumber = row[codeColIdx];
    const description = row[codeColIdx + 1];
    if (!partNumber) continue;

    for (let c = siteColStart; c < siteColEnd; c++) {
      const qty = parseInt(row[c]) || 0;
      if (qty <= 0) continue;
      const siteName = headerRow[c];
      const siteType = hasTypeRow ? typeRow[c] : '';
      if (!siteName) continue;

      out.push({
        siteName: String(siteName).trim(),
        siteType: String(siteType ?? '').trim(),
        partNumber: String(partNumber).trim(),
        description: String(description ?? '').trim(),
        quantity: qty,
      });
    }
  }
  return out;
}

  async function handleImport() {
    if (!file || subcontractorId == null || clientId == null || warehouseId == null || !smrNumber.trim()) {
      setError('Tous les champs sont requis.');
      return;
    }
    setBusy(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]]; // la feuille du sous-traitant sélectionné
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        const lines = parsePivotSheet(rows);
        if (lines.length === 0) {
          setError('Aucune ligne exploitable détectée dans ce fichier.');
          setBusy(false);
          return;
        }

        const res = await apiFetch(`${API_BASE}/SmrRequests/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId, warehouseId, subcontractorId, clientId, smrNumber,
            lines: lines.map((l) => ({
              siteName: l.siteName, siteType: l.siteType,
              partNumber: l.partNumber, description: l.description, quantity: l.quantity,
            })),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setResult(await res.json());
      } catch (err: any) {
        setError(err.message || "Échec de l'import.");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">Importer une SMR (par sous-traitant)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {result ? (
          <div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-black rounded-lg px-3 py-2.5 mb-4">
              {result.created} ligne(s) importée(s){result.skippedSites > 0 ? `, ${result.skippedSites} ignorée(s) (référence inconnue)` : ''}.
            </div>
            <p className="text-xs text-black mb-4">
              La SMR est en attente — approuvez-la depuis la liste pour déduire le stock.
            </p>
            <div className="flex justify-end">
              <button onClick={onImported} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373]">
                Terminé
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}
            {(subcontractorsError || clientsError || warehousesError) && (
              <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                <span>Certaines listes n'ont pas pu être chargées.</span>
                <button
                  type="button"
                  onClick={() => { retrySubcontractors(); retryClients(); retryWarehouses(); }}
                  className="font-semibold underline flex-shrink-0"
                >
                  Réessayer
                </button>
              </div>
            )}

            <input value={smrNumber} onChange={(e) => setSmrNumber(e.target.value)} placeholder="N° SMR" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 text-black" />

            <select value={subcontractorId ?? ''} onChange={(e) => setSubcontractorId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 text-black">
              <option value="">Sous-traitant…</option>
              {subcontractors?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={clientId ?? ''} onChange={(e) => setClientId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
              <option value="">Client…</option>
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-5" />

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={handleImport} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
                {busy ? 'Import…' : 'Importer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}