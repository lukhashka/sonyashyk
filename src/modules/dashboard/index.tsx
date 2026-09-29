import { lazy } from 'react';
import { House } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));

export const dashboardModule: AppModule = {
  id: 'dashboard',
  version: '0.1.0',
  title: 'dashboard:title',
  icon: House,
  emoji: '🏠',
  enabledByDefault: true,
  nav: { order: 0, placement: 'main' },
  routes: [{ index: true, element: <DashboardPage /> }],
  i18n: {
    uk: {
      title: 'Головна',
      welcome: 'Ласкаво просимо до Соняшика 🌻',
      hint: 'Тут скоро з’являться твої щоденні завдання та прогрес.',
    },
    en: {
      title: 'Home',
      welcome: 'Welcome to Sonyashyk 🌻',
      hint: 'Your daily tasks and progress will show up here soon.',
    },
  },
};
