import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  /** Optional 0..1 progress shown as a thin meter under the value. */
  progress?: number;
  progressLabel?: string;
  tone?: 'default' | 'warning' | 'critical' | 'good';
}

const TONE_BAR = {
  default: 'bg-brand-500',
  good: 'bg-[#0ca30c]',
  warning: 'bg-[#fab219]',
  critical: 'bg-[#d03b3b]',
};

export function KpiCard({ label, value, icon: Icon, hint, progress, progressLabel, tone = 'default' }: KpiCardProps) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-stone-400" aria-hidden />}
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {progress !== undefined && (
        <div
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, progress) * 100)}
          aria-label={progressLabel ?? label}
        >
          <div className={cx('h-full rounded-full', TONE_BAR[tone])} style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}
      {hint && <div className="text-xs muted">{hint}</div>}
    </div>
  );
}
