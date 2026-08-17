import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

export const LANG_STORAGE_KEY = "nexa_lang";
export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Langue fixe au démarrage (serveur ET client) — volontairement pas de détection
// automatique du navigateur ici : ça éviterait un mismatch d'hydratation SSR (le HTML
// rendu serveur ne connaît jamais la langue du navigateur du visiteur). La préférence
// réellement choisie par l'utilisateur est resynchronisée après le montage, côté client
// uniquement, par `useSyncStoredLanguage` — voir root.tsx.
i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(lang: SupportedLanguage) {
  i18n.changeLanguage(lang);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  }
}

export default i18n;
