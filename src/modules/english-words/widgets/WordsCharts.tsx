import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/AuthProvider';
import type { DateRange } from '@/core/modules/types';
import { bucketByWeek, daysBetween, eachDay, percent, seriesRange } from '@/core/stats/series';
import { BarTrend, LineTrend, type ChartPoint } from '@/shared/charts';
import { Card, EmptyState, Progress, Skeleton } from '@/shared/ui';
import { fetchEwStats } from '../lib/fetchers';

/** Ranges longer than a month are charted per week to keep the bars readable. */
const WEEKLY_AFTER_DAYS = 45;

export function useEwStats(range: DateRange) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['ew', 'stats', session?.user.id, range.from, range.to],
    enabled: Boolean(session),
    queryFn: () => fetchEwStats(range),
  });
}

export default function WordsCharts({ range }: { range: DateRange }) {
  const { t, i18n } = useTranslation('english-words');
  const { data, isPending, isError } = useEwStats(range);
  const series = seriesRange(range);
  const weekly = daysBetween(series.from, series.to) > WEEKLY_AFTER_DAYS;

  const { words, accuracy, total } = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    const label = (day: string) => fmt.format(new Date(`${day}T00:00:00Z`));
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const days = eachDay(series.from, series.to);

    const wordsDaily = days.map((day) => ({ day, value: byDay.get(day)?.words ?? 0 }));
    const wordsPoints: ChartPoint[] = (weekly ? bucketByWeek(wordsDaily) : wordsDaily).map((p) => ({
      label: label(p.day),
      value: p.value,
    }));

    // Accuracy is a ratio, so weeks are pooled from raw counts rather than averaging daily %.
    const accPoints: ChartPoint[] = weekly
      ? bucketByWeek(days.map((day) => ({ day, value: byDay.get(day)?.answers ?? 0 }))).map(
          (w, i) => {
            const correct = bucketByWeek(
              days.map((day) => ({ day, value: byDay.get(day)?.correct ?? 0 })),
            )[i];
            return { label: label(w.day), value: percent(correct?.value ?? 0, w.value) };
          },
        )
      : days.map((day) => {
          const d = byDay.get(day);
          return { label: label(day), value: d ? percent(d.correct, d.answers) : null };
        });

    return {
      words: wordsPoints,
      accuracy: accPoints,
      total: wordsDaily.reduce((sum, p) => sum + p.value, 0),
    };
  }, [data, series.from, series.to, weekly, i18n.language]);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <EmptyState emoji="🌧️" title={t('stats.error')} />;

  const topMax = Math.max(1, ...data.topics.map((x) => x.count));

  return (
    <div className="grid gap-4">
      <Card>
        <h3 className="mb-2 font-bold">{t('stats.wordsTitle')}</h3>
        {data.rangeAnswers === 0 ? (
          <p className="py-6 text-center text-text-muted">{t('stats.empty')}</p>
        ) : (
          <BarTrend
            data={words}
            ariaLabel={t('stats.wordsAria', { total })}
            valueName={t('stats.wordsName')}
          />
        )}
      </Card>
      {data.rangeAnswers > 0 && (
        <Card>
          <h3 className="mb-2 font-bold">{t('stats.accuracyTitle')}</h3>
          <LineTrend
            data={accuracy}
            max={100}
            ariaLabel={t('stats.accuracyAria')}
            valueName={t('stats.accuracyName')}
          />
        </Card>
      )}
      <Card>
        <h3 className="mb-3 font-bold">{t('stats.topicsTitle')}</h3>
        {data.topics.length === 0 ? (
          <p className="text-text-muted">{t('stats.topicsEmpty')}</p>
        ) : (
          <ul className="grid gap-3">
            {data.topics.map(({ topic, count }) => {
              const name = t(`topics.${topic}`, { defaultValue: topic });
              return (
                <li key={topic} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{name}</span>
                    <span className="font-semibold text-text-muted">{count}</span>
                  </div>
                  <Progress value={count} max={topMax} label={name} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
