import { Menu, Moon, RotateCcw, Sun, UserCog } from 'lucide-react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useTheme } from '@/context/ThemeContext';
import { useRole } from '@/context/RoleContext';
import { useData } from '@/data/DataProvider';
import { ROLES, type Role } from '@/lib/permissions';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { role, setRole, can } = useRole();
  const { reset } = useData();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-stone-200 bg-white/80 px-4 backdrop-blur dark:border-stone-800 dark:bg-[#121211]/80 sm:px-6">
      <button type="button" className="btn-ghost p-2 lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      {role === 'Trainer' && (
        <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900 sm:inline">
          Read-only view
        </span>
      )}
      <label className="flex items-center gap-2 text-sm">
        <UserCog className="h-4 w-4 text-stone-400" aria-hidden />
        <span className="sr-only">View as role</span>
        <select className="input w-auto py-1.5" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      {can.manageBudget && (
        <ConfirmButton
          className="btn-ghost p-2 text-xs"
          title="Reset demo data"
          ariaLabel="Reset demo data"
          confirmLabel="Reset all edits?"
          onConfirm={() => void reset()}
        >
          <RotateCcw className="h-4 w-4" />
        </ConfirmButton>
      )}
      <button
        type="button"
        className="btn-ghost p-2"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
