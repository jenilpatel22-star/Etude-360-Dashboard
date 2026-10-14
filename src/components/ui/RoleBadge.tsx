import { cx } from '@/lib/format';
import type { UserRole } from '@/types';

const ROLE_STYLE: Record<UserRole, string> = {
  Admin: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-100 dark:ring-brand-800',
  'Program Executive': 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900',
  Trainer: 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-950/50 dark:text-green-200 dark:ring-green-900',
  Trainee: 'bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={cx('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', ROLE_STYLE[role])}>{role}</span>;
}

