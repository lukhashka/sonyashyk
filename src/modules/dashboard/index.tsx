import { lazy } from 'react';
import { House } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));

export const dashboardModule: AppModule = {
  id: 'dashboard',
  version: '0.2.0',
  title: 'dashboard:title',
  icon: House,
  emoji: '🏠',
  enabledByDefault: true,
  nav: { order: 0, placement: 'main' },
  routes: [{ index: true, element: <DashboardPage /> }],
  dailyTaskProvider: {
    getTasksForDay: () =>
      Promise.resolve([
        {
          key: 'checkin',
          title: 'dashboard:task.checkin',
          emoji: '🌻',
          xp: 5,
          estimatedMinutes: 1,
        },
      ]),
  },
  i18n: {
    uk: {
      title: 'Головна',
      task: { checkin: 'Привітатись із Соняшиком' },
      today: {
        title: 'Сьогодні',
        progress: 'Виконано {{done}} з {{total}}',
        xp: '{{xp}} / {{goal}} XP',
        continue: 'Продовжити',
        allDone: 'Усе зроблено! 🎉',
        none: 'Поки немає завдань',
      },
      streak: {
        title: 'Серія',
        days_one: '{{count}} день',
        days_few: '{{count}} дні',
        days_many: '{{count}} днів',
        days_other: '{{count}} днів',
        best: 'Рекорд: {{count}}',
        freezes: 'Заморозок: {{count}}',
      },
      level: {
        title: 'Рівень {{level}}',
        total: 'Усього {{xp}} XP',
        toNext: 'До наступного: {{xp}} XP',
      },
      titles: {
        freshman: 'Першокурсниця 📚',
        paralegal: 'Помічниця юриста',
        lawyer: 'Юристка ⚖️',
        advocate: 'Адвокатка',
        judge: 'Суддя 👩‍⚖️',
      },
      quotesTitle: 'Думка дня',
      quotes: [
        'Право — це мистецтво добра і справедливості. — Цельс',
        'Закони мовчать, коли гримить зброя. — Цицерон',
        'Справедливість — це постійна і вічна воля віддавати кожному його право. — Ульпіан',
        'Малими кроками — до великої мети.',
        'Хто володіє знанням, той володіє свободою.',
        'Найкраще навчання — це регулярність, а не героїзм.',
        'Сьогоднішні 10 слів — це завтрашня впевненість у суді.',
      ],
    },
    en: {
      title: 'Home',
      task: { checkin: 'Say hi to Sonyashyk' },
      today: {
        title: 'Today',
        progress: '{{done}} of {{total}} done',
        xp: '{{xp}} / {{goal}} XP',
        continue: 'Continue',
        allDone: 'All done! 🎉',
        none: 'No tasks yet',
      },
      streak: {
        title: 'Streak',
        days_one: '{{count}} day',
        days_other: '{{count}} days',
        best: 'Best: {{count}}',
        freezes: 'Freezes: {{count}}',
      },
      level: {
        title: 'Level {{level}}',
        total: '{{xp}} XP total',
        toNext: '{{xp}} XP to next level',
      },
      titles: {
        freshman: 'Freshman 📚',
        paralegal: 'Paralegal',
        lawyer: 'Lawyer ⚖️',
        advocate: 'Advocate',
        judge: 'Judge 👩‍⚖️',
      },
      quotesTitle: 'Thought of the day',
      quotes: [
        'Law is the art of goodness and fairness. — Celsus',
        'Laws fall silent when arms are raised. — Cicero',
        'Justice is the constant and perpetual will to render to each his right. — Ulpian',
        'Small steps toward a big goal.',
        'Whoever holds knowledge holds freedom.',
        'The best learning is regularity, not heroics.',
        'Today’s 10 words are tomorrow’s confidence in court.',
      ],
    },
  },
};
