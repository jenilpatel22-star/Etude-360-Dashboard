import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useData } from '@/data/DataProvider';
import {
  addDays,
  diffDays,
  formatMonthYear,
  formatShort,
  formatTime,
  parseDate,
  sameDay,
  startOfMonth,
  startOfWeek,
  toISODate,
  today,
} from '@/lib/dates';
import { capitalise, cx } from '@/lib/format';
import type { Program, ProgramStatus } from '@/types';

const BAR: Record<ProgramStatus, string> = {
  Upcoming: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-700',
  Ongoing: 'bg-green-100 text-green-900 border-green-300 dark:bg-green-900/50 dark:text-green-100 dark:border-green-700',
  Potential: 'bg-violet-50 text-violet-900 border-violet-300 border-dashed dark:bg-violet-900/30 dark:text-violet-100 dark:border-violet-600',
  Completed: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-600',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_LANES = 3;

function lanesForWeek(programs: Program[], weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const items = programs
    .filter((p) => parseDate(p.startDate) <= weekEnd && parseDate(p.endDate) >= weekStart)
    .map((p) => ({
      p,
      s: Math.max(0, diffDays(parseDate(p.startDate), weekStart)),
      e: Math.min(6, diffDays(parseDate(p.endDate), weekStart)),
      clippedStart: parseDate(p.startDate) < weekStart,
      clippedEnd: parseDate(p.endDate) > weekEnd,
    }))
    .sort((a, b) => a.s - b.s || b.e - b.s - (a.e - a.s));
  const lanes: (typeof items)[] = [];
  for (const it of items) {
    const lane = lanes.find((l) => l.every((x) => x.e < it.s || x.s > it.e));
    if (lane) lane.push(it);
    else lanes.push([it]);
  }
  return lanes;
}

export function CalendarView({ programs }: { programs: Program[] }) {
  const { data } = useData();
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(today());
  const now = today();

  const step = (dir: number) =>
    setCursor((c) => (mode === 'month' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * 7)));

  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor));
    const out: Date[] = [];
    for (let w = 0; w < 6; w++) {
      const ws = addDays(first, w * 7);
      if (w > 3 && ws.getMonth() !== cursor.getMonth()) break;
      out.push(ws);
    }
    return out;
  }, [cursor]);

  const weekStart = startOfWeek(cursor);
  const programIds = new Set(programs.map((p) => p.id));
  const programById = new Map(programs.map((p) => [p.id, p]));

  const title =
    mode === 'month' ? formatMonthYear(cursor) : `${formatShort(weekStart)} – ${formatShort(addDays(weekStart, 6))} ${addDays(weekStart, 6).getFullYear()}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost p-1.5" onClick={() => step(-1)} aria-label={`Previous ${mode}`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="btn-ghost p-1.5" onClick={() => step(1)} aria-label={`Next ${mode}`}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 text-sm font-semibold" aria-live="polite">
            {title}
          </h2>
          <button type="button" className="btn-secondary ml-2 px-2 py-1 text-xs" onClick={() => setCursor(today())}>
            Today
          </button>
        </div>
        <Tabs
          label="Calendar range"
          value={mode}
          onChange={setMode}
          tabs={[
            { id: 'month', label: 'Month' },
            { id: 'week', label: 'Week' },
          ]}
        />
      </div>

      {mode === 'month' ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-2 py-1.5 text-xs font-medium muted">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((ws) => {
              const lanes = lanesForWeek(programs, ws);
              const hidden = lanes.slice(MAX_LANES).flat();
              return (
                <div key={toISODate(ws)} className="relative border-b border-stone-100 last:border-0 dark:border-stone-800/70">
                  <div className="grid grid-cols-7">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = addDays(ws, i);
                      const inMonth = d.getMonth() === cursor.getMonth();
                      const isToday = sameDay(d, now);
                      return (
                        <div
                          key={i}
                          className={cx(
                            'min-h-[6.5rem] border-r border-stone-100 px-2 py-1 last:border-r-0 dark:border-stone-800/70',
                            !inMonth && 'bg-stone-50/70 dark:bg-stone-900/40',
                            (i === 5 || i === 6) && inMonth && 'bg-stone-50/40 dark:bg-stone-900/20',
                          )}
                        >
                          <span
                            className={cx(
                              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums',
                              isToday ? 'bg-brand-600 font-semibold text-white' : inMonth ? '' : 'muted',
                            )}
                            aria-current={isToday ? 'date' : undefined}
                          >
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-8 space-y-1 px-0.5">
                    {lanes.slice(0, MAX_LANES).map((lane, li) => (
                      <div key={li} className="grid grid-cols-7 gap-x-1">
                        {lane.map(({ p, s, e, clippedStart, clippedEnd }) => (
                          <Link
                            key={p.id}
                            to={`/programs/${p.id}/logistics`}
                            style={{ gridColumn: `${s + 1} / ${e + 2}` }}
                            title={`${p.title} (${p.status})`}
                            className={cx(
                              'pointer-events-auto truncate border px-1.5 py-0.5 text-[11px] font-medium leading-4 hover:brightness-95',
                              BAR[p.status],
                              clippedStart ? 'rounded-l-none border-l-0' : 'rounded-l-md',
                              clippedEnd ? 'rounded-r-none border-r-0' : 'rounded-r-md',
                            )}
                          >
                            {p.title}
                          </Link>
                        ))}
                      </div>
                    ))}
                    {hidden.length > 0 && <div className="px-1.5 text-[11px] muted">+{hidden.length} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-stone-100 dark:divide-stone-800 md:grid-cols-7 md:divide-x md:divide-y-0">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i);
            const iso = toISODate(d);
            const dayPrograms = programs.filter((p) => p.startDate <= iso && p.endDate >= iso);
            const dayActs = data.activities
              .filter((a) => programIds.has(a.programId) && a.start.slice(0, 10) === iso)
              .sort((a, b) => a.start.localeCompare(b.start));
            const isToday = sameDay(d, now);
            return (
              <div key={iso} className={cx('min-h-[8rem] p-2', isToday && 'bg-brand-50/50 dark:bg-brand-900/20')}>
                <div className="mb-2 flex items-baseline gap-1.5">
                  <span className="text-xs muted">{WEEKDAYS[i]}</span>
                  <span className={cx('text-sm font-semibold tabular-nums', isToday && 'text-brand-700 dark:text-brand-300')}>{d.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {dayPrograms.map((p) => (
                    <Link key={p.id} to={`/programs/${p.id}/logistics`} className={cx('block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium', BAR[p.status])}>
                      {p.title}
                    </Link>
                  ))}
                  {dayActs.map((a) => (
                    <div key={a.id} className="rounded-md bg-stone-50 px-1.5 py-1 text-[11px] dark:bg-stone-800/60">
                      <div className="font-medium tabular-nums">
                        {formatTime(a.start)}–{formatTime(a.end)} · {capitalise(a.type)}
                      </div>
                      <div className="truncate muted" title={`${a.title} — ${programById.get(a.programId)?.title}`}>
                        {a.title}
                      </div>
                    </div>
                  ))}
                  {!dayPrograms.length && !dayActs.length && <div className="text-[11px] muted">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-3 border-t border-stone-200 px-4 py-2 text-xs dark:border-stone-800">
        {(Object.keys(BAR) as ProgramStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cx('inline-block h-3 w-5 rounded border', BAR[s])} aria-hidden />
            {s}
          </span>
        ))}
      </div>
    </Card>
  );
}
