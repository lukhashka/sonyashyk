import { supabase } from '@/core/api/supabase';
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
