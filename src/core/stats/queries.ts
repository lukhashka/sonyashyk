import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/api/supabase';
import { useAuth } from '@/core/auth/AuthProvider';
import { getAchievementCheckRpcs } from '@/core/gamification/achievements';
import type { DateRange } from '@/core/modules/types';

export interface StatsSummary {
  totalXp: number;
  rangeXp: number;
  daysStudied: number;
  tasksDone: number;
  studyMinutes: number;
}

export interface DailyStat {
  day: string;
  xp: number;
  tasks: number;
}

export function useStatsSummary(range: DateRange | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['stats', 'summary', session?.user.id, range?.from, range?.to],
    enabled: Boolean(session && range),
    queryFn: async (): Promise<StatsSummary> => {
      const { data, error } = await supabase.rpc('get_stats_summary', {
        p_from: range!.from,
        p_to: range!.to,
      });
      if (error) throw error;
      const s = data as {
        total_xp: number;
        range_xp: number;
        days_studied: number;
        tasks_done: number;
        study_minutes: number;
      };
      return {
        totalXp: s.total_xp,
        rangeXp: s.range_xp,
        daysStudied: s.days_studied,
        tasksDone: s.tasks_done,
        studyMinutes: s.study_minutes,
      };
    },
  });
}

/** Sparse per-day XP/tasks (only days with activity). The range must be ≤ ~13 months. */
export function useDailyStats(range: DateRange | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['stats', 'daily', session?.user.id, range?.from, range?.to],
    enabled: Boolean(session && range),
    queryFn: async (): Promise<DailyStat[]> => {
      const { data, error } = await supabase.rpc('get_daily_stats', {
        p_from: range!.from,
        p_to: range!.to,
      });
      if (error) throw error;
      return (data ?? []) as DailyStat[];
    },
  });
}

export interface UnlockedAchievement {
  achievement_id: string;
  unlocked_at: string;
}

export function useUnlockedAchievements() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['achievements', session?.user.id],
    enabled: Boolean(session),
    queryFn: async (): Promise<UnlockedAchievement[]> => {
      const { data, error } = await supabase
        .from('achievements_unlocked')
        .select('achievement_id, unlocked_at')
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Asks the server to evaluate every achievement rule (core + modules). Idempotent; resolves
 * with the ids that were unlocked by this very call.
 */
export function useCheckAchievements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string[]> => {
      const results = await Promise.all(
        getAchievementCheckRpcs().map(async (name) => {
          const { data, error } = await supabase.rpc(name);
          if (error) throw error;
          return (data ?? []) as string[];
        }),
      );
      return results.flat();
    },
    onSuccess: (ids) => {
      if (ids.length > 0) void qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}
