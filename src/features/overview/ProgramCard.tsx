import { CalendarDays, MapPin, Monitor, Shuffle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge, Tag } from '@/components/ui/StatusBadge';
import { useLookups } from '@/data/DataProvider';
import { formatRange, relativeDays } from '@/lib/dates';
import { capitalise, formatCompactCurrency } from '@/lib/format';
import type { Program } from '@/types';

export const MODE_ICON = { onsite: MapPin, virtual: Monitor, hybrid: Shuffle };

export function ProgramCard({ program }: { program: Program }) {
  const { staffName } = useLookups();
  const fill = program.capacity ? program.enrolled / program.capacity : 0;
  const ModeIcon = MODE_ICON[program.mode];
  const when = program.status === 'Ongoing' ? `ends ${relativeDays(program.endDate)}` : program.status === 'Completed' ? `ended ${relativeDays(program.endDate)}` : `starts ${relativeDays(program.startDate)}`;
  return (
    <article className="card group relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Tag>{program.category}</Tag>
            <span className="text-xs muted">{program.code}</span>
          </div>
          <h3 className="text-sm font-semibold leading-snug">
            <Link to={`/programs/${program.id}/logistics`} className="after:absolute after:inset-0 hover:underline focus:outline-none">
              {program.title}
            </Link>
          </h3>
        </div>
        <StatusBadge status={program.status} />
      </div>
      <dl className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
          <dt className="sr-only">Dates</dt>
          <dd>
            {formatRange(program.startDate, program.endDate)} <span className="muted">· {when}</span>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <ModeIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
          <dt className="sr-only">Mode and venue</dt>
          <dd className="truncate">
            {capitalise(program.mode)} · {program.venue}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
          <dt className="sr-only">Trainers</dt>
          <dd className="truncate">{program.trainerIds.map(staffName).join(', ')}</dd>
        </div>
      </dl>
      <div className="mt-auto flex items-end gap-4">
        <ProgressBar
          value={fill}
          label={program.status === 'Potential' ? 'Expressions of interest' : 'Enrolment'}
          showValue={`${program.enrolled}/${program.capacity}`}
          tone={fill >= 1 ? 'good' : fill < 0.5 ? 'warning' : 'brand'}
        />
        <div className="shrink-0 text-right">
          <div className="text-[11px] muted">Budget</div>
          <div className="text-xs font-medium tabular-nums">{formatCompactCurrency(program.budget)}</div>
        </div>
      </div>
    </article>
  );
}
