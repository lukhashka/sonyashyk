import { addDays } from '@/core/lib/studyDay';
import type { Quality, UserWord, WordStatus } from './types';

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
/** A word whose next review is this far away counts as known. */
export const KNOWN_INTERVAL_DAYS = 21;
/** Interval given to a word the user marks as known by hand. */
export const MANUAL_KNOWN_INTERVAL_DAYS = 60;

export type SrsState = Pick<UserWord, 'ease' | 'interval_days' | 'reps' | 'lapses'>;
export type SrsResult = Omit<UserWord, 'word_id'>;

export const newSrsState = (): SrsState => ({
  ease: INITIAL_EASE,
  interval_days: 0,
  reps: 0,
  lapses: 0,
});

export function statusFor(intervalDays: number, reps: number): WordStatus {
  if (reps === 0) return 'learning';
  return intervalDays >= KNOWN_INTERVAL_DAYS ? 'known' : 'learning';
}

/** Light SM-2: 1 day, then 3 days, then interval × ease. A lapse resets to tomorrow. */
export function review(state: SrsState, quality: Quality, today: string): SrsResult {
  let { ease, reps, lapses } = state;
  let interval: number;

  if (quality < 3) {
    lapses += 1;
    reps = 0;
    interval = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else {
    reps += 1;
    interval =
      reps === 1
        ? 1
        : reps === 2
          ? 3
          : Math.max(state.interval_days + 1, Math.round(state.interval_days * ease));
    const miss = 5 - quality;
    ease = Math.max(MIN_EASE, ease + 0.1 - miss * (0.08 + miss * 0.02));
  }

  ease = Math.round(ease * 100) / 100;
  return {
    ease,
    interval_days: interval,
    reps,
    lapses,
    due_on: addDays(today, interval),
    // A lapse always goes back to "learning", even when the previous interval was long.
    status: quality < 3 ? 'learning' : statusFor(interval, reps),
  };
}

/** Manual "I know this word": pushes the next review far into the future. */
export function markKnown(state: SrsState, today: string): SrsResult {
  return {
    ease: state.ease,
    interval_days: MANUAL_KNOWN_INTERVAL_DAYS,
    reps: Math.max(1, state.reps),
    lapses: state.lapses,
    due_on: addDays(today, MANUAL_KNOWN_INTERVAL_DAYS),
    status: 'known',
  };
}

/** Wrong answers in a session → SM-2 quality. */
export function qualityFromMistakes(mistakes: number): Quality {
  if (mistakes === 0) return 4;
  if (mistakes === 1) return 3;
  return 1;
}
