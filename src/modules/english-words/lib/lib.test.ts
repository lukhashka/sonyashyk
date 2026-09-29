import { describe, expect, it } from 'vitest';
import { buildMatchPairs, buildQuestions, isCorrect, isTypedCorrect, makeGap } from './quiz';
import { accuracy, buildOutcomes } from './session';
import { clampWordsPerDay, pickDueWords, pickNewWords } from './selection';
import { KNOWN_INTERVAL_DAYS, markKnown, newSrsState, qualityFromMistakes, review } from './srs';
import type { UserWord, Word } from './types';

const word = (id: string, over: Partial<Word> = {}): Word => ({
  id,
  term: `term${id}`,
  pos: 'noun',
  ipa: '/x/',
  translation_uk: `переклад ${id}`,
  definition_en: 'def',
  example_en: `The ${over.term ?? `term${id}`} was clear.`,
  topics: ['contract'],
  level: 'B2',
  sort_order: Number(id),
  owner_id: null,
  ...over,
});

describe('SRS', () => {
  const today = '2026-01-10';

  it('schedules 1 day, then 3 days, then grows by ease', () => {
    const r1 = review(newSrsState(), 4, today);
    expect([r1.interval_days, r1.due_on, r1.reps]).toEqual([1, '2026-01-11', 1]);
    const r2 = review(r1, 4, today);
    expect(r2.interval_days).toBe(3);
    const r3 = review(r2, 4, today);
    expect(r3.interval_days).toBe(Math.round(3 * r2.ease));
    expect(r3.interval_days).toBeGreaterThan(r2.interval_days);
  });

  it('resets on a lapse and lowers ease, never below the floor', () => {
    let s = review(review(newSrsState(), 4, today), 4, today);
    s = review(s, 1, today);
    expect([s.reps, s.interval_days, s.lapses, s.status]).toEqual([0, 1, 1, 'learning']);
    for (let i = 0; i < 20; i++) s = review(s, 1, today);
    expect(s.ease).toBe(1.3);
  });

  it('turns known once the interval is long enough', () => {
    let s = review(newSrsState(), 5, today);
    while (s.interval_days < KNOWN_INTERVAL_DAYS) s = review(s, 5, today);
    expect(s.status).toBe('known');
  });

  it('lets the user mark a word as known by hand', () => {
    const k = markKnown(newSrsState(), today);
    expect(k.status).toBe('known');
    expect(k.due_on > today).toBe(true);
  });

  it('maps mistakes to quality', () => {
    expect([0, 1, 2, 5].map(qualityFromMistakes)).toEqual([4, 3, 1, 1]);
  });
});

describe('selection', () => {
  const words = [word('3'), word('1'), word('2')];
  const uw = (word_id: string, due_on: string, reps = 1): UserWord => ({
    word_id,
    ease: 2.5,
    interval_days: 1,
    due_on,
    reps,
    lapses: 0,
    status: 'learning',
  });

  it('picks unseen words in dictionary order', () => {
    expect(pickNewWords(words, [uw('1', '2026-01-01')], 5).map((w) => w.id)).toEqual(['2', '3']);
    expect(pickNewWords(words, [], 2).map((w) => w.id)).toEqual(['1', '2']);
  });

  it('picks due words, most overdue first, skipping future ones', () => {
    const due = pickDueWords(
      words,
      [uw('1', '2026-01-09'), uw('2', '2026-01-05'), uw('3', '2026-02-01')],
      '2026-01-10',
    );
    expect(due.map((w) => w.id)).toEqual(['2', '1']);
  });

  it('clamps words per day to 5–20', () => {
    expect([1, 10, 99].map(clampWordsPerDay)).toEqual([5, 10, 20]);
  });
});

describe('quiz', () => {
  const pool = ['1', '2', '3', '4', '5', '6'].map((id) => word(id));

  it('builds one question per word with the answer among unique options', () => {
    const qs = buildQuestions(pool.slice(0, 4), pool);
    expect(qs).toHaveLength(4);
    for (const q of qs.filter((x) => x.kind !== 'type')) {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('accepts typed answers with case, "to" and one typo tolerance', () => {
    expect(isTypedCorrect('  Contract ', 'contract')).toBe(true);
    expect(isTypedCorrect('breach', 'to breach')).toBe(true);
    expect(isTypedCorrect('injuncton', 'injunction')).toBe(true);
    expect(isTypedCorrect('tort', 'toot')).toBe(false);
    expect(isTypedCorrect('', 'tort')).toBe(false);
  });

  it('checks multiple-choice answers exactly', () => {
    const q = buildQuestions([pool[0]!], pool)[0]!;
    expect(isCorrect(q, q.answer)).toBe(true);
    expect(isCorrect(q, 'nope')).toBe(false);
  });

  it('blanks the term (and simple inflections) in the example', () => {
    const w = word('1', { term: 'liability', example_en: 'The company denied liability.' });
    expect(makeGap(w)).toBe('The company denied _____.');
    const inflected = word('2', { term: 'breach', example_en: 'He breached the contract.' });
    expect(makeGap(inflected)).toBe('He _____ the contract.');
    expect(makeGap(word('3', { example_en: 'Nothing here.' }))).toBeNull();
  });

  it('makes at most N distinct match pairs', () => {
    const pairs = buildMatchPairs(pool, 4);
    expect(pairs).toHaveLength(4);
    expect(new Set(pairs.map((p) => p.wordId)).size).toBe(4);
  });
});

describe('session', () => {
  const words = [word('1'), word('2')];
  const log = [
    { wordId: '1', kind: 'choose' as const, correct: true },
    { wordId: '2', kind: 'type' as const, correct: false },
    { wordId: '2', kind: 'match' as const, correct: false },
  ];

  it('grades each word by its mistakes and schedules the next review', () => {
    const [a, b] = buildOutcomes(words, [], log, '2026-01-10');
    expect(a!.srs).toMatchObject({ reps: 1, due_on: '2026-01-11', lapses: 0 });
    expect(b!.srs).toMatchObject({ reps: 0, lapses: 1, due_on: '2026-01-11', status: 'learning' });
  });

  it('continues from the saved state for reviewed words', () => {
    const saved: UserWord = {
      word_id: '1',
      ease: 2.5,
      interval_days: 3,
      due_on: '2026-01-10',
      reps: 2,
      lapses: 0,
      status: 'learning',
    };
    const [a] = buildOutcomes([words[0]!], [saved], [log[0]!], '2026-01-10');
    expect(a!.srs.reps).toBe(3);
    expect(a!.srs.interval_days).toBeGreaterThan(3);
  });

  it('computes accuracy', () => {
    expect(accuracy(log)).toBe(33);
    expect(accuracy([])).toBe(0);
  });
});
