import { supabase } from '@/core/api/supabase';
import type { DateRange } from '@/core/modules/types';
import { seriesRange } from '@/core/stats/series';
import { DEFAULT_WORDS_PER_DAY, clampWordsPerDay } from './selection';

// Plain fetchers with no React/daily-engine imports, so the module index can use them
// (in its daily task provider) without creating an import cycle through the registry.

export async function fetchWordsPerDay(): Promise<number> {
  const { data, error } = await supabase.from('ew_settings').select('words_per_day').maybeSingle();
  if (error) throw error;
  return clampWordsPerDay(data?.words_per_day ?? DEFAULT_WORDS_PER_DAY);
}

/** How many dictionary words this user has never started, and how many reviews are due. */
export async function fetchDailyCounts(today: string): Promise<{ unseen: number; due: number }> {
  const [words, started, due] = await Promise.all([
    supabase.from('ew_words').select('id', { count: 'exact', head: true }),
    supabase.from('ew_user_words').select('word_id', { count: 'exact', head: true }),
    supabase
      .from('ew_user_words')
      .select('word_id', { count: 'exact', head: true })
      .gt('reps', 0)
      .lte('due_on', today),
  ]);
  for (const r of [words, started, due]) if (r.error) throw r.error;
  return { unseen: Math.max(0, (words.count ?? 0) - (started.count ?? 0)), due: due.count ?? 0 };
}

export interface EwStats {
  daily: { day: string; words: number; answers: number; correct: number }[];
  rangeWords: number;
  rangeAnswers: number;
  rangeCorrect: number;
  known: number;
  learning: number;
  unseen: number;
  due: number;
  topics: { topic: string; count: number }[];
}

/** Server-side aggregates for the Stats page (`ew_get_stats`). Long ranges are capped to a year. */
export async function fetchEwStats(range: DateRange): Promise<EwStats> {
  const { from, to } = seriesRange(range);
  const { data, error } = await supabase.rpc('ew_get_stats', { p_from: from, p_to: to });
  if (error) throw error;
  const s = data as {
    daily: EwStats['daily'];
    range_words: number;
    range_answers: number;
    range_correct: number;
    known: number;
    learning: number;
    unseen: number;
    due: number;
    topics: EwStats['topics'];
  };
  return {
    daily: s.daily,
    rangeWords: s.range_words,
    rangeAnswers: s.range_answers,
    rangeCorrect: s.range_correct,
    known: s.known,
    learning: s.learning,
    unseen: s.unseen,
    due: s.due,
    topics: s.topics,
  };
}
