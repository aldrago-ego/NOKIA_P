import { useCallback, useEffect, useRef, useState } from "react";
import i18n from "./i18n";

const TIMEOUT_MS = 15000;

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

// À lancer depuis fetchFn quand une réponse 403 (droit insuffisant, utilisateur bien
// authentifié) est détectée — voir `checkAccess` ci-dessous. useFetchState affiche alors
// un message "accès restreint" au lieu du message générique de panne réseau : un visiteur
// sans les droits ne doit pas croire que sa connexion est en cause.
// Le message par défaut est résolu au moment du throw (pas figé au chargement du module),
// pour rester dans la langue choisie par l'utilisateur au moment de l'erreur.
export class ForbiddenError extends Error {
  constructor(message?: string) {
    super(message ?? i18n.t("common.errorForbidden"));
    this.name = "ForbiddenError";
  }
}

// Petit utilitaire pour les fetchFn : `apiFetch(url, { signal }).then(checkAccess).then(r => r.json())`.
// Convertit un 403 en ForbiddenError (message clair, pas de retry inutile) ; laisse
// passer les autres statuts tels quels (déjà gérés au cas par cas par chaque appelant).
export function checkAccess(res: Response): Response {
  if (res.status === 403) throw new ForbiddenError();
  return res;
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
      .catch((err) => {
        if (controller.signal.aborted) {
          // Annulée soit par timeout, soit par un changement de deps/démontage
          if (timedOut) {
            setError(i18n.t("common.errorTimeout"));
            setLoading(false);
          }
          return;
        }
        // ForbiddenError est explicitement authored (voir checkAccess ci-dessus) — son
        // message est sûr à afficher tel quel. Tout le reste reste générique volontairement,
        // pour ne pas fuiter de détails techniques (stack trace, message d'exception brut).
        setError(
          err instanceof ForbiddenError ? err.message : i18n.t("common.errorGeneric"),
        );
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
