import { CalendarRange, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTheme } from '@/context/ThemeContext';

/** Centered card layout shared by the sign-in and first-run screens. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <button
        type="button"
        className="btn-ghost fixed right-4 top-4 p-2"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <CalendarRange className="h-5 w-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Etude 360</div>
            <div className="text-xs muted">Training management</div>
          </div>
        </div>
        <main className="card p-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mb-5 mt-1 text-sm muted">{subtitle}</p>
          {children}
        </main>
      </div>
    </div>
  );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement> & { show: boolean; onToggle: () => void }) {
  const { show, onToggle, ...rest } = props;
  return (
    <div className="relative">
      <input {...rest} type={show ? 'text' : 'password'} className={`${rest.className ?? 'input'} pr-16`} />
      <button type="button" onClick={onToggle} className="absolute right-1.5 top-1.5 rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-stone-100 dark:text-brand-300 dark:hover:bg-stone-800" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
