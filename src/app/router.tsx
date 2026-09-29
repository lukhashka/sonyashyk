import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { getEnabledModules } from '@/core/modules/registry';
import { RequireAuth } from '@/core/auth/RequireAuth';
import { LoginPage } from './layout/LoginPage';

/** Builds the route tree from the module registry: each module is mounted under /m/<id>. */
export function buildRoutes(): RouteObject[] {
  const moduleRoutes: RouteObject[] = getEnabledModules().map((m) => ({
    path: `m/${m.id}`,
    children: m.routes ?? [],
  }));

  return [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          path: '/',
          // Loaded on demand so the login page does not pay for the whole app shell.
          lazy: async () => ({ Component: (await import('./layout/AppShell')).AppShell }),
          children: [
            { index: true, element: <Navigate to="/m/dashboard" replace /> },
            ...moduleRoutes,
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ];
}

export const createRouter = () => createBrowserRouter(buildRoutes());
