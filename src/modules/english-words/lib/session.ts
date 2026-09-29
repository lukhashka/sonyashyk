import { newSrsState, qualityFromMistakes, review } from './srs';
import type { ReviewEntry, SessionOutcome } from './queries';
import type { UserWord, Word } from './types';

/** Wrong answers per word, counted over every practice question and match attempt. */
export function countMistakes(log: ReviewEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of log) if (!l.correct) m.set(l.wordId, (m.get(l.wordId) ?? 0) + 1);
  return m;
}

/** Turns a finished session into new SRS states (new words start from a fresh state). */
export function buildOutcomes(
  words: Word[],
  userWords: UserWord[],
  log: ReviewEntry[],
  today: string,
): SessionOutcome[] {
  const state = new Map(userWords.map((u) => [u.word_id, u]));
  const mistakes = countMistakes(log);
  return words.map((w) => ({
    wordId: w.id,
    srs: review(
      state.get(w.id) ?? newSrsState(),
      qualityFromMistakes(mistakes.get(w.id) ?? 0),
      today,
    ),
  }));
}

export function accuracy(log: ReviewEntry[]): number {
  if (log.length === 0) return 0;
  return Math.round((log.filter((l) => l.correct).length / log.length) * 100);
}
