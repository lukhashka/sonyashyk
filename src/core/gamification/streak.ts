import { addDays } from '@/core/lib/studyDay';

export interface StreakRow {
  current: number;
  longest: number;
  last_completed_day: string | null;
  freezes_available: number;
}

/**
 * Streak as it should be *shown* on `today`: the stored value is only updated when a day is
 * completed, so a missed day that freezes can't cover shows as 0 until the next completion.
 */
export function effectiveStreak(row: StreakRow | null | undefined, today: string): number {
  if (!row || !row.last_completed_day) return 0;
  const missed = daysBetween(row.last_completed_day, addDays(today, -1));
  // last completed yesterday or today: missed <= 0. Otherwise freezes may cover the gap.
  if (missed <= 0) return row.current;
  return missed <= row.freezes_available ? row.current : 0;
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
