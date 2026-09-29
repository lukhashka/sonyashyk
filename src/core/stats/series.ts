import { addDays } from '@/core/lib/studyDay';
import type { DateRange } from '@/core/modules/types';

export type RangeKind = 'week' | 'month' | 'all';

/** Earliest date used for "all time" summaries. */
export const ALL_TIME_FROM = '1970-01-01';
/** The daily-series RPCs accept at most ~13 months; charts and the heatmap stay inside that. */
export const MAX_SERIES_DAYS = 365;
export const HEATMAP_WEEKS = 26;

export function rangeFor(kind: RangeKind, today: string): DateRange {
  if (kind === 'week') return { from: addDays(today, -6), to: today };
  if (kind === 'month') return { from: addDays(today, -29), to: today };
  return { from: ALL_TIME_FROM, to: today };
}

/** The part of a range that can be charted day by day (all time is capped to the last year). */
export function seriesRange(range: DateRange): DateRange {
  const earliest = addDays(range.to, -(MAX_SERIES_DAYS - 1));
  return { from: range.from < earliest ? earliest : range.from, to: range.to };
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Every date from `from` to `to` inclusive. */
export function eachDay(from: string, to: string): string[] {
  const n = Math.max(0, daysBetween(from, to)) + 1;
  return Array.from({ length: n }, (_, i) => addDays(from, i));
}

export interface DayValue {
  day: string;
  value: number;
}

/** Fills gaps in a sparse per-day series with zeros. */
export function fillDays(range: DateRange, sparse: Map<string, number>): DayValue[] {
  return eachDay(range.from, range.to).map((day) => ({ day, value: sparse.get(day) ?? 0 }));
}

/** Monday of the week containing `isoDate`. */
export function weekStart(isoDate: string): string {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(isoDate, -((dow + 6) % 7));
}

/** Sums a daily series into Monday-based weeks (used when a range is too long for daily bars). */
export function bucketByWeek(days: DayValue[]): DayValue[] {
  const out = new Map<string, number>();
  for (const { day, value } of days) {
    const key = weekStart(day);
    out.set(key, (out.get(key) ?? 0) + value);
  }
  return [...out.entries()].map(([day, value]) => ({ day, value }));
}

/** Percentage 0–100, rounded; `null` when there is nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** 0 = no activity, 1–4 = increasing intensity relative to the busiest day. */
export function heatLevel(xp: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((xp / max) * 4))) as 1 | 2 | 3 | 4;
}

export interface HeatCell {
  date: string;
  xp: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** After `today` (the rest of the current week) — rendered as an empty slot. */
  future: boolean;
}

/**
 * GitHub-style grid: `weeks` columns of 7 cells (Monday → Sunday), the last column being
 * the week that contains `today`.
 */
export function buildHeatmap(
  today: string,
  weeks: number,
  xpByDay: Map<string, number>,
): HeatCell[][] {
  const start = addDays(weekStart(today), -7 * (weeks - 1));
  let max = 0;
  for (let i = 0; i < weeks * 7; i++) max = Math.max(max, xpByDay.get(addDays(start, i)) ?? 0);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const future = date > today;
      const xp = future ? 0 : (xpByDay.get(date) ?? 0);
      return { date, xp, level: heatLevel(xp, max), future };
    }),
  );
}

/** "1 год 20 хв" style is locale-specific, so this returns the parts for i18n to format. */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  const m = Math.max(0, Math.round(total));
  return { hours: Math.floor(m / 60), minutes: m % 60 };
}
