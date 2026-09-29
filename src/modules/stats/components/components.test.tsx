import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/core/i18n/locales/en';
import { i18n as bundles } from '../i18n';
import { AchievementsGallery } from './AchievementsGallery';
import { Heatmap } from './Heatmap';

vi.mock('@/core/stats/queries', () => ({
  useUnlockedAchievements: () => ({
    isPending: false,
    isError: false,
    data: [{ achievement_id: 'first-day', unlocked_at: '2026-09-20T10:00:00Z' }],
  }),
}));
vi.mock('@/core/gamification/achievements', () => ({
  getAllAchievements: () => [
    {
      id: 'first-day',
      emoji: '🌻',
      title: 'common:achievements.first-day.title',
      description: 'common:achievements.first-day.hint',
    },
    {
      id: 'streak-3',
      emoji: '🐱',
      title: 'common:achievements.streak-3.title',
      description: 'common:achievements.streak-3.hint',
    },
  ],
}));

const i18n = createInstance();
void i18n.init({
  lng: 'en',
  ns: ['common', 'stats'],
  defaultNS: 'stats',
  resources: { en: { common: en.common, stats: bundles.en } },
  interpolation: { escapeValue: false },
});

const wrap = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe('Heatmap', () => {
  it('describes the activity for screen readers', () => {
    wrap(
      <Heatmap
        today="2026-09-29"
        xpByDay={
          new Map([
            ['2026-09-29', 15],
            ['2026-09-28', 5],
          ])
        }
      />,
    );
    expect(
      screen.getByRole('img', { name: /2 active days and 20 XP over the last 26 weeks/ }),
    ).toBeInTheDocument();
  });
});

describe('AchievementsGallery', () => {
  it('shows unlocked achievements and hints for locked ones', () => {
    wrap(<AchievementsGallery />);
    expect(screen.getByText('1 of 2 unlocked')).toBeInTheDocument();
    expect(screen.getByText('Sunshine woke up')).toBeInTheDocument();
    expect(screen.getByText(/Unlocked .*20.*2026/)).toBeInTheDocument();
    expect(screen.getByText(/Complete every task 3 days in a row/)).toBeInTheDocument();
    expect(screen.getByText('Not unlocked yet')).toBeInTheDocument();
  });
});
