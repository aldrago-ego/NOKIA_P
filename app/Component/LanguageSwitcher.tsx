import React from "react";
import { useTranslation } from "react-i18next";
import { setLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const FLAG: Record<SupportedLanguage, string> = { fr: "🇫🇷", en: "🇬🇧" };

// Petit sélecteur FR/EN réutilisable — dans la sidebar (utilisateur connecté) et sur
// l'écran de connexion (avant authentification, pour les anglophones dès l'arrivée).
export default function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split("-")[0] ?? "fr") as SupportedLanguage;

  const wrapClass =
    variant === "dark"
      ? "bg-white/5 border border-white/10"
      : "bg-slate-100 border border-slate-200";

  return (
    <div
      className={`inline-flex items-center rounded-lg p-0.5 ${wrapClass}`}
      role="group"
      aria-label={t("language.label")}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = lang === current;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            title={t(`language.${lang}`)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
              active
                ? variant === "dark"
                  ? "bg-white/15 text-white"
                  : "bg-white text-[#124191] shadow-sm"
                : variant === "dark"
                  ? "text-blue-200/70 hover:text-white"
                  : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span aria-hidden="true">{FLAG[lang]}</span>
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
