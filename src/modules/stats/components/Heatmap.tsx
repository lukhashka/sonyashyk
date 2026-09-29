import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildHeatmap, HEATMAP_WEEKS, type HeatCell } from '@/core/stats/series';
import { Card } from '@/shared/ui';

/** Mix of the brand rose into the muted surface: level 0 is an empty slot, 4 the fullest rose. */
const LEVEL_BG: Record<HeatCell['level'], string> = {
  0: 'var(--color-surface-muted)',
  1: 'color-mix(in srgb, var(--color-primary) 35%, var(--color-surface-muted))',
  2: 'color-mix(in srgb, var(--color-primary) 60%, var(--color-surface-muted))',
  3: 'var(--color-primary)',
  4: 'var(--color-primary-ink)',
};

interface Props {
  today: string;
  xpByDay: Map<string, number>;
}

/** GitHub-style activity map of XP per study day (Monday → Sunday rows, oldest week first). */
export function Heatmap({ today, xpByDay }: Props) {
  const { t, i18n } = useTranslation('stats');
  const grid = useMemo(() => buildHeatmap(today, HEATMAP_WEEKS, xpByDay), [today, xpByDay]);

  const fmt = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', timeZone: 'UTC' });
  const active = grid.flat().filter((c) => c.xp > 0).length;
  const total = grid.flat().reduce((sum, c) => sum + c.xp, 0);
  const firstWeek = grid[0] ?? [];

  return (
    <Card>
      <h2 className="font-bold">{t('heatmap.title')}</h2>
      <p className="mb-3 text-sm text-text-muted">
        {t('heatmap.subtitle', { weeks: HEATMAP_WEEKS })}
      </p>
      <div
        role="img"
        aria-label={t('heatmap.aria', { days: active, xp: total, weeks: HEATMAP_WEEKS })}
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        <div
          className="flex shrink-0 flex-col gap-[3px] pr-1 text-[10px] text-text-muted"
          aria-hidden="true"
        >
          {firstWeek.map((c, i) => (
            <span key={c.date} className="flex h-3.5 items-center leading-none">
              {i % 2 === 0 ? weekday.format(new Date(`${c.date}T00:00:00Z`)) : ''}
            </span>
          ))}
        </div>
        {grid.map((week) => (
          <div key={week[0]?.date} className="flex shrink-0 flex-col gap-[3px]" aria-hidden="true">
            {week.map((cell) => (
              <span
                key={cell.date}
                title={
                  cell.future
                    ? undefined
                    : t('heatmap.cell', {
                        date: fmt.format(new Date(`${cell.date}T00:00:00Z`)),
                        xp: cell.xp,
                      })
                }
                className={`size-3.5 rounded-[4px] ${cell.future ? 'opacity-0' : ''} ${
                  cell.date === today ? 'ring-1 ring-primary-ink' : ''
                }`}
                style={{ background: LEVEL_BG[cell.level] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div
        className="mt-2 flex items-center justify-end gap-1.5 text-xs text-text-muted"
        aria-hidden="true"
      >
        {t('heatmap.less')}
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className="size-3.5 rounded-[4px]"
            style={{ background: LEVEL_BG[level] }}
          />
        ))}
        {t('heatmap.more')}
      </div>
    </Card>
  );
}
