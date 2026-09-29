import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Skeleton } from '@/shared/ui';
import { BottomNav } from './BottomNav';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';
import { ProfileSync } from './ProfileSync';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <ProfileSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <ModuleErrorBoundary>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <Outlet />
            </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
