import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./authContext";
import LoadingButton from "../Component/LoadingButton";




export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    try {
      await login("viewer", "ChangeMoi123!");
      navigate("/");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0D14] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <span className="text-2xl font-black tracking-[0.15em] text-[#124191]">
            NOKIA
          </span>
          <p className="text-xs text-slate-400 mt-1">
            Nexa App — Gestion de stock
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              Identifiants invalides ou manquants.
            </div>
          )}

          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Identifiant
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#124191]/30 focus:border-[#124191]"
            />
          </div>

          <LoadingButton
            loading={submitting}
            loadingText="Connexion en cours…"
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors"
          >
            Se connecter
          </LoadingButton>
          <LoadingButton
            loading={false}
            loadingText="Chargement…"
            type="button"
            onClick={handleViewerAccess}
            className="w-full py-2.5 text-sm font-semibold text-[#124191] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors mt-2"
          >
            Continuer en mode Visiteur
          </LoadingButton>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-4">
          Le rôle associé à votre compte déterminera automatiquement vos droits
          d'accès.
        </p>
      </div>
    </div>
  );
}
