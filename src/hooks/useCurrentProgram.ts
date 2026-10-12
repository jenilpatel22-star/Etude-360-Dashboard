import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '@/data/DataProvider';

const KEY = 'etude.currentProgram';

/** The program the per-program modules should open: URL param → last viewed → first ongoing. */
export function useCurrentProgramId(): string {
  const { programId } = useParams();
  const { data } = useData();
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  const exists = (id: string | null | undefined) => !!id && data.programs.some((p) => p.id === id);
  if (exists(programId)) return programId!;
  if (exists(stored)) return stored!;
  return (data.programs.find((p) => p.status === 'Ongoing') ?? data.programs[0])?.id ?? 'none';
}

export function useRememberProgram(id: string | undefined) {
  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }, [id]);
}
