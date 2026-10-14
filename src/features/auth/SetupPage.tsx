import { useState } from 'react';
import { Field, inputProps } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { passwordProblem, USERNAME_RE, normaliseUsername } from '@/lib/auth';
import { AuthShell, PasswordInput } from './AuthShell';

type Values = { displayName: string; username: string; email: string; password: string; confirm: string };

function validate(v: Values): Errors<Values> {
  return {
    displayName: required(v.displayName, 'Name'),
    username: required(v.username, 'Username') ?? (USERNAME_RE.test(normaliseUsername(v.username)) ? undefined : 'Use 3–32 letters, numbers, dots, dashes or underscores'),
    email: v.email && !/^\S+@\S+\.\S+$/.test(v.email) ? 'Enter a valid email address' : undefined,
    password: passwordProblem(v.password),
    confirm: v.confirm !== v.password ? 'Passwords do not match' : undefined,
  };
}

/** Shown once, when no accounts exist: creates the first Admin. */
export function SetupPage() {
  const { createAccount } = useAuth();
  const [show, setShow] = useState(false);
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    { displayName: '', username: 'admin', email: '', password: '', confirm: '' },
    validate,
  );
  return (
    <AuthShell title="Create the administrator account" subtitle="The dashboard has no users yet. This first account gets full Admin access and can add everyone else.">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit((v) => createAccount({ displayName: v.displayName.trim(), username: v.username, email: v.email.trim(), role: 'Admin', password: v.password }).then(() => undefined));
        }}
      >
        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {submitError}
          </p>
        )}
        <Field label="Full name" htmlFor="displayName" error={errors.displayName} required>
          <input {...inputProps('displayName', errors.displayName)} autoComplete="name" value={values.displayName} onChange={(e) => set('displayName', e.target.value)} />
        </Field>
        <Field label="Username" htmlFor="username" error={errors.username} required>
          <input {...inputProps('username', errors.username)} autoComplete="username" autoCapitalize="none" spellCheck={false} value={values.username} onChange={(e) => set('username', e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input type="email" {...inputProps('email', errors.email)} autoComplete="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number" required>
          <PasswordInput {...inputProps('password', errors.password)} autoComplete="new-password" value={values.password} onChange={(e) => set('password', e.target.value)} show={show} onToggle={() => setShow((s) => !s)} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm} required>
          <input type={show ? 'text' : 'password'} {...inputProps('confirm', errors.confirm)} autoComplete="new-password" value={values.confirm} onChange={(e) => set('confirm', e.target.value)} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account and sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
