import { useCallback, useEffect, useRef, useState } from "react";

const TIMEOUT_MS = 15000;
const TIMEOUT_MESSAGE =
  "La requête a pris trop de temps. Vérifiez votre connexion et réessayez.";
const GENERIC_ERROR_MESSAGE = "Impossible de charger les données. Veuillez réessayer.";

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

// Hook générique pour les fetch automatiques au montage/deps (dashboards, listes,
// dropdowns...). Gère un timeout de 15s (AbortController), annule proprement la
// requête précédente si les deps changent, et distingue loading/error/success.
//
// fetchFn reçoit le signal à passer à apiFetch (`apiFetch(url, { signal })`), pour que
// le timeout annule réellement la requête réseau plutôt que de la laisser tourner.
export function useFetchState<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Toujours la dernière version de fetchFn, sans en faire une dépendance de l'effet
  // (sinon une fonction recréée à chaque render relancerait le fetch en boucle).
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;

    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    fetchFnRef
      .current(controller.signal)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          // Annulée soit par timeout, soit par un changement de deps/démontage
          if (timedOut) {
            setError(TIMEOUT_MESSAGE);
            setLoading(false);
          }
          return;
        }
        // Message générique volontairement — pas de fuite de détails techniques
        // (stack trace, message d'exception brut) à l'utilisateur.
        setError(GENERIC_ERROR_MESSAGE);
        setLoading(false);
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  return { data, loading, error, retry };
}
