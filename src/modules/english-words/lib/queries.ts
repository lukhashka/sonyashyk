import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/api/supabase';
import { useAuth } from '@/core/auth/AuthProvider';
import { useStudyDay } from '@/core/daily/queries';
import { fetchWordsPerDay } from './fetchers';
import { DEFAULT_WORDS_PER_DAY, clampWordsPerDay } from './selection';
import { markKnown, newSrsState, type SrsResult } from './srs';
import type { UserWord, Word } from './types';

const WORD_COLUMNS =
  'id, owner_id, term, pos, ipa, translation_uk, definition_en, example_en, topics, level, sort_order';
const USER_WORD_COLUMNS = 'word_id, ease, interval_days, due_on, reps, lapses, status';

// --- hooks ------------------------------------------------------------------------------------

function useUserId() {
  return useAuth().session?.user.id;
}

/** Shared dictionary + the user's own custom words (RLS decides what is visible). */
export function useDictionary() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['ew', 'words', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Word[]> => {
      const { data, error } = await supabase
        .from('ew_words')
        .select(WORD_COLUMNS)
        .order('sort_order')
        .order('term')
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Word[];
    },
  });
}

export function useUserWords() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['ew', 'user-words', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<UserWord[]> => {
      const { data, error } = await supabase
        .from('ew_user_words')
        .select(USER_WORD_COLUMNS)
        .limit(5000);
      if (error) throw error;
      return ((data ?? []) as (Omit<UserWord, 'ease'> & { ease: number | string })[]).map((u) => ({
        ...u,
        ease: Number(u.ease),
      }));
    },
  });
}

export function useWordsPerDay() {
  const userId = useUserId();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ew', 'settings', userId],
    enabled: Boolean(userId),
    queryFn: fetchWordsPerDay,
  });
  const save = useMutation({
    mutationFn: async (n: number) => {
      const { error } = await supabase
        .from('ew_settings')
        .upsert({ user_id: userId, words_per_day: clampWordsPerDay(n) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ew', 'settings'] }),
  });
  return { value: query.data ?? DEFAULT_WORDS_PER_DAY, isPending: query.isPending, save };
}

export interface SessionOutcome {
  wordId: string;
  srs: SrsResult;
}
export interface ReviewEntry {
  wordId: string;
  kind: 'choose' | 'type' | 'gap' | 'match';
  correct: boolean;
}

/** Persists SRS state and the answer log at the end of a session. */
export function useSaveSession() {
  const userId = useUserId();
  const day = useStudyDay();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outcomes: SessionOutcome[]; log: ReviewEntry[] }) => {
      if (!userId || !day) throw new Error('Not ready');
      if (input.outcomes.length > 0) {
        const { error } = await supabase.from('ew_user_words').upsert(
          input.outcomes.map((o) => ({
            user_id: userId,
            word_id: o.wordId,
            ...o.srs,
            updated_at: new Date().toISOString(),
          })),
        );
        if (error) throw error;
      }
      if (input.log.length > 0) {
        const { error } = await supabase.from('ew_reviews').insert(
          input.log.map((l) => ({
            user_id: userId,
            word_id: l.wordId,
            reviewed_on: day,
            kind: l.kind,
            correct: l.correct,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ew'] }),
  });
}

/** Marks one word as known (dictionary or result screen). */
export function useMarkKnown() {
  const userId = useUserId();
  const day = useStudyDay();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { wordId: string; current?: UserWord }) => {
      if (!userId || !day) throw new Error('Not ready');
      const srs = markKnown(input.current ?? newSrsState(), day);
      const { error } = await supabase.from('ew_user_words').upsert({
        user_id: userId,
        word_id: input.wordId,
        ...srs,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ew'] }),
  });
}

export interface CustomWordInput {
  term: string;
  translation_uk: string;
  pos?: string;
  ipa?: string;
  definition_en?: string;
  example_en?: string;
}

export function useAddCustomWord() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomWordInput) => {
      const { error } = await supabase.from('ew_words').insert({
        owner_id: userId,
        term: input.term,
        translation_uk: input.translation_uk,
        pos: input.pos ?? '',
        ipa: input.ipa ?? '',
        definition_en: input.definition_en ?? '',
        example_en: input.example_en ?? '',
        topics: ['custom'],
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ew'] }),
  });
}

export function useDeleteCustomWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordId: string) => {
      const { error } = await supabase.from('ew_words').delete().eq('id', wordId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ew'] }),
  });
}
