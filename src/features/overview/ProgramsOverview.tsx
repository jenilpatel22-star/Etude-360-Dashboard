import { CalendarClock, CheckCircle2, LayoutGrid, Lightbulb, PlayCircle, Plus, PoundSterling, Users, CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { Tabs } from '@/components/ui/Tabs';
import { useRole } from '@/context/RoleContext';
import { useData, useLookups } from '@/data/DataProvider';
import { ProgramForm } from '@/features/forms/ProgramForm';
import { budgetSummary } from '@/lib/analytics';
import { parseDate, today } from '@/lib/dates';
import { cx, formatCompactCurrency, formatCurrency, formatNumber, formatPct } from '@/lib/format';
import type { Program, ProgramStatus } from '@/types';
import { CalendarView } from './CalendarView';
import { FilterBar } from './FilterBar';
import { applyFilters, EMPTY_FILTERS, type ProgramFilters } from './filters';
import { ProgramCard } from './ProgramCard';

type BoardStatus = Exclude<ProgramStatus, 'Completed'> | 'Completed';
const COLUMNS: { status: BoardStatus; hint: string }[] = [
  { status: 'Upcoming', hint: 'Confirmed and scheduled' },
  { status: 'Ongoing', hint: 'In delivery now' },
  { status: 'Potential', hint: 'Pipeline — not yet confirmed' },
];

const sortFor = (status: BoardStatus) => (a: Program, b: Program) =>
  status === 'Completed' ? b.endDate.localeCompare(a.endDate) : a.startDate.localeCompare(b.startDate);

export function ProgramsOverview() {
  const { data } = useData();
  const { staffName } = useLookups();
  const { can } = useRole();
  const [filters, setFilters] = useState<ProgramFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<'board' | 'calendar'>('board');
  const [mobileCol, setMobileCol] = useState<BoardStatus>('Ongoing');
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => applyFilters(data.programs, filters, staffName), [data.programs, filters, staffName]);

  const kpis = useMemo(() => {
    const year = today().getFullYear();
    const by = (s: ProgramStatus) => filtered.filter((p) => p.status === s);
    const active = filtered.filter((p) => p.status !== 'Potential');
    const budget = budgetSummary(active, data.logistics);
    const activeIds = new Set(active.map((p) => p.id));
    const uniqueParticipants = data.participants.filter((pt) => pt.programIds.some((id) => activeIds.has(id))).length;
    return {
      upcoming: by('Upcoming'),
      ongoing: by('Ongoing'),
      potential: by('Potential'),
      completedThisYear: by('Completed').filter((p) => parseDate(p.endDate).getFullYear() === year),
      enrolments: active.reduce((s, p) => s + p.enrolled, 0),
      uniqueParticipants,
      budget,
    };
  }, [filtered, data.logistics, data.participants]);

  const columns = showCompleted ? [...COLUMNS, { status: 'Completed' as const, hint: 'Delivered' }] : COLUMNS;
  const programsFor = (s: BoardStatus) => filtered.filter((p) => p.status === s).sort(sortFor(s));
  const budgetRatio = kpis.budget.allocated ? kpis.budget.used / kpis.budget.allocated : 0;

  return (
    <>
      <PageHeader
        title="Programmes overview"
        subtitle="Portfolio of upcoming, live and pipeline training programmes"
        actions={
          <>
            <Tabs
              label="View"
              value={view}
              onChange={setView}
              tabs={[
                { id: 'board', label: 'Board' },
                { id: 'calendar', label: 'Calendar' },
              ]}
            />
            {can.editPrograms && (
              <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" aria-hidden /> New programme
              </button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Upcoming" value={kpis.upcoming.length} icon={CalendarClock} hint={`${formatNumber(kpis.upcoming.reduce((s, p) => s + p.enrolled, 0))} enrolled`} />
        <KpiCard label="Ongoing" value={kpis.ongoing.length} icon={PlayCircle} hint={`${formatNumber(kpis.ongoing.reduce((s, p) => s + p.enrolled, 0))} learners in delivery`} />
        <KpiCard label="Potential (pipeline)" value={kpis.potential.length} icon={Lightbulb} hint={`${formatCompactCurrency(kpis.potential.reduce((s, p) => s + p.budget, 0))} pipeline value`} />
        <KpiCard label={`Completed in ${today().getFullYear()}`} value={kpis.completedThisYear.length} icon={CheckCircle2} hint={`${formatNumber(kpis.completedThisYear.reduce((s, p) => s + p.enrolled, 0))} learners trained`} />
        <KpiCard label="Total participants" value={formatNumber(kpis.enrolments)} icon={Users} hint={`${formatNumber(kpis.uniqueParticipants)} unique people`} />
        <KpiCard
          label="Budget used vs allocated"
          value={formatPct(budgetRatio)}
          icon={PoundSterling}
          progress={budgetRatio}
          progressLabel="Budget used"
          tone={budgetRatio > 1 ? 'critical' : budgetRatio > 0.9 ? 'warning' : 'default'}
          hint={
            <span className="tabular-nums">
              {formatCompactCurrency(kpis.budget.used)} of {formatCompactCurrency(kpis.budget.allocated)}
            </span>
          }
        />
      </div>

      <FilterBar value={filters} onChange={setFilters} />

      {view === 'calendar' ? (
        <CalendarView programs={filtered} />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Tabs
              className="lg:hidden"
              label="Programme status"
              value={mobileCol}
              onChange={setMobileCol}
              tabs={columns.map((c) => ({ id: c.status, label: c.status, count: programsFor(c.status).length }))}
            />
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-brand-600" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
              Show completed
            </label>
          </div>
          <div className={cx('grid gap-4', showCompleted ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {columns.map(({ status, hint }) => {
              const list = programsFor(status);
              return (
                <section key={status} aria-labelledby={`col-${status}`} className={cx('min-w-0', mobileCol !== status && 'hidden lg:block')}>
                  <header className="mb-3 hidden items-baseline justify-between lg:flex">
                    <h2 id={`col-${status}`} className="text-sm font-semibold">
                      {status} <span className="ml-1 rounded-full bg-stone-200 px-1.5 text-xs tabular-nums dark:bg-stone-800">{list.length}</span>
                    </h2>
                    <span className="text-xs muted">{hint}</span>
                  </header>
                  <div className="space-y-3">
                    {list.map((p) => (
                      <ProgramCard key={p.id} program={p} />
                    ))}
                    {!list.length && (
                      <div className="card">
                        <EmptyState title={`No ${status.toLowerCase()} programmes`} icon={status === 'Potential' ? Lightbulb : CalendarDays}>
                          Try clearing filters.
                        </EmptyState>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="card mt-4">
              <EmptyState title="No programmes match your filters" icon={LayoutGrid} />
            </div>
          )}
          <p className="mt-4 text-xs muted">
            Allocated budget across confirmed programmes: <span className="tabular-nums">{formatCurrency(kpis.budget.allocated)}</span> · committed
            (planned logistics): <span className="tabular-nums">{formatCurrency(kpis.budget.committed)}</span>
          </p>
        </>
      )}
      {creating && <ProgramForm onClose={() => setCreating(false)} />}
    </>
  );
}
