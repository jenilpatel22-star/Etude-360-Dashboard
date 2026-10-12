import { Search, X } from 'lucide-react';
import { useLookups } from '@/data/DataProvider';
import { capitalise } from '@/lib/format';
import { DELIVERY_MODES, PROGRAM_CATEGORIES } from '@/types';
import { activeFilterCount, EMPTY_FILTERS, type ProgramFilters } from './filters';

export function FilterBar({ value, onChange }: { value: ProgramFilters; onChange: (f: ProgramFilters) => void }) {
  const { trainers } = useLookups();
  const set = <K extends keyof ProgramFilters>(k: K, v: ProgramFilters[K]) => onChange({ ...value, [k]: v });
  const count = activeFilterCount(value);
  return (
    <div className="card mb-6 grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-[minmax(14rem,1.6fr)_repeat(5,minmax(0,1fr))_auto]" role="search">
      <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" aria-hidden />
        <input
          type="search"
          className="input pl-8"
          placeholder="Search programmes, venues, trainers…"
          aria-label="Search programmes"
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>
      <select className="input" aria-label="Filter by category" value={value.category} onChange={(e) => set('category', e.target.value as ProgramFilters['category'])}>
        <option value="">All categories</option>
        {PROGRAM_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select className="input" aria-label="Filter by delivery mode" value={value.mode} onChange={(e) => set('mode', e.target.value as ProgramFilters['mode'])}>
        <option value="">All modes</option>
        {DELIVERY_MODES.map((m) => (
          <option key={m} value={m}>
            {capitalise(m)}
          </option>
        ))}
      </select>
      <select className="input" aria-label="Filter by trainer" value={value.trainerId} onChange={(e) => set('trainerId', e.target.value)}>
        <option value="">All trainers</option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input type="date" className="input" aria-label="From date" value={value.from} onChange={(e) => set('from', e.target.value)} />
      <input type="date" className="input" aria-label="To date" value={value.to} onChange={(e) => set('to', e.target.value)} />
      <button type="button" className="btn-ghost whitespace-nowrap" disabled={!count} onClick={() => onChange(EMPTY_FILTERS)}>
        <X className="h-4 w-4" aria-hidden />
        Clear{count ? ` (${count})` : ''}
      </button>
    </div>
  );
}
