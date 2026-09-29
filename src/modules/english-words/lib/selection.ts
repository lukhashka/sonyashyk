import type { UserWord, Word } from './types';

export const MIN_WORDS_PER_DAY = 5;
export const MAX_WORDS_PER_DAY = 20;
export const DEFAULT_WORDS_PER_DAY = 10;
export const MAX_REVIEW_BATCH = 20;

/** Next words the user has never seen, in dictionary order (deterministic within a day). */
export function pickNewWords(words: Word[], userWords: UserWord[], count: number): Word[] {
  const seen = new Set(userWords.map((u) => u.word_id));
  return words
    .filter((w) => !seen.has(w.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.term.localeCompare(b.term))
    .slice(0, count);
}

/** Words due for review today or earlier, most overdue first. */
export function pickDueWords(
  words: Word[],
  userWords: UserWord[],
  today: string,
  limit = MAX_REVIEW_BATCH,
): Word[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  return userWords
    .filter((u) => u.reps > 0 && u.due_on <= today && byId.has(u.word_id))
    .sort((a, b) => a.due_on.localeCompare(b.due_on))
    .slice(0, limit)
    .map((u) => byId.get(u.word_id)!);
}

export function clampWordsPerDay(n: number): number {
  return Math.min(MAX_WORDS_PER_DAY, Math.max(MIN_WORDS_PER_DAY, Math.round(n)));
}
