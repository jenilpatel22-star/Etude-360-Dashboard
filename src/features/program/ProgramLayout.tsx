import { ArrowLeft, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { StatusBadge, Tag } from '@/components/ui/StatusBadge';
import { useRole } from '@/context/RoleContext';
import { useData, useLookups } from '@/data/DataProvider';
import { ProgramForm } from '@/features/forms/ProgramForm';
import { MODE_ICON } from '@/features/overview/ProgramCard';
import { useRememberProgram } from '@/hooks/useCurrentProgram';
import { formatRange } from '@/lib/dates';
import { capitalise, cx } from '@/lib/format';
import { PROGRAM_STATUSES, type Program } from '@/types';

const SECTIONS = [
  { path: 'logistics', label: 'Activities & logistics' },
  { path: 'timeline', label: 'Structure & timeline' },
  { path: 'feedback', label: 'Feedback report' },
];

export function ProgramLayout() {
  const { programId } = useParams();
  const { data } = useData();
  const { staffName } = useLookups();
  const { can } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [editing, setEditing] = useState(false);
  const program = data.programs.find((p) => p.id === programId);
  useRememberProgram(program?.id);

  if (!program) return <Navigate to="/" replace />;
  const section = SECTIONS.find((s) => pathname.endsWith(`/${s.path}`))?.path ?? 'logistics';
  const ModeIcon = MODE_ICON[program.mode];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2" data-export-ignore>
        <Link to="/" className="btn-ghost -ml-2 px-2 py-1 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Overview
        </Link>
        <label className="ml-auto flex min-w-0 items-center gap-2 text-sm">
          <span className="muted hidden sm:inline">Programme</span>
          <select
            className="input max-w-[min(80vw,22rem)] py-1.5"
            value={program.id}
            onChange={(e) => navigate(`/programs/${e.target.value}/${section}`)}
            aria-label="Select programme"
          >
            {PROGRAM_STATUSES.map((status) => (
              <optgroup key={status} label={status}>
                {data.programs
                  .filter((p) => p.status === status)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className="card mb-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Tag>{program.category}</Tag>
              <span className="text-xs muted">{program.code}</span>
              <StatusBadge status={program.status} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{program.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm muted">
              <span>{formatRange(program.startDate, program.endDate)}</span>
              <span className="flex items-center gap-1">
                <ModeIcon className="h-3.5 w-3.5" aria-hidden /> {capitalise(program.mode)} · {program.venue}
              </span>
              <span>Trainer{program.trainerIds.length > 1 ? 's' : ''}: {program.trainerIds.map(staffName).join(', ')}</span>
              <span>Coordinator: {staffName(program.coordinatorId)}</span>
            </p>
          </div>
          {can.editPrograms && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)} data-export-ignore>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </button>
          )}
        </div>
        <nav className="-mb-4 mt-4 flex gap-1 overflow-x-auto border-t border-stone-100 pt-2 dark:border-stone-800 sm:-mb-5" aria-label="Programme sections" data-export-ignore>
          {SECTIONS.map((s) => (
            <NavLink
              key={s.path}
              to={`/programs/${program.id}/${s.path}`}
              className={({ isActive }) =>
                cx(
                  'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet context={{ program } satisfies ProgramContext} />
      {editing && <ProgramForm program={program} onClose={() => setEditing(false)} />}
    </>
  );
}

interface ProgramContext {
  program: Program;
}
export const useProgram = () => useOutletContext<ProgramContext>().program;
