import type { DeliveryMode, Program, ProgramCategory } from '@/types';

export interface ProgramFilters {
  search: string;
  category: ProgramCategory | '';
  mode: DeliveryMode | '';
  trainerId: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: ProgramFilters = { search: '', category: '', mode: '', trainerId: '', from: '', to: '' };

export function applyFilters(programs: Program[], f: ProgramFilters, trainerName: (id: string) => string): Program[] {
  const q = f.search.trim().toLowerCase();
  return programs.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.mode && p.mode !== f.mode) return false;
    if (f.trainerId && !p.trainerIds.includes(f.trainerId)) return false;
    // date range: keep programs that overlap the window
    if (f.from && p.endDate < f.from) return false;
    if (f.to && p.startDate > f.to) return false;
    if (q) {
      const hay = [p.title, p.code, p.category, p.venue, ...p.trainerIds.map(trainerName)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const activeFilterCount = (f: ProgramFilters) =>
  [f.category, f.mode, f.trainerId, f.from, f.to, f.search.trim()].filter(Boolean).length;
