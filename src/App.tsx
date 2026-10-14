import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/EmptyState';
import { ProgramsOverview } from '@/features/overview/ProgramsOverview';
import { ProgramLayout } from '@/features/program/ProgramLayout';

const ActivitiesLogistics = lazy(() => import('@/features/logistics/ActivitiesLogistics'));
const ProgramTimeline = lazy(() => import('@/features/timeline/ProgramTimeline'));
const FeedbackReport = lazy(() => import('@/features/feedback/FeedbackReport'));
const OrgAnalysis = lazy(() => import('@/features/analysis/OrgAnalysis'));
const UsersPage = lazy(() => import('@/features/users/UsersPage'));

const wrap = (el: React.ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>;

// Hash routing for static hosts that can't rewrite deep links (VITE_ROUTER=hash).
const createRouter = import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter;

const router = createRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <ProgramsOverview /> },
      {
        path: 'programs/:programId',
        element: <ProgramLayout />,
        children: [
          { index: true, element: <Navigate to="logistics" replace /> },
          { path: 'logistics', element: wrap(<ActivitiesLogistics />) },
          { path: 'timeline', element: wrap(<ProgramTimeline />) },
          { path: 'feedback', element: wrap(<FeedbackReport />) },
        ],
      },
      { path: 'analysis', element: wrap(<OrgAnalysis />) },
      { path: 'users', element: wrap(<UsersPage />) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
