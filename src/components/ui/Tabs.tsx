import { cx } from '@/lib/format';

interface TabsProps<T extends string> {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx('inline-flex rounded-lg bg-stone-100 p-1 dark:bg-stone-800', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === t.id
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-50'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-stone-200 px-1.5 text-xs tabular-nums dark:bg-stone-700">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
