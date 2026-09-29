import { lazy } from 'react';
import { Languages } from 'lucide-react';
import type { AchievementDefinition, AppModule } from '@/core/modules/types';
import { percent } from '@/core/stats/series';
import { i18n } from './i18n';
import { fetchDailyCounts, fetchEwStats, fetchWordsPerDay } from './lib/fetchers';
import { MAX_REVIEW_BATCH } from './lib/selection';

const HubPage = lazy(() => import('./pages/HubPage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const DictionaryPage = lazy(() => import('./pages/DictionaryPage'));
const WordsCharts = lazy(() => import('./widgets/WordsCharts'));

const ach = (id: string, emoji: string): AchievementDefinition => ({
  id: `ew-${id}`,
  emoji,
  title: `english-words:ach.ew-${id}.title`,
  description: `english-words:ach.ew-${id}.hint`,
});

export const englishWordsModule: AppModule = {
  id: 'english-words',
  version: '0.1.0',
  title: 'english-words:title',
  icon: Languages,
  emoji: '🇬🇧',
  enabledByDefault: true,
  nav: { order: 2, placement: 'more' },
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
  statsProvider: {
    async getSummary(range) {
      const s = await fetchEwStats(range);
      const acc = percent(s.rangeCorrect, s.rangeAnswers);
      return [
        { key: 'known', label: 'english-words:stats.known', value: s.known, emoji: '⭐' },
        {
          key: 'practiced',
          label: 'english-words:stats.practiced',
          value: s.rangeWords,
          emoji: '📖',
        },
        {
          key: 'accuracy',
          label: 'english-words:stats.accuracy',
          value: acc === null ? '—' : `${acc}%`,
          emoji: '🎯',
        },
        { key: 'due', label: 'english-words:stats.due', value: s.due, emoji: '🔁' },
      ];
    },
    Widgets: [WordsCharts],
  },
  checkAchievementsRpc: 'ew_check_achievements',
  achievements: [
    ach('words-10', '📖'),
    ach('words-50', '🔤'),
    ach('words-100', '😋'),
    ach('words-300', '🍽️'),
    ach('known-25', '⭐'),
    ach('known-100', '🎓'),
    ach('reviews-100', '🔁'),
    ach('perfect-day', '💯'),
    ach('custom-word', '✍️'),
  ],
  i18n,
};
