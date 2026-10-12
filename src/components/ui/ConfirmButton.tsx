import { useEffect, useState, type ReactNode } from 'react';

/**
 * Two-step destructive button: the first click arms it, the second confirms.
 * Avoids window.confirm(), which some embedded viewers block.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Click again to confirm',
  className = 'btn-danger',
  title,
  ariaLabel,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: ReactNode;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={armed ? undefined : ariaLabel}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      <span aria-live="polite">{armed ? confirmLabel : children}</span>
    </button>
  );
}
