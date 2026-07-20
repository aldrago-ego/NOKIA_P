import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../apiFetch';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://nokia-p-1.onrender.com/api';

export interface Project {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  hasFullTraceability: boolean;
}

interface ProjectContextValue {
  projects: Project[] | null;
  selectedProject: Project | null;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number) => void;
  addProject: (p: Project) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${API_BASE}/Projects`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: Project[]) => {
        setProjects(data);
        const current = data.find((p) => p.isCurrent) ?? data[0];
        if (current) setSelectedProjectId(current.id);
      })
      .catch((err) => err.name !== 'AbortError' && setProjects([]));
    return () => controller.abort();
  }, []);

  const addProject = useCallback((p: Project) => {
    setProjects((prev) => {
      const others = (prev ?? []).map((x) => ({ ...x, isCurrent: false }));
      return [p, ...others];
    });
    setSelectedProjectId(p.id);
  }, []);

  const selectedProject = projects?.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <ProjectContext.Provider
      value={{ projects, selectedProject, selectedProjectId, setSelectedProjectId, addProject }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}

function apifetch(arg0: string, arg1: { signal: AbortSignal; }) {
  throw new Error('Function not implemented.');
}
