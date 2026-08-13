import React, { useEffect, useState } from "react";
import { apiFetch } from "../apiFetch";
import { useFetchState } from "../useFetchState";
import ErrorState from "../Component/ErrorState";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const DOMAINS = ["RAN", "Microwave", "Energy", "Core", "Consumables"];

interface Category {
  id: number;
  name: string;
  domain: string;
  productCount: number;
  minimumStockThreshold?: number | null; // NOUVEAU
}

interface Product {
  id: number;
  partNumber: string;
  name: string;
  domain: string;
  materialGroup: string;
}

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set(),
  );

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDomain, setNewCatDomain] = useState("RAN");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Record<number, string>>({});

  async function saveThreshold(categoryId: number, value: string) {
    const threshold = value.trim() === "" ? null : parseInt(value);
    try {
      await apiFetch(`${API_BASE}/Categories/${categoryId}/threshold`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumStockThreshold: threshold }),
      });
    } catch {}
  }

  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    retry: loadCategories,
  } = useFetchState<Category[]>(
    (signal) =>
      apiFetch(`${API_BASE}/Categories`, { signal }).then((res) => res.json()),
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250); // debounce recherche
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    retry: loadProducts,
  } = useFetchState<Product[]>(
    (signal) => {
      const url = debouncedSearch.trim()
        ? `${API_BASE}/HardwareProducts?search=${encodeURIComponent(debouncedSearch)}`
        : `${API_BASE}/HardwareProducts`;
      return apiFetch(url, { signal }).then((res) => res.json());
    },
    [debouncedSearch],
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleProduct(id: number) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/Categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, domain: newCatDomain }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewCatName("");
      setShowNewCategory(false);
      loadCategories();
      showToast("Catégorie créée");
    } catch (err: any) {
      setError(err.message || "Échec de la création.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAssign() {
    if (!selectedCategory || selectedProductIds.size === 0) return;
    try {
      const res = await apiFetch(`${API_BASE}/HardwareProducts/bulk-category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds),
          domain: selectedCategory.domain,
          materialGroup: selectedCategory.name,
        }),
      });
      if (!res.ok) throw new Error();
      setSelectedProductIds(new Set());
      loadProducts();
      loadCategories();
      showToast(
        `${selectedProductIds.size} référence(s) assignée(s) à "${selectedCategory.name}"`,
      );
    } catch {
      showToast("Échec de l'assignation");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-black">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[86vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-[#0F172A]">
            Gestion des catégories
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Colonne catégories */}
          <div className="w-64 border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <button
                onClick={() => setShowNewCategory((v) => !v)}
                className="w-full text-xs font-semibold text-[#124191] hover:underline text-left"
              >
                + Nouvelle catégorie
              </button>
              {showNewCategory && (
                <div className="mt-2 space-y-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nom de la catégorie"
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs"
                  />

                  <select
                    value={newCatDomain}
                    onChange={(e) => setNewCatDomain(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    onClick={handleCreateCategory}
                    disabled={creating}
                    className="w-full text-xs font-semibold text-white bg-[#124191] rounded-md py-1.5 disabled:opacity-60"
                  >
                    {creating ? "Création…" : "Créer"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {categoriesError ? (
                <ErrorState message={categoriesError} onRetry={loadCategories} />
              ) : categoriesLoading || !categories ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 bg-slate-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-slate-400 p-3">
                  Aucune catégorie créée.
                </p>
              ) : (
                categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c)}
                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-slate-50 hover:bg-[#EAF1FC] transition-colors ${
                      selectedCategory?.id === c.id ? "bg-[#EAF1FC]" : ""
                    }`}
                  >
                    <div className="font-semibold text-[#0F172A]">{c.name}</div>
                    <input
                      type="number"
                      min={0}
                      placeholder="Seuil"
                      defaultValue={c.minimumStockThreshold ?? ""}
                      onBlur={(e) => saveThreshold(c.id, e.target.value)}
                      className="w-20 border border-slate-200 rounded-md px-2 py-1 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#124191]"
                      title="Seuil d'alerte stock bas"
                    />
                    <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                      <span>{c.domain}</span>
                      <span>{c.productCount} réf.</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Colonne produits */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un code ou une description…"
                className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-sm"
              />
              <button
                onClick={handleAssign}
                disabled={!selectedCategory || selectedProductIds.size === 0}
                className="text-xs font-semibold text-white bg-[#124191] rounded-md px-3 py-1.5 disabled:opacity-40 whitespace-nowrap"
              >
                Assigner à "{selectedCategory?.name ?? "…"}" (
                {selectedProductIds.size})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {productsError ? (
                <ErrorState message={productsError} onRetry={loadProducts} />
              ) : productsLoading || !products ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 bg-slate-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <p className="text-xs text-slate-400 p-3">
                  Aucune référence trouvée.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`border-b border-slate-50 cursor-pointer hover:bg-[#EAF1FC] ${
                          selectedProductIds.has(p.id) ? "bg-[#EAF1FC]" : ""
                        }`}
                      >
                        <td className="px-3 py-2 w-8">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.has(p.id)}
                            readOnly
                          />
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-[#124191]">
                          {p.partNumber}
                        </td>
                        <td className="px-2 py-2">{p.name}</td>
                        <td className="px-2 py-2 text-xs text-slate-400">
                          {p.materialGroup}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {toast && (
          <div className="px-6 py-2 bg-emerald-50 text-emerald-800 text-xs font-semibold border-t border-emerald-100">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
