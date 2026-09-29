import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Flame } from 'lucide-react';
import { useProfile } from '@/core/auth/profile';
import { useDailyPlan, useStreak, useWeekDays, useXpSummary } from '@/core/daily/queries';
import { getLevel, getLevelTitleKey } from '@/core/gamification/levels';
import { getEnabledModules } from '@/core/modules/registry';
import { Card, Emoji, Progress, Ring, Skeleton } from '@/shared/ui';
import { pickQuote } from '../quotes';

function TodayCard() {
  const { t } = useTranslation('dashboard');
  const { data: plan } = useDailyPlan();
  const { data: xp } = useXpSummary();
  const { data: profile } = useProfile();

  const total = plan?.tasks.length ?? 0;
  const done = plan?.tasks.filter((x) => x.completed_at).length ?? 0;
  const next = plan?.tasks.find((x) => !x.completed_at);
  const goal = profile?.daily_goal_xp ?? 0;

  return (
    <Card className="flex flex-col items-center gap-4 bg-[image:var(--gradient-hero)] sm:flex-row">
      <Ring value={done} max={total} label={t('today.title')} size={120}>
        <span className="font-heading text-2xl font-bold">
          {done}/{total}
        </span>
      </Ring>
      <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
        <h2 className="text-xl font-bold">{t('today.title')}</h2>
        <p className="text-text-muted">
          {total === 0
            ? t('today.none')
            : next
              ? t('today.progress', { done, total })
              : t('today.allDone')}
        </p>
        <p className="text-sm text-text-muted">{t('today.xp', { xp: xp?.todayXp ?? 0, goal })}</p>
        <Link
          to={next?.route ?? '/m/today'}
          className="inline-flex min-h-11 w-fit items-center self-center rounded-full bg-primary px-5 font-semibold text-[#3d2c2e] shadow-soft sm:self-start"
        >
          {t('today.continue')}
        </Link>
      </div>
    </Card>
  );
}

function StreakCard() {
  const { t, i18n } = useTranslation('dashboard');
  const { data: streak } = useStreak();
  const { data: week } = useWeekDays();
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow', timeZone: 'UTC' });

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Flame
          size={32}
          strokeWidth={1.75}
          className={`text-primary ${(streak?.current ?? 0) > 0 ? 'flame-alive' : ''}`}
          aria-hidden="true"
        />
        <div>
          <h2 className="font-bold">{t('streak.title')}</h2>
          <p className="text-2xl font-bold">{t('streak.days', { count: streak?.current ?? 0 })}</p>
        </div>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        {t('streak.best', { count: streak?.longest ?? 0 })}
        {streak && streak.freezes > 0 ? ` · ${t('streak.freezes', { count: streak.freezes })}` : ''}
      </p>
      <ul className="mt-3 flex justify-between gap-1" aria-hidden="true">
        {(week ?? []).map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1 text-xs text-text-muted">
            <span
              className={`flex size-8 items-center justify-center rounded-full ${
                d.done ? 'bg-primary' : 'bg-primary-soft'
              }`}
            >
              {d.done && <Emoji symbol="✓" />}
            </span>
            {weekday.format(new Date(`${d.date}T00:00:00Z`))}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LevelCard() {
  const { t } = useTranslation('dashboard');
  const { data: xp } = useXpSummary();
  const info = getLevel(xp?.totalXp ?? 0);

  return (
    <Card>
      <h2 className="font-bold">{t('level.title', { level: info.level })}</h2>
      <p className="text-primary-ink">{t(`titles.${getLevelTitleKey(info.level)}`)}</p>
      <div className="my-3">
        <Progress
          value={info.into}
          max={info.needed}
          label={t('level.title', { level: info.level })}
        />
      </div>
      <p className="text-sm text-text-muted">
        {t('level.total', { xp: xp?.totalXp ?? 0 })} ·{' '}
        {t('level.toNext', { xp: info.needed - info.into })}
      </p>
    </Card>
  );
}

function QuoteCard() {
  const { t } = useTranslation('dashboard');
  const { data: plan } = useDailyPlan();
  const quotes = t('quotes', { returnObjects: true }) as string[];
  if (!plan || !Array.isArray(quotes)) return null;
  return (
    <Card>
      <h2 className="text-sm font-bold text-text-muted">{t('quotesTitle')}</h2>
      <p className="mt-1 font-heading text-lg">{pickQuote(quotes, plan.studyDay)}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const widgets = getEnabledModules().flatMap((m) => m.dashboardWidgets ?? []);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <TodayCard />
      <div className="grid gap-4 md:grid-cols-2">
        <StreakCard />
        <LevelCard />
      </div>
      <QuoteCard />
      {widgets.map(({ id, Component }) => (
        <Suspense key={id} fallback={<Skeleton className="h-24 w-full" />}>
          <Component />
        </Suspense>
      ))}
    </div>
  );
}
