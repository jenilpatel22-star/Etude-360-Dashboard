import { ChevronDown, KeyRound, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ChangePasswordForm } from '@/features/forms/ChangePasswordForm';
import { RoleBadge } from '@/components/ui/RoleBadge';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { account, can, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!account) return null;
  const initials = account.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-stone-200 bg-white/80 px-4 backdrop-blur dark:border-stone-800 dark:bg-[#121211]/80 sm:px-6">
      <button type="button" className="btn-ghost p-2 lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      {can.readOnly && (
        <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900 sm:inline">
          View only
        </span>
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
      <div className="relative" ref={menuRef}>
        <button type="button" className="btn-ghost gap-2 py-1.5 pl-1.5" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white" aria-hidden>
            {initials}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">{account.displayName}</span>
            <span className="block text-xs muted">{account.role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-stone-400" aria-hidden />
        </button>
        {menuOpen && (
          <div role="menu" className="card absolute right-0 mt-2 w-64 p-1.5 shadow-lg">
            <div className="border-b border-stone-100 px-3 pb-2.5 pt-1.5 dark:border-stone-800">
              <div className="text-sm font-medium">{account.displayName}</div>
              <div className="mb-1.5 text-xs muted">@{account.username}</div>
              <RoleBadge role={account.role} />
            </div>
            <button
              type="button"
              role="menuitem"
              className="btn-ghost mt-1 w-full justify-start"
              onClick={() => {
                setMenuOpen(false);
                setChangingPw(true);
              }}
            >
              <KeyRound className="h-4 w-4" aria-hidden /> Change password
            </button>
            <button type="button" role="menuitem" className="btn-ghost w-full justify-start" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </div>
        )}
      </div>
      {changingPw && <ChangePasswordForm onClose={() => setChangingPw(false)} />}
    </header>
  );
}
