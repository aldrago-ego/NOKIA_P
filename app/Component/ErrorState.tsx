import React from "react";

// État d'erreur réutilisable pour les fetch automatiques au montage (dashboards,
// listes, dropdowns...). À utiliser avec useFetchState : { error, retry }.
export default function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <svg
        className="w-8 h-8 text-red-500 mb-2"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M10.29 3.86l-8.18 14.14A2 2 0 004.18 21h15.64a2 2 0 001.87-3.14L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4m0 4h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm text-red-600 mb-3">
        {message || "Impossible de charger les données."}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 bg-white border border-slate-200 text-sm font-semibold text-[#0F172A] rounded-lg px-4 py-2 hover:border-[#124191] hover:shadow-sm transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Réessayer
      </button>
    </div>
  );
}
