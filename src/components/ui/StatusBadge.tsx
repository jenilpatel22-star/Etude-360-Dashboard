import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Clock,
  Lightbulb,
  PlayCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '@/lib/format';

type Tone = 'blue' | 'green' | 'amber' | 'violet' | 'stone' | 'red' | 'orange';

const TONES: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900',
  green: 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-950/50 dark:text-green-200 dark:ring-green-900',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900',
  orange: 'bg-orange-50 text-orange-900 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-900',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900',
  stone: 'bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700',
  red: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900',
};

const MAP: Record<string, [Tone, LucideIcon]> = {
  // program
  Upcoming: ['blue', CalendarClock],
  Ongoing: ['green', PlayCircle],
  Potential: ['violet', Lightbulb],
  Completed: ['stone', CheckCircle2],
  // logistics
  Pending: ['amber', Clock],
  Confirmed: ['blue', CircleDot],
  Done: ['green', CheckCircle2],
  // activity
  Planned: ['stone', CircleDashed],
  Cancelled: ['red', XCircle],
  // derived
  Overdue: ['red', AlertTriangle],
  'Due soon': ['orange', Clock],
  Delayed: ['red', AlertTriangle],
  'On track': ['green', CircleDot],
  Complete: ['stone', CheckCircle2],
  'Not started': ['stone', CircleDashed],
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const [tone, Icon] = MAP[status] ?? ['stone', CircleDot];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {status}
    </span>
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300', className)}>
      {children}
    </span>
  );
}
