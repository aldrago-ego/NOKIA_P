import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { apiFetch } from '../apiFetch';
import { API_BASE } from '../config';
import { useFetchState, checkAccess } from '../useFetchState';
import { useAuth } from './authContext';
import ErrorState from '../Component/ErrorState';
import LoadingButton from '../Component/LoadingButton';

interface AppUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

const ROLES = ['SuperAdmin', 'Admin', 'Supervisor', 'Viewer'];

function roleBadgeClass(role: string) {
  switch (role) {
    case 'SuperAdmin': return 'bg-[#124191] text-white';
    case 'Admin': return 'bg-[#EAF1FC] text-[#124191]';
    case 'Supervisor': return 'bg-amber-50 text-amber-700';
    default: return 'bg-slate-100 text-slate-500';
  }
}

// Console réservée au SuperAdmin — gestion de TOUS les comptes (SuperAdmin, Admin,
// Supervisor, Viewer). Un Admin normal, même en tapant l'URL directement, est redirigé :
// le garde-fou ici est une défense en profondeur, la vraie barrière est côté backend
// ([Authorize(Roles = "SuperAdmin")]).
export default function SuperAdminPanel() {
  const { t } = useTranslation();
  const { isSuperAdmin, userName } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Admin');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState('Admin');
  const [editPassword, setEditPassword] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: users,
    loading,
    error,
    retry,
  } = useFetchState<AppUser[]>(
    (signal) =>
      apiFetch(`${API_BASE}/AdminManagement/users`, { signal })
        .then(checkAccess)
        .then((r) => r.json()),
    [],
  );

  React.useEffect(() => {
    if (!isSuperAdmin) navigate('/', { replace: true });
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFormError(t('superAdmin.usernamePasswordRequired'));
      return;
    }
    if (password.length < 8) {
      setFormError(t('superAdmin.passwordTooShort'));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch(`${API_BASE}/AdminManagement/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, role }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsername('');
      setPassword('');
      setDisplayName('');
      setRole('Admin');
      setShowForm(false);
      retry();
    } catch (err: any) {
      setFormError(err.message || t('superAdmin.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(u: AppUser) {
    setEditingId(u.id);
    setEditDisplayName(u.displayName);
    setEditRole(u.role);
    setEditPassword('');
    setEditError(null);
  }

  async function handleSaveEdit(u: AppUser) {
    setEditSubmitting(true);
    setEditError(null);
    try {
      const body: Record<string, string> = { displayName: editDisplayName };
      if (editRole !== u.role) body.role = editRole;
      if (editPassword.trim()) body.newPassword = editPassword;

      const res = await apiFetch(`${API_BASE}/AdminManagement/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      retry();
    } catch (err: any) {
      setEditError(err.message || t('superAdmin.updateFailed'));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(u: AppUser) {
    if (!window.confirm(t('superAdmin.confirmDelete', { name: u.displayName || u.username }))) return;
    setDeletingId(u.id);
    try {
      const res = await apiFetch(`${API_BASE}/AdminManagement/users/${u.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      retry();
    } catch (err: any) {
      window.alert(err.message || t('superAdmin.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-full bg-white text-[#0F172A]">
      {/* Bandeau distinctif blanc / bleu Nokia — signale clairement qu'on est dans une
          zone à privilèges élevés, différente du reste de l'app. */}
      <div className="bg-[#124191] text-white px-6 md:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200/80 text-xs font-semibold uppercase tracking-wide mb-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            {t('superAdmin.badge')}
          </div>
          <h1 className="text-2xl font-bold">{t('superAdmin.title')}</h1>
          <p className="text-sm text-blue-100/90 mt-1">{t('superAdmin.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#0F172A]">{t('superAdmin.usersList')}</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] transition-colors"
          >
            {showForm ? t('common.cancel') : t('superAdmin.addUser')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-[#EAF1FC] border border-[#c9dcf5] rounded-xl p-5 mb-6 animate-[slideDown_.2s_ease]">
            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.username')}</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('superAdmin.usernamePlaceholder')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.displayName')}</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('superAdmin.displayNamePlaceholder')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('superAdmin.passwordPlaceholder')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.role')}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <LoadingButton
                type="submit"
                loading={submitting}
                loadingText={t('superAdmin.creating')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60"
              >
                {t('superAdmin.createUser')}
              </LoadingButton>
            </div>
          </form>
        )}

        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : loading || !users ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">{t('superAdmin.noUsers')}</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-white bg-[#124191]">
                  <th className="text-left font-semibold px-4 py-2.5">{t('superAdmin.username')}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{t('superAdmin.displayName')}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{t('superAdmin.role')}</th>
                  <th className="text-right font-semibold px-4 py-2.5">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.username === userName;
                  const isEditing = editingId === u.id;
                  return (
                    <React.Fragment key={u.id}>
                      <tr className="border-b border-slate-100 last:border-0 hover:bg-[#EAF1FC] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[#124191]">
                          {u.username}{isSelf && <span className="ml-1.5 text-[10px] text-slate-400">({t('superAdmin.you')})</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{u.displayName}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass(u.role)}`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => (isEditing ? setEditingId(null) : startEdit(u))}
                              className="text-xs font-semibold text-[#124191] hover:underline"
                            >
                              {isEditing ? t('common.cancel') : t('superAdmin.edit')}
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleDelete(u)}
                                disabled={deletingId === u.id}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                              >
                                {deletingId === u.id ? t('common.loading') : t('superAdmin.deleteUser')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr className="border-b border-slate-100 bg-[#F4F6FA]">
                          <td colSpan={4} className="px-4 py-4">
                            {editError && (
                              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{editError}</div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.displayName')}</label>
                                <input
                                  value={editDisplayName}
                                  onChange={(e) => setEditDisplayName(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.role')}</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value)}
                                  disabled={isSelf}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50"
                                >
                                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                {isSelf && <p className="text-[10px] text-slate-400 mt-1">{t('superAdmin.cannotChangeOwnRole')}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('superAdmin.newPasswordOptional')}</label>
                                <input
                                  type="password"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder={t('superAdmin.passwordPlaceholder')}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <LoadingButton
                                loading={editSubmitting}
                                loadingText={t('common.loading')}
                                onClick={() => handleSaveEdit(u)}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#124191] rounded-lg hover:bg-[#0d3373] disabled:opacity-60"
                              >
                                {t('common.save')}
                              </LoadingButton>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
