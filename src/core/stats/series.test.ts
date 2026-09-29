import {
  ALL_TIME_FROM,
  bucketByWeek,
  buildHeatmap,
  eachDay,
  fillDays,
  heatLevel,
  percent,
  rangeFor,
  seriesRange,
  splitMinutes,
  weekStart,
} from './series';

describe('stats series helpers', () => {
  it('builds week / month / all-time ranges ending today', () => {
    expect(rangeFor('week', '2026-09-29')).toEqual({ from: '2026-09-23', to: '2026-09-29' });
    expect(rangeFor('month', '2026-09-29')).toEqual({ from: '2026-08-31', to: '2026-09-29' });
    expect(rangeFor('all', '2026-09-29')).toEqual({ from: ALL_TIME_FROM, to: '2026-09-29' });
  });

  it('caps the charted part of "all time" to a year', () => {
    const r = seriesRange(rangeFor('all', '2026-09-29'));
    expect(r.to).toBe('2026-09-29');
    expect(eachDay(r.from, r.to)).toHaveLength(365);
    expect(seriesRange(rangeFor('week', '2026-09-29'))).toEqual(rangeFor('week', '2026-09-29'));
  });

  it('fills gaps with zeros', () => {
    const out = fillDays({ from: '2026-09-27', to: '2026-09-29' }, new Map([['2026-09-28', 15]]));
    expect(out).toEqual([
      { day: '2026-09-27', value: 0 },
      { day: '2026-09-28', value: 15 },
      { day: '2026-09-29', value: 0 },
    ]);
  });

  it('finds Monday and buckets by week', () => {
    expect(weekStart('2026-09-29')).toBe('2026-09-28'); // Tuesday
    expect(weekStart('2026-09-27')).toBe('2026-09-21'); // Sunday belongs to the previous week
    const weeks = bucketByWeek(
      fillDays(
        { from: '2026-09-27', to: '2026-09-29' },
        new Map([
          ['2026-09-27', 1],
          ['2026-09-28', 2],
          ['2026-09-29', 4],
        ]),
      ),
    );
    expect(weeks).toEqual([
      { day: '2026-09-21', value: 1 },
      { day: '2026-09-28', value: 6 },
    ]);
  });

  it('computes percentages without dividing by zero', () => {
    expect(percent(7, 8)).toBe(88);
    expect(percent(0, 0)).toBeNull();
  });

  it('maps XP to heat levels relative to the busiest day', () => {
    expect(heatLevel(0, 40)).toBe(0);
    expect(heatLevel(1, 40)).toBe(1);
    expect(heatLevel(20, 40)).toBe(2);
    expect(heatLevel(30, 40)).toBe(3);
    expect(heatLevel(40, 40)).toBe(4);
    expect(heatLevel(5, 0)).toBe(0);
  });

  it('builds a Monday-first heatmap ending in the current week', () => {
    const grid = buildHeatmap(
      '2026-09-29',
      3,
      new Map([
        ['2026-09-29', 30],
        ['2026-09-21', 15],
      ]),
    );
    expect(grid).toHaveLength(3);
    expect(grid.every((col) => col.length === 7)).toBe(true);
    expect(grid[0]?.[0]?.date).toBe('2026-09-14');
    const last = grid[2] ?? [];
    expect(last[0]?.date).toBe('2026-09-28');
    expect(last[1]).toMatchObject({ date: '2026-09-29', xp: 30, level: 4, future: false });
    expect(last[2]).toMatchObject({ date: '2026-09-30', future: true, level: 0 });
    expect(grid[1]?.[0]).toMatchObject({ date: '2026-09-21', xp: 15, level: 2 });
  });

  it('splits minutes into hours and minutes', () => {
    expect(splitMinutes(135)).toEqual({ hours: 2, minutes: 15 });
    expect(splitMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
  });
});
