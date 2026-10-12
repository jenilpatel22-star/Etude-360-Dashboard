import { AlertTriangle, CheckCircle2, Diamond, Flag, ListChecks, Pencil, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useRole } from '@/context/RoleContext';
import { useData, useLookups } from '@/data/DataProvider';
import { PhaseForm } from '@/features/forms/PhaseForm';
import { useProgram } from '@/features/program/ProgramLayout';
import { expectedProgress, phaseHealth, type PhaseHealth } from '@/lib/analytics';
import { addDays, diffDays, formatDate, formatShort, formatTime, formatWeekday, parseDate, startOfMonth, toISODate, today } from '@/lib/dates';
import { capitalise, cx } from '@/lib/format';
import { PHASES, type Activity, type TimelinePhase } from '@/types';

const HEALTH_LABEL: Record<PhaseHealth, string> = {
  complete: 'Complete',
  'on-track': 'On track',
  delayed: 'Delayed',
  'not-started': 'Not started',
};

const BAR_FILL: Record<PhaseHealth, string> = {
  complete: 'bg-stone-400 dark:bg-stone-500',
  'on-track': 'bg-brand-500',
  delayed: 'bg-[#d03b3b]',
  'not-started': 'bg-brand-500',
};
const BAR_TRACK: Record<PhaseHealth, string> = {
  complete: 'bg-stone-200 dark:bg-stone-700',
  'on-track': 'bg-brand-100 dark:bg-brand-900/60',
  delayed: 'bg-red-100 ring-1 ring-inset ring-red-300 dark:bg-red-950/60 dark:ring-red-800',
  'not-started': 'bg-stone-100 ring-1 ring-inset ring-stone-200 dark:bg-stone-800 dark:ring-stone-700',
};

const TYPE_DOT: Record<Activity['type'], string> = {
  session: 'bg-brand-500',
  workshop: 'bg-[#eb6834]',
  assessment: 'bg-[#6250d6]',
  'field visit': 'bg-[#1baf7a]',
  networking: 'bg-[#e87ba4]',
};

