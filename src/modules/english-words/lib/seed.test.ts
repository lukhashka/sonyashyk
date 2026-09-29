import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeGap } from './quiz';
import type { Word } from './types';

const dir = 'supabase/seed';
const words: Word[] = readdirSync(dir)
  .filter((f) => /^ew_words_.*\.txt$/.test(f))
  .sort()
  .flatMap((f) => readFileSync(`${dir}/${f}`, 'utf8').split(/\r?\n/))
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l, i) => {
    const [term, pos, ipa, uk, def, example, topics, level] = l.split('|').map((s) => s.trim());
    return {
      id: String(i),
      term: term!,
      pos: pos!,
      ipa: ipa!,
      translation_uk: uk!,
      definition_en: def!,
      example_en: example!,
      topics: topics!.split(','),
      level: level!,
      sort_order: i,
      owner_id: null,
    };
  });

describe('seed dictionary', () => {
  it('has at least 300 unique, fully filled words', () => {
    expect(words.length).toBeGreaterThanOrEqual(300);
    expect(new Set(words.map((w) => w.term.toLowerCase())).size).toBe(words.length);
    for (const w of words) {
      expect(w.translation_uk, w.term).not.toBe('');
      expect(w.definition_en, w.term).not.toBe('');
      expect(w.example_en, w.term).not.toBe('');
    }
  });

  it('covers both Legal English and the academic deck', () => {
    expect(words.filter((w) => !w.topics.includes('academic')).length).toBeGreaterThan(200);
    expect(words.filter((w) => w.topics.includes('academic')).length).toBeGreaterThan(50);
  });

  it('lets most words be used in fill-the-gap exercises', () => {
    const gappable = words.filter((w) => makeGap(w) !== null).length;
    expect(gappable / words.length).toBeGreaterThan(0.8);
  });
});
