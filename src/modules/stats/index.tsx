import { lazy } from 'react';
import { ChartNoAxesColumn } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';
import { i18n } from './i18n';

const StatsPage = lazy(() => import('./pages/StatsPage'));

export const statsModule: AppModule = {
  id: 'stats',
  version: '0.1.0',
  title: 'stats:title',
  icon: ChartNoAxesColumn,
  emoji: '📊',
  enabledByDefault: true,
  nav: { order: 3, placement: 'main' },
  routes: [{ index: true, element: <StatsPage /> }],
  i18n,
};
