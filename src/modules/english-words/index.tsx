import { lazy } from 'react';
import { Languages } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';
import { i18n } from './i18n';
import { fetchDailyCounts, fetchWordsPerDay } from './lib/fetchers';
import { MAX_REVIEW_BATCH } from './lib/selection';

const HubPage = lazy(() => import('./pages/HubPage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const DictionaryPage = lazy(() => import('./pages/DictionaryPage'));

export const englishWordsModule: AppModule = {
  id: 'english-words',
  version: '0.1.0',
  title: 'english-words:title',
  icon: Languages,
  emoji: '🇬🇧',
  enabledByDefault: true,
  nav: { order: 2, placement: 'main' },
  routes: [
    { index: true, element: <HubPage /> },
    { path: 'session', element: <SessionPage /> },
    { path: 'dictionary', element: <DictionaryPage /> },
  ],
  dailyTaskProvider: {
    async getTasksForDay({ day }) {
      const [perDay, { unseen, due }] = await Promise.all([
        fetchWordsPerDay(),
        fetchDailyCounts(day.date),
      ]);
      const tasks = [];
      if (unseen > 0) {
        tasks.push({
          key: 'words-learn',
          title: 'english-words:task.learn',
          emoji: '📖',
          xp: 20,
          estimatedMinutes: 10,
          route: '/m/english-words/session?mode=learn',
          progress: { current: 0, target: Math.min(perDay, unseen) },
        });
      }
      if (due > 0) {
        tasks.push({
          key: 'words-review',
          title: 'english-words:task.review',
          emoji: '🔁',
          xp: 10,
          estimatedMinutes: 5,
          route: '/m/english-words/session?mode=review',
          progress: { current: 0, target: Math.min(due, MAX_REVIEW_BATCH) },
        });
      }
      return tasks;
    },
  },
  i18n,
};
