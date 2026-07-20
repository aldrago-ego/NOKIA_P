import React from 'react';
import { useProject } from './project';
import RmaDetailPanel from './RmaDetailPanel';

export default function RmaPage() {
  const { selectedProjectId, selectedProject } = useProject();

  return (
    <div className="p-6 bg-[#F4F6FA] min-h-full text-black">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[#0F172A]">Faulty HW RMA</h1>
        {selectedProject && (
          <span className="font-mono text-xs bg-[#EAF1FC] text-[#124191] px-2 py-0.5 rounded-full font-semibold">
            {selectedProject.code} — {selectedProject.name}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">Retour du matériel défectueux vers Nokia</p>

      {selectedProjectId == null ? (
        <p className="text-sm text-slate-400">Chargement du projet…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <RmaDetailPanel projectId={selectedProjectId} />
        </div>
      )}
    </div>
  );
}