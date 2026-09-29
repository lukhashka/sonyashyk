import { getLevel, getLevelTitleKey, xpForLevel } from './levels';
import { effectiveStreak } from './streak';

describe('levels', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(getLevel(0)).toEqual({ level: 1, into: 0, needed: 50 });
  });
  it('levels up at the thresholds', () => {
    expect(xpForLevel(2)).toBe(50);
    expect(getLevel(49).level).toBe(1);
    expect(getLevel(50).level).toBe(2);
    expect(getLevel(150).level).toBe(3);
  });
  it('reports progress inside a level', () => {
    expect(getLevel(80)).toEqual({ level: 2, into: 30, needed: 100 });
  });
  it('maps levels to titles in buckets of three', () => {
    expect(getLevelTitleKey(1)).toBe('miniCat');
    expect(getLevelTitleKey(3)).toBe('seniorCat');
    expect(getLevelTitleKey(5)).toBe('yum');
    expect(getLevelTitleKey(6)).toBe('paralegal');
    expect(getLevelTitleKey(99)).toBe('judge');
  });
});

describe('effectiveStreak', () => {
  const row = (last: string, current = 5, freezes = 0) => ({
    current,
    longest: current,
    last_completed_day: last,
    freezes_available: freezes,
  });
  it('is 0 without data', () => expect(effectiveStreak(null, '2026-03-10')).toBe(0));
  it('keeps the streak if completed today or yesterday', () => {
    expect(effectiveStreak(row('2026-03-10'), '2026-03-10')).toBe(5);
    expect(effectiveStreak(row('2026-03-09'), '2026-03-10')).toBe(5);
  });
  it('drops to 0 after a missed day without freezes', () => {
    expect(effectiveStreak(row('2026-03-08'), '2026-03-10')).toBe(0);
  });
  it('freezes cover missed days', () => {
    expect(effectiveStreak(row('2026-03-08', 5, 1), '2026-03-10')).toBe(5);
    expect(effectiveStreak(row('2026-03-06', 5, 1), '2026-03-10')).toBe(0);
  });
});
