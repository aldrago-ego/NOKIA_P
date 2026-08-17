import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from './project';
import SmrDetailPanel from './SmrDetailPanel';

export default function SmrPage() {
  const { t } = useTranslation();
  const { selectedProjectId, selectedProject } = useProject();

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[#0F172A]">{t('smrPage.title')}</h1>
        {selectedProject && (
          <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2 py-0.5 rounded-full font-semibold">
            {selectedProject.code} — {selectedProject.name}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">
        {t('smrPage.subtitle')}
      </p>

      {selectedProjectId == null ? (
        <p className="text-sm text-black">{t('common.loadingProject')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SmrDetailPanel projectId={selectedProjectId} />
        </div>
      )}
    </div>
  );
}