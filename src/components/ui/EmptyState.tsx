import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ title, children, icon: Icon = Inbox }: { title: string; children?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <Icon className="h-8 w-8 text-stone-300 dark:text-stone-600" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm muted">{children}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand-500" />
      {label}…
    </div>
  );
}
