import type { StudyDay } from '@/core/modules/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar date + hour in a timezone, via Intl (no date library needed). */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') };
}

/** The "study day": the user's local date, rolled back until `rolloverHour` (default 04:00). */
export function getStudyDay(now: Date, timeZone: string, rolloverHour = 4): StudyDay {
  const { y, m, d, h } = zonedParts(now, timeZone);
  const day = new Date(Date.UTC(y, m - 1, d));
  if (h < rolloverHour) day.setUTCDate(day.getUTCDate() - 1);
  return { date: `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}` };
}

/** Shifts an ISO date (yyyy-MM-dd) by whole days. */
export function addDays(isoDate: string, days: number): string {
  const [y = 0, m = 1, d = 1] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** The 7 days ending at `isoDate`, oldest first. */
export function lastSevenDays(isoDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(isoDate, i - 6));
}
