import { cx } from '@/lib/format';

interface Props {
  value: number; // 0..1
  label: string;
  showValue?: string;
  tone?: 'brand' | 'good' | 'warning' | 'critical' | 'muted';
  size?: 'sm' | 'md';
}

const TONE = {
  brand: 'bg-brand-500',
  good: 'bg-[#0ca30c]',
  warning: 'bg-[#fab219]',
  critical: 'bg-[#d03b3b]',
  muted: 'bg-stone-400',
};

export function ProgressBar({ value, label, showValue, tone = 'brand', size = 'sm' }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="muted">{label}</span>
          {showValue && <span className="font-medium tabular-nums">{showValue}</span>}
        </div>
      )}
      <div
        className={cx('w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800', size === 'sm' ? 'h-1.5' : 'h-2.5')}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className={cx('h-full rounded-full transition-all', TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