function Gantt({ phases, onEdit }: { phases: TimelinePhase[]; onEdit?: (p: TimelinePhase) => void }) {
  const now = today();
  const minStart = addDays(parseDate(phases[0].startDate), -5);
  const maxEnd = addDays(parseDate(phases[phases.length - 1].endDate), Math.max(10, Math.round(diffDays(parseDate(phases[phases.length - 1].endDate), parseDate(phases[0].startDate)) * 0.06)));
  const span = Math.max(1, diffDays(maxEnd, minStart));
  const pos = (d: Date) => `${(diffDays(d, minStart) / span) * 100}%`;

  const months: Date[] = [];
  for (let m = startOfMonth(minStart); m <= maxEnd; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    if (m >= minStart) months.push(m);
  }
  const todayVisible = now >= minStart && now <= maxEnd;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* axis */}
        <div className="grid grid-cols-[13rem_1fr] border-b border-stone-200 dark:border-stone-800">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide muted">Phase</div>
          <div className="relative h-8">
            {months.map((m) => (
              <div key={m.toISOString()} className="absolute top-0 h-full border-l border-stone-200 pl-1 pt-2 text-xs muted dark:border-stone-800" style={{ left: pos(m) }}>
                {new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(m)}
              </div>
            ))}
          </div>
        </div>
        {/* rows */}
        <div className="relative">
          {phases.map((p) => {
            const health = phaseHealth(p, now);
            const s = parseDate(p.startDate);
            const e = addDays(parseDate(p.endDate), 1);
            const expected = expectedProgress(p, now);
            return (
              <div key={p.id} className="grid grid-cols-[13rem_1fr] items-center border-b border-stone-100 last:border-0 dark:border-stone-800/60">
                <div className="flex items-center gap-2 px-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className={cx('truncate text-sm font-medium', health === 'delayed' && 'text-red-700 dark:text-red-400')}>{p.phase}</div>
                    <div className="text-xs muted tabular-nums">
                      {p.percentComplete}% · {formatShort(p.startDate)}–{formatShort(p.endDate)}
                    </div>
                  </div>
                  {onEdit && (
                    <button type="button" className="btn-ghost p-1" onClick={() => onEdit(p)} aria-label={`Update ${p.phase}`} data-export-ignore>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="relative h-12">
                  {months.map((m) => (
                    <div key={m.toISOString()} className="absolute inset-y-0 border-l border-stone-100 dark:border-stone-800/60" style={{ left: pos(m) }} aria-hidden />
                  ))}
                  <div
                    className={cx('absolute top-3 h-6 overflow-hidden rounded-md', BAR_TRACK[health])}
                    style={{ left: pos(s), width: `calc(${pos(e)} - ${pos(s)})` }}
                    title={`${p.phase}: ${p.percentComplete}% complete (expected ${Math.round(expected)}%) — ${HEALTH_LABEL[health]}`}
                  >
                    <div className={cx('h-full', BAR_FILL[health])} style={{ width: `${p.percentComplete}%` }} />
                  </div>
                  <span
                    className={cx('absolute top-3 flex h-6 items-center whitespace-nowrap pl-4 text-[11px] font-semibold tabular-nums', health === 'delayed' ? 'text-red-700 dark:text-red-400' : 'text-stone-600 dark:text-stone-300')}
                    style={{ left: pos(e) }}
                  >
                    {health === 'delayed' && <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />}
                    {p.percentComplete}%
                  </span>
                  {p.milestone && (
                    <div
                      className="absolute top-[0.9rem] -translate-x-1/2 text-stone-700 dark:text-stone-200"
                      style={{ left: pos(addDays(parseDate(p.milestone.date), 1)) }}
                      title={`Milestone: ${p.milestone.label} (${formatDate(p.milestone.date)})`}
                    >
                      <Diamond className="h-4 w-4 fill-current" aria-label={`Milestone: ${p.milestone.label}`} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {todayVisible && (
            <div className="pointer-events-none absolute inset-y-0 left-[13rem] right-0" aria-hidden>
              <div className="absolute inset-y-0 w-0.5 bg-[#e34948]" style={{ left: pos(now) }}>
                <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-[#e34948] px-1 text-[10px] font-semibold text-white">Today</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-brand-500" aria-hidden />On track</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-[#d03b3b]" aria-hidden /><AlertTriangle className="h-3 w-3" aria-hidden />Delayed</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-stone-400" aria-hidden />Complete</span>
          <span className="flex items-center gap-1.5"><Diamond className="h-3.5 w-3.5 fill-current" aria-hidden />Milestone</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-[#e34948]" aria-hidden />Today</span>
        </div>
      </div>
    </div>
  );
}

export default function ProgramTimeline() {
  const program = useProgram();
  const { data } = useData();
  const { staffName } = useLookups();
  const { can } = useRole();
  const [editing, setEditing] = useState<TimelinePhase | null>(null);

  const phases = useMemo(
    () => data.phases.filter((p) => p.programId === program.id).sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase)),
    [data.phases, program.id],
  );

  const days = useMemo(() => {
    const acts = data.activities.filter((a) => a.programId === program.id).sort((a, b) => a.start.localeCompare(b.start));
    const map = new Map<string, Activity[]>();
    for (const a of acts) {
      const d = a.start.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(a);
    }
    return [...map.entries()];
  }, [data.activities, program.id]);

  if (!phases.length) {
    return (
      <Card>
        <EmptyState title="No timeline defined for this programme" />
      </Card>
    );
  }

  const now = today();
  const health = phases.map((p) => phaseHealth(p, now));
  const delayed = phases.filter((_, i) => health[i] === 'delayed');
  const totalDays = phases.reduce((s, p) => s + diffDays(parseDate(p.endDate), parseDate(p.startDate)) + 1, 0);
  const overall = phases.reduce((s, p) => s + p.percentComplete * (diffDays(parseDate(p.endDate), parseDate(p.startDate)) + 1), 0) / totalDays;
  const current = phases.find((p) => parseDate(p.startDate) <= now && parseDate(p.endDate) >= now);
  const nextMilestone = phases
    .filter((p) => p.milestone && parseDate(p.milestone.date) >= now)
    .sort((a, b) => a.milestone!.date.localeCompare(b.milestone!.date))[0]?.milestone;
  const todayIso = toISODate(now);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Overall progress" value={`${Math.round(overall)}%`} icon={ListChecks} progress={overall / 100} hint="Weighted by phase duration" />
        <KpiCard label="Current phase" value={<span className="text-lg">{current?.phase ?? (now < parseDate(phases[0].startDate) ? 'Not started' : 'Closed')}</span>} icon={Timer} hint={current ? `${current.percentComplete}% complete` : undefined} />
        <KpiCard
          label="Delayed phases"
          value={<span className={cx(delayed.length > 0 && 'text-red-700 dark:text-red-400')}>{delayed.length}</span>}
          icon={AlertTriangle}
          hint={delayed.length ? delayed.map((p) => p.phase).join(', ') : 'All phases on schedule'}
        />
        <KpiCard
          label="Next milestone"
          value={<span className="text-lg">{nextMilestone ? formatShort(nextMilestone.date) : '—'}</span>}
          icon={Flag}
          hint={nextMilestone?.label ?? 'No upcoming milestones'}
        />
      </div>

      {delayed.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <span className="font-semibold">Behind schedule: </span>
            {delayed
              .map((p) => `${p.phase} is ${p.percentComplete}% complete vs ${Math.round(expectedProgress(p, now))}% expected${parseDate(p.endDate) < now ? ` (was due ${formatDate(p.endDate)})` : ''}`)
              .join('; ')}
            .
          </div>
        </div>
      )}

      <Card>
        <CardHeader title="Programme structure" subtitle="Needs analysis → Design → Pre-work → Delivery → Assessment → Post-training follow-up" />
        <CardBody>
          <Gantt phases={phases} onEdit={can.editOperations ? setEditing : undefined} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Progress by phase" />
          <CardBody className="space-y-4">
            {phases.map((p, i) => (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{p.phase}</span>
                  <StatusBadge status={HEALTH_LABEL[health[i]]} />
                </div>
                <ProgressBar
                  value={p.percentComplete / 100}
                  label={`Expected ${Math.round(expectedProgress(p, now))}%`}
                  showValue={`${p.percentComplete}%`}
                  tone={health[i] === 'delayed' ? 'critical' : health[i] === 'complete' ? 'muted' : 'brand'}
                />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Delivery schedule" subtitle={`Day-by-day sessions · ${days.length} delivery days`} />
          <CardBody>
            {!days.length ? (
              <EmptyState title="No sessions scheduled yet" />
            ) : (
              <ol className="max-h-[36rem] space-y-4 overflow-y-auto pr-1">
                {days.map(([day, acts], i) => (
                  <li key={day} className={cx('rounded-lg border p-3', day === todayIso ? 'border-brand-400 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/20' : 'border-stone-200 dark:border-stone-800')}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold">
                        Day {i + 1} · {formatWeekday(day)}
                      </h3>
                      {day === todayIso && <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">Today</span>}
                      {day < todayIso && <CheckCircle2 className="h-4 w-4 text-stone-400" aria-label="Past day" />}
                    </div>
                    <ul className="space-y-1.5">
                      {acts.map((a) => (
                        <li key={a.id} className={cx('grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm', a.status === 'Cancelled' && 'line-through opacity-60')}>
                          <span className="tabular-nums text-xs muted">
                            {formatTime(a.start)}–{formatTime(a.end)}
                          </span>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={cx('h-2 w-2 shrink-0 rounded-full', TYPE_DOT[a.type])} aria-hidden />
                            <span className="truncate">{a.title}</span>
                            <span className="hidden shrink-0 text-xs muted sm:inline">
                              {capitalise(a.type)} · {staffName(a.ownerId)}
                            </span>
                          </span>
                          <StatusBadge status={a.status} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
      {editing && <PhaseForm phase={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
