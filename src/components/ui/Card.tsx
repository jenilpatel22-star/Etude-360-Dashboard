import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('card', className)}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2" data-export-ignore>{actions}</div>}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-4 pb-4 pt-3 sm:px-5', className)}>{children}</div>;
}
