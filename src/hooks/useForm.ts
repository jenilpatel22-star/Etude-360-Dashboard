import { useCallback, useState } from 'react';

export type Errors<T> = Partial<Record<keyof T, string>>;

/** Minimal form state + validation helper. */
export function useForm<T extends Record<string, unknown>>(initial: T, validate: (v: T) => Errors<T>) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const submit = useCallback(
    async (onValid: (v: T) => Promise<void> | void) => {
      const errs = validate(values);
      const hasErrors = Object.values(errs).some(Boolean);
      setErrors(errs);
      if (hasErrors) {
        // focus the first invalid field
        const first = Object.keys(errs).find((k) => errs[k as keyof T]);
        if (first) document.getElementById(first)?.focus();
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        await onValid(values);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [validate, values],
  );

  return { values, set, errors, submit, submitting, submitError };
}

export const required = (v: unknown, label: string) =>
  v === undefined || v === null || (typeof v === 'string' && !v.trim()) ? `${label} is required` : undefined;
