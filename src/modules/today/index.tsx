import { lazy } from 'react';
import { ListChecks } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';

const TodayPage = lazy(() => import('./pages/TodayPage'));

export const todayModule: AppModule = {
  id: 'today',
  version: '0.1.0',
  title: 'today:title',
  icon: ListChecks,
  emoji: '📋',
  enabledByDefault: true,
  nav: { order: 1, placement: 'main' },
  routes: [{ index: true, element: <TodayPage /> }],
  i18n: {
    uk: { title: 'Сьогодні', heading: 'Завдання на сьогодні', empty: 'На сьогодні завдань немає' },
    en: { title: 'Today', heading: 'Today’s tasks', empty: 'No tasks for today' },
  },
};
