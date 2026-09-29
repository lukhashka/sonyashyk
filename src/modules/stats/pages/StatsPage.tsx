import { Suspense, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/AuthProvider';
import { useStreak, useStudyDay } from '@/core/daily/queries';
import { getLevel } from '@/core/gamification/levels';
import { getEnabledModules } from '@/core/modules/registry';
import type { StatSummaryItem } from '@/core/modules/types';
import { useDailyStats, useStatsSummary } from '@/core/stats/queries';
import {
  bucketByWeek,
  daysBetween,
  fillDays,
  HEATMAP_WEEKS,
  rangeFor,
  seriesRange,
  splitMinutes,
  type RangeKind,
} from '@/core/stats/series';
import { addDays } from '@/core/lib/studyDay';
import { BarTrend } from '@/shared/charts';
import { Card, cn, Skeleton } from '@/shared/ui';
import { AchievementsGallery } from '../components/AchievementsGallery';
import { Heatmap } from '../components/Heatmap';

const RANGES: RangeKind[] = ['week', 'month', 'all'];
const WEEKLY_AFTER_DAYS = 45;

function SummaryCard({
  emoji,
  label,
  value,
  hint,
}: {
  emoji: string;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="font-heading text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </Card>
  );
}

function RangeSwitch({ value, onChange }: { value: RangeKind; onChange: (v: RangeKind) => void }) {
  const { t } = useTranslation('stats');
  return (
    <div
      role="group"
      aria-label={t('range.label')}
      className="inline-flex rounded-full bg-primary-soft p-1"
    >
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={cn(
            'min-h-11 rounded-full px-4 text-sm font-semibold',
            value === r ? 'bg-surface text-primary-ink shadow-soft' : 'text-text-muted',
          )}
        >
          {t(`range.${r}`)}
        </button>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { t, i18n } = useTranslation('stats');
  const { session } = useAuth();
  const today = useStudyDay();
  const [kind, setKind] = useState<RangeKind>('week');
  const range = useMemo(() => (today ? rangeFor(kind, today) : undefined), [kind, today]);

  const summary = useStatsSummary(range);
  const { data: streak } = useStreak();
  const series = range ? seriesRange(range) : undefined;
  const dailyRange = useMemo(() => series, [series?.from, series?.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const daily = useDailyStats(dailyRange);
  const heat = useDailyStats(
    today ? { from: addDays(today, -HEATMAP_WEEKS * 7), to: today } : undefined,
  );

  const modules = getEnabledModules().filter((m) => m.statsProvider);
  const moduleSummaries = useQueries({
    queries: modules.map((m) => ({
      queryKey: ['stats', 'module', m.id, session?.user.id, range?.from, range?.to],
      enabled: Boolean(session && range),
      queryFn: () => m.statsProvider!.getSummary(range!),
    })),
  });

  const heatXp = useMemo(() => new Map((heat.data ?? []).map((d) => [d.day, d.xp])), [heat.data]);

  const xpBars = useMemo(() => {
    if (!dailyRange) return [];
    const filled = fillDays(dailyRange, new Map((daily.data ?? []).map((d) => [d.day, d.xp])));
    const weekly = daysBetween(dailyRange.from, dailyRange.to) > WEEKLY_AFTER_DAYS;
    const fmt = new Intl.DateTimeFormat(i18n.language, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    return (weekly ? bucketByWeek(filled) : filled).map((p) => ({
      label: fmt.format(new Date(`${p.day}T00:00:00Z`)),
      value: p.value,
    }));
  }, [daily.data, dailyRange, i18n.language]);

  if (!range || !today) return <Skeleton className="h-64 w-full" />;

  const s = summary.data;
  const level = getLevel(s?.totalXp ?? 0);
  const { hours, minutes } = splitMinutes(s?.studyMinutes ?? 0);
  const time =
    hours > 0 ? t('summary.hoursMinutes', { hours, minutes }) : t('summary.minutes', { minutes });
  const xpTotal = xpBars.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">{t('heading')} 📊</h1>
        <RangeSwitch value={kind} onChange={setKind} />
      </div>

      <section aria-label={t('summary.title')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <SummaryCard
              emoji="✨"
              label={t('summary.xp')}
              value={s?.totalXp ?? 0}
              hint={t('summary.level', { level: level.level })}
            />
            <SummaryCard
              emoji="🔥"
              label={t('summary.streak')}
              value={t('summary.days', { count: streak?.current ?? 0 })}
              hint={t('summary.best', { count: streak?.longest ?? 0 })}
            />
            <SummaryCard
              emoji="📅"
              label={t('summary.daysStudied')}
              value={s?.daysStudied ?? 0}
              hint={t('summary.tasksDone', { count: s?.tasksDone ?? 0 })}
            />
            <SummaryCard
              emoji="⏱️"
              label={t('summary.time')}
              value={time}
              hint={t('summary.timeHint')}
            />
            {moduleSummaries.flatMap((q, i) =>
              (q.data ?? []).map((item: StatSummaryItem) => (
                <SummaryCard
                  key={`${modules[i]?.id}:${item.key}`}
                  emoji={item.emoji ?? '🌸'}
                  label={t(item.label)}
                  value={item.value}
                />
              )),
            )}
          </>
        )}
      </section>

      <Heatmap today={today} xpByDay={heatXp} />

      <Card>
        <h2 className="mb-2 font-bold">{t('xpChart.title')}</h2>
        {daily.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : daily.isError ? (
          <p className="text-text-muted">{t('xpChart.error')}</p>
        ) : xpTotal === 0 ? (
          <p className="py-8 text-center text-text-muted">{t('xpChart.empty')}</p>
        ) : (
          <BarTrend
            data={xpBars}
            ariaLabel={t('xpChart.aria', { total: xpTotal })}
            valueName="XP"
          />
        )}
      </Card>

      {modules.map((m) =>
        (m.statsProvider?.Widgets ?? []).map((Widget, i) => (
          <Suspense key={`${m.id}:${i}`} fallback={<Skeleton className="h-64 w-full" />}>
            <Widget range={range} />
          </Suspense>
        )),
      )}

      <AchievementsGallery />
    </div>
  );
}
