import { CalendarRange, ClipboardList, GanttChartSquare, LayoutDashboard, Library, MessageSquareText, Radar, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { cx } from '@/lib/format';
import { useCurrentProgramId } from '@/hooks/useCurrentProgram';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pid = useCurrentProgramId();
  const { pathname } = useLocation();
  const { can } = useAuth();
  const items = [
    { to: '/', label: 'Programs overview', icon: LayoutDashboard, end: true },
    { to: `/programs/${pid}/logistics`, label: 'Activities & logistics', icon: ClipboardList, match: '/logistics' },
    { to: `/programs/${pid}/timeline`, label: 'Structure & timeline', icon: GanttChartSquare, match: '/timeline' },
    { to: `/programs/${pid}/feedback`, label: 'Feedback reports', icon: MessageSquareText, match: '/feedback' },
    { to: '/analysis', label: '360° analysis', icon: Radar },
    { to: '/depository', label: 'Activity depository', icon: Library },
    ...(can.manageUsers ? [{ to: '/users', label: 'Users', icon: Users }] : []),
  ];
  return (
    <>
      <div
        className={cx('fixed inset-0 z-30 bg-black/40 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform dark:border-stone-800 dark:bg-[#161615] lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <CalendarRange className="h-4 w-4" aria-hidden />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Etude 360</div>
              <div className="text-[11px] muted">Training management</div>
            </div>
          </div>
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={onClose} aria-label="Close navigation">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {items.map(({ to, label, icon: Icon, end, match }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => {
                const active = match ? pathname.endsWith(match) : isActive;
                return cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
                );
              }}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-200 px-5 py-4 text-[11px] muted dark:border-stone-800">
          Data is stored in this browser.
          <br />
          Connect an API to share it across devices.
        </div>
      </aside>
    </>
  );
}
