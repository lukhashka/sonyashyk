import type { Word } from './types';

export type QuestionKind = 'choose' | 'type' | 'gap';

export interface Question {
  kind: QuestionKind;
  wordId: string;
  /** What is shown to the user (the term, the UA meaning, or the example with a blank). */
  prompt: string;
  answer: string;
  /** Multiple-choice options (shuffled, includes the answer); empty for typing. */
  options: string[];
}

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

const stripTo = (s: string) => s.replace(/^to /, '');

/** Typed answers: case/punctuation-insensitive, optional leading "to", one typo for long terms. */
export function isTypedCorrect(input: string, answer: string): boolean {
  const a = stripTo(normalize(input));
  const b = stripTo(normalize(answer));
  if (!a) return false;
  if (a === b) return true;
  return b.length >= 7 && distance(a, b) <= 1;
}

/** Replaces the term inside its example with a blank; null if the term is not found. */
export function makeGap(word: Word): string | null {
  const base = word.term.replace(/^to /, '');
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow common inflections (contracts, breached, liabilities) by ignoring a final e/y.
  const stem = /[ey]$/i.test(base) && !base.includes(' ') ? escaped.slice(0, -1) : escaped;
  const re = new RegExp(`\\b${stem}\\w{0,4}\\b`, 'i');
  return re.test(word.example_en) ? word.example_en.replace(re, '_____') : null;
}

function distractors(
  word: Word,
  pool: Word[],
  count: number,
  pick: (w: Word) => string,
  rng: Rng,
): string[] {
  const seen = new Set([pick(word)]);
  const out: string[] = [];
  for (const w of shuffle(pool, rng)) {
    const v = pick(w);
    if (w.id === word.id || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length === count) break;
  }
  return out;
}

/** One question per word, rotating kinds so a session feels varied. */
export function buildQuestions(words: Word[], pool: Word[], rng: Rng = Math.random): Question[] {
  const kinds: QuestionKind[] = ['choose', 'type', 'gap'];
  const questions = words.map((word, i): Question => {
    let kind = kinds[i % kinds.length]!;
    const gap = kind === 'gap' ? makeGap(word) : null;
    if (kind === 'gap' && !gap) kind = 'choose';

    if (kind === 'type') {
      return { kind, wordId: word.id, prompt: word.translation_uk, answer: word.term, options: [] };
    }
    if (kind === 'gap') {
      const options = shuffle([word.term, ...distractors(word, pool, 3, (w) => w.term, rng)], rng);
      return { kind, wordId: word.id, prompt: gap!, answer: word.term, options };
    }
    const options = shuffle(
      [word.translation_uk, ...distractors(word, pool, 3, (w) => w.translation_uk, rng)],
      rng,
    );
    return { kind, wordId: word.id, prompt: word.term, answer: word.translation_uk, options };
  });
  return shuffle(questions, rng);
}

export function isCorrect(q: Question, input: string): boolean {
  return q.kind === 'type' ? isTypedCorrect(input, q.answer) : input === q.answer;
}

export interface MatchPair {
  wordId: string;
  term: string;
  translation: string;
}

export function buildMatchPairs(words: Word[], max = 5, rng: Rng = Math.random): MatchPair[] {
  return shuffle(words, rng)
    .slice(0, max)
    .map((w) => ({ wordId: w.id, term: w.term, translation: w.translation_uk }));
}
