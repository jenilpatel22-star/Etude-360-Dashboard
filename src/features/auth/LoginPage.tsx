import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Field, inputProps } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { AuthShell, PasswordInput } from './AuthShell';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Use the username and password your administrator gave you.">
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        <Field label="Username" htmlFor="username">
          <input {...inputProps('username')} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput {...inputProps('password')} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} show={show} onToggle={() => setShow((s) => !s)} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          <LogIn className="h-4 w-4" aria-hidden />
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs muted">Forgotten your password? Ask an Admin to reset it from the Users page.</p>
      </form>
    </AuthShell>
  );
}
