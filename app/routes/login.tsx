import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./authContext";
import LoadingButton from "../Component/LoadingButton";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewerSubmitting, setViewerSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(true);
      return;
    }
    setSubmitting(true);
    try {
      setError(false);
      await login(username.trim(), password);
      navigate("/");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewerAccess() {
    setViewerSubmitting(true);
    try {
      setError(false);
      await login("viewer", "ChangeMoi123!");
      navigate("/");
    } catch {
      setError(true);
    } finally {
      setViewerSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: "url('/nokiaFond.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />

      <div className="min-h-screen w-full relative z-10 px-6 md:px-12 md:grid md:grid-cols-3 md:items-center flex flex-col justify-center gap-8">

  {/* 2. COLONNE GAUCHE : Texte de marque */}
  <div className="hidden md:block max-w-sm justify-self-start animate-[fadeIn_.6s_ease]">
    <span className="text-4xl font-black tracking-[0.15em] text-white">
      NOKIA
    </span>
    <p className="text-blue-200 text-sm mt-2 mb-4">
      Nexa App — Gestion de stock
    </p>
    <div className="w-16 h-0.5 bg-blue-400 mb-4" />
    <p className="text-blue-100/80 text-sm leading-relaxed">
      Gérez efficacement vos stocks, suivez vos inventaires et optimisez
      vos opérations au quotidien.
    </p>
  </div>

  {/* 3. COLONNE CENTRE : Carte de connexion (Centrée au milieu grâce à justify-self-center) */}
  <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-2xl animate-[slideUp_.4s_ease] 
                  w-full max-w-md md:justify-self-center">
          <div className="mb-6 text-center">
            <span className="text-3xl font-black tracking-[0.15em] text-[#124191]">
              NOKIA
            </span>
            <p className="text-xs text-slate-400 mt-1.5">
              Nexa App — Gestion de stock
            </p>
            <div className="w-10 h-0.5 bg-[#124191] mx-auto mt-3" />
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 transition-all">
                Identifiants invalides ou manquants.
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Identifiant
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21a8 8 0 10-16 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191] transition-all"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.4 9.4 0 0112 5c5.5 0 9 5 9 7-.3.6-1 1.6-2 2.6M6.3 6.6C4.4 8 3.2 10 3 12c1 2 4.5 7 9 7 1.3 0 2.5-.3 3.6-.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <LoadingButton
              loading={submitting}
              loadingText="Connexion en cours…"
              type="submit"
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] hover:shadow-lg transition-all duration-200"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Se connecter
              </span>
            </LoadingButton>

            <LoadingButton
              loading={viewerSubmitting}
              loadingText="Chargement…"
              type="button"
              onClick={handleViewerAccess}
              className="w-full py-2.5 text-sm font-medium text-[#124191] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-[#124191]/40 transition-all duration-200 mt-2"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Continuer en mode Visiteur
              </span>
            </LoadingButton>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-300 uppercase tracking-wide">ou</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Le rôle associé à votre compte déterminera automatiquement vos
            droits d'accès.
          </p>
        </div>
        <div className="hidden md:block" />

</div>
      </div>
  );
}