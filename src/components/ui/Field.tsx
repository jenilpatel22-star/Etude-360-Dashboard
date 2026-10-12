import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-red-600" aria-hidden> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs muted">{hint}</p>
      )}
    </div>
  );
}

export const inputProps = (id: string, error?: string) => ({
  id,
  name: id,
  'aria-invalid': !!error || undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
  className: cx('input', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30'),
});
