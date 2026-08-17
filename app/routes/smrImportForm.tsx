import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  //
  // Deux mises en page rencontrées dans les fichiers sous-traitants — les noms de site
  // (ex: "WAHALA-LAHE", "ATAKPAME-KAMINA"…) ne sont PAS forcément sur la même ligne que
  // "Code" :
  //   Mise en page A : Code | Items | Site1 | Site2 | ...   (ligne "Code")
  //                     —    | —     | urban | suburb | ...  (ligne suivante = types)
  //   Mise en page B : —    | —     | Site1 | Site2 | ...   (ligne AU-DESSUS de "Code")
  //                     Code | Items | urban | suburb | ...  (ligne "Code" = types)
  // Confondre les deux fait passer "urban"/"suburb" pour un nom de site — les déploiements
  // de sites différents avec le même type se retrouvent alors fusionnés à tort.
  function parsePivotSheet(rows: any[][]): { siteName: string; siteType: string; partNumber: string; description: string; quantity: number }[] {
  // Cherche dynamiquement la ligne contenant "Code" — fonctionne qu'il y ait ou non
  // une ligne de titre au-dessus (ex: "ZEMTIC" fusionné avant les en-têtes réels).
  const codeRowIdx = rows.findIndex((row) =>
    row.some((c) => typeof c === 'string' && /^code$/i.test(c.trim()))
  );
  if (codeRowIdx === -1) return [];

  const codeRow = rows[codeRowIdx];
  const codeColIdx = codeRow.findIndex((c) => typeof c === 'string' && /^code$/i.test(c.trim()));
  const totalColIdx = codeRow.findIndex((c) => typeof c === 'string' && /^total$/i.test(c.trim()));

  if (codeColIdx === -1) return [];

  const siteColStart = codeColIdx + 2; // après Code + Items
  const siteColEnd = totalColIdx !== -1 ? totalColIdx : codeRow.length;

  const isTypeRow = (row: any[]) =>
    row.slice(siteColStart, siteColEnd).some(
      (c) => typeof c === 'string' && /^(urban|suburb|rur-high)$/i.test(c.trim())
    );

  const rowBelow = rows[codeRowIdx + 1] ?? [];
  const rowAbove = rows[codeRowIdx - 1] ?? [];

  let siteNameRow: any[];
  let siteTypeRow: any[] | null;
  let dataStart: number;

  if (isTypeRow(codeRow)) {
    // Mise en page B — les types sont sur la ligne "Code" elle-même, les noms de site
    // sont juste au-dessus.
    siteTypeRow = codeRow;
    siteNameRow = rowAbove;
    dataStart = codeRowIdx + 1;
  } else if (isTypeRow(rowBelow)) {
    // Mise en page A — les noms de site sont sur la ligne "Code", les types en dessous.
    siteTypeRow = rowBelow;
    siteNameRow = codeRow;
    dataStart = codeRowIdx + 2;
  } else {
    // Pas de ligne de types du tout — les noms de site sont sur la ligne "Code".
    siteTypeRow = null;
    siteNameRow = codeRow;
    dataStart = codeRowIdx + 1;
  }

  const out: { siteName: string; siteType: string; partNumber: string; description: string; quantity: number }[] = [];

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    const partNumber = row[codeColIdx];
    const description = row[codeColIdx + 1];
    if (!partNumber) continue;

    for (let c = siteColStart; c < siteColEnd; c++) {
      const qty = parseInt(row[c]) || 0;
      if (qty <= 0) continue;
      const siteName = siteNameRow[c];
      const siteType = siteTypeRow ? siteTypeRow[c] : '';
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
      setError(t('forms.smrImport.allFieldsRequired'));
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
          setError(t('forms.smrImport.noUsableRows'));
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
        setError(err.message || t('forms.smrImport.importFailed'));
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
          <h3 className="text-base font-bold text-[#0F172A]">{t('forms.smrImport.title')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {result ? (
          <div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-black rounded-lg px-3 py-2.5 mb-4">
              {t('forms.smrImport.importedLines', { count: result.created })}{result.skippedSites > 0 ? t('forms.smrImport.skippedLines', { count: result.skippedSites }) : ''}.
            </div>
            <p className="text-xs text-black mb-4">
              {t('forms.smrImport.pendingNotice')}
            </p>
            <div className="flex justify-end">
              <button onClick={onImported} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373]">
                {t('forms.smrImport.done')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}
            {(subcontractorsError || clientsError || warehousesError) && (
              <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                <span>{t('forms.smrImport.listsLoadFailed')}</span>
                <button
                  type="button"
                  onClick={() => { retrySubcontractors(); retryClients(); retryWarehouses(); }}
                  className="font-semibold underline flex-shrink-0"
                >
                  {t('common.retry')}
                </button>
              </div>
            )}

            <input value={smrNumber} onChange={(e) => setSmrNumber(e.target.value)} placeholder={t('forms.smrImport.smrNumberPlaceholder')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 text-black" />

            <select value={subcontractorId ?? ''} onChange={(e) => setSubcontractorId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 text-black">
              <option value="">{t('forms.smrImport.subcontractorPlaceholder')}</option>
              {subcontractors?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={clientId ?? ''} onChange={(e) => setClientId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
              <option value="">{t('forms.smrImport.clientPlaceholder')}</option>
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-5" />

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">{t('common.cancel')}</button>
              <button onClick={handleImport} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60">
                {busy ? t('forms.smrImport.importing') : t('forms.smrImport.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}