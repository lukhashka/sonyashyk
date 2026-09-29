import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/api/supabase';
import { useAuth } from '@/core/auth/AuthProvider';
import { useProfile } from '@/core/auth/profile';
import { emit } from '@/core/events/bus';
import { effectiveStreak, type StreakRow } from '@/core/gamification/streak';
import { addDays, getStudyDay, lastSevenDays } from '@/core/lib/studyDay';
import { getEnabledModules } from '@/core/modules/registry';
import type { DailyTaskDescriptor } from '@/core/modules/types';

export interface DailyTask {
  id: string;
  module_id: string;
  task_key: string;
  title_key: string;
  emoji: string | null;
  route: string | null;
  xp: number;
  estimated_minutes: number | null;
  target: number;
  progress: number;
  completed_at: string | null;
}

export interface DailyPlan {
  planId: string;
  studyDay: string;
  tasks: DailyTask[];
}

function toRow(moduleId: string, d: DailyTaskDescriptor) {
  return {
    module_id: moduleId,
    task_key: d.key,
    title_key: d.title,
    emoji: d.emoji ?? null,
    route: d.route ?? null,
    xp: d.xp,
    estimated_minutes: d.estimatedMinutes ?? null,
    target: d.progress?.target ?? 1,
  };
}

/** Current study day for the signed-in user, from their profile (timezone + rollover hour). */
export function useStudyDay(): string | undefined {
  const { data: profile } = useProfile();
  if (!profile) return undefined;
  return getStudyDay(new Date(), profile.timezone, profile.day_rollover_hour).date;
}

/** Today's plan: generated on first open from every enabled module's provider, then persisted. */
export function useDailyPlan() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: profile } = useProfile();
  const day = useStudyDay();

  return useQuery({
    queryKey: ['daily', 'plan', userId, day],
    enabled: Boolean(userId && profile && day),
    queryFn: async (): Promise<DailyPlan> => {
      const modules = getEnabledModules(
        undefined,
        profile!.enabled_modules.length ? profile!.enabled_modules : undefined,
      );
      const batches = await Promise.all(
        modules.map(async (m) => {
          if (!m.dailyTaskProvider) return [];
          const tasks = await m.dailyTaskProvider.getTasksForDay({
            userId: userId!,
            day: { date: day! },
            settings: undefined,
          });
          return tasks.map((d) => toRow(m.id, d));
        }),
      );

      const { data: planId, error } = await supabase.rpc('ensure_daily_plan', {
        p_tasks: batches.flat(),
      });
      if (error) throw error;

      const { data: tasks, error: tasksError } = await supabase
        .from('daily_tasks')
        .select(
          'id, module_id, task_key, title_key, emoji, route, xp, estimated_minutes, target, progress, completed_at',
        )
        .eq('plan_id', planId as string)
        .order('module_id')
        .order('task_key');
      if (tasksError) throw tasksError;
      return { planId: planId as string, studyDay: day!, tasks: (tasks ?? []) as DailyTask[] };
    },
  });
}

/** Client reports progress; the server validates it, awards XP once and closes the day. */
export function useReportProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task: DailyTask; progress: number; studyDay: string }) => {
      const { data, error } = await supabase.rpc('report_task_progress', {
        p_task_id: input.task.id,
        p_progress: input.progress,
      });
      if (error) throw error;
      return data as { task_completed: boolean; day_completed: boolean };
    },
    onSuccess: (result, { task, studyDay }) => {
      if (result.task_completed && !task.completed_at) {
        emit('task.completed', { taskId: task.id, moduleId: task.module_id, xp: task.xp });
        emit('xp.awarded', { amount: task.xp });
      }
      if (result.day_completed) emit('day.completed', { studyDay });
      void qc.invalidateQueries({ queryKey: ['daily'] });
    },
  });
}

export function useXpSummary() {
  const { session } = useAuth();
  const day = useStudyDay();
  return useQuery({
    queryKey: ['daily', 'xp', session?.user.id, day],
    enabled: Boolean(session && day),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_xp_summary');
      if (error) throw error;
      const s = data as { total_xp: number; today_xp: number };
      return { totalXp: s.total_xp, todayXp: s.today_xp };
    },
  });
}

export function useStreak() {
  const { session } = useAuth();
  const day = useStudyDay();
  return useQuery({
    queryKey: ['daily', 'streak', session?.user.id, day],
    enabled: Boolean(session && day),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streaks')
        .select('current, longest, last_completed_day, freezes_available')
        .maybeSingle();
      if (error) throw error;
      const row = data as StreakRow | null;
      return {
        current: effectiveStreak(row, day!),
        longest: row?.longest ?? 0,
        freezes: row?.freezes_available ?? 0,
      };
    },
  });
}

/** Which of the last 7 study days were completed (oldest first). */
export function useWeekDays() {
  const { session } = useAuth();
  const day = useStudyDay();
  return useQuery({
    queryKey: ['daily', 'week', session?.user.id, day],
    enabled: Boolean(session && day),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_plans')
        .select('study_day')
        .not('completed_at', 'is', null)
        .gte('study_day', addDays(day!, -6))
        .lte('study_day', day!);
      if (error) throw error;
      const done = new Set((data ?? []).map((r: { study_day: string }) => r.study_day));
      return lastSevenDays(day!).map((date) => ({ date, done: done.has(date) }));
    },
  });
}
