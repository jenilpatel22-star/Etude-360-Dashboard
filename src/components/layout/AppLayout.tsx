import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useData } from '@/data/DataProvider';
import { Spinner } from '@/components/ui/EmptyState';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { loading, error } = useData();
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          {error ? (
            <div className="card p-6 text-sm text-red-700 dark:text-red-300" role="alert">
              Failed to load data: {error}
            </div>
          ) : loading ? (
            <Spinner label="Loading programmes" />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2" data-export-ignore>{actions}</div>}
    </div>
  );
}
