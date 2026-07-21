import React from 'react';
import { useProject } from './project';
import LoansPanel from './loanPanel';

export default function LoansPage() {
  const { selectedProjectId, selectedProject } = useProject();

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[#0F172A]">Prêts & Emprunts</h1>
        {selectedProject && (
          <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2 py-0.5 rounded-full font-semibold">
            {selectedProject.code} — {selectedProject.name}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">Matériel prêté à des clients ou emprunté hors circuit SMR</p>

      {selectedProjectId == null ? (
        <p className="text-sm text-slate-400">Chargement du projet…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <LoansPanel projectId={selectedProjectId} />
        </div>
      )}
    </div>
  );
}