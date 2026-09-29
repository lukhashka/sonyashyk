import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CelebrationWatcher } from '@/core/gamification/CelebrationWatcher';
import { AchievementWatcher } from '@/core/gamification/AchievementWatcher';
import { Skeleton } from '@/shared/ui';
import { BottomNav } from './BottomNav';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';
import { RouteAnnouncer } from './RouteAnnouncer';
import { ProfileSync } from './ProfileSync';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-[#3d2c2e]"
      >
        {t('nav.skip')}
      </a>
      <RouteAnnouncer />
      <ProfileSync />
      <AchievementWatcher />
      <CelebrationWatcher />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" tabIndex={-1} className="flex-1 p-4 pb-24 outline-none md:p-8 md:pb-8">
          <ModuleErrorBoundary>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </ModuleErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
