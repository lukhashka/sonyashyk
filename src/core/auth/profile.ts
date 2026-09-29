import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/core/api/supabase';
import { useAuth } from './AuthProvider';

export const profileSchema = z.object({
  display_name: z.string().trim().max(60),
  bio: z.string().trim().max(160),
  avatar_emoji: z.string().trim().min(1).max(16),
  timezone: z.string().trim().min(1).max(64),
  day_rollover_hour: z.number().int().min(0).max(23),
  locale: z.enum(['uk', 'en']),
  theme: z.enum(['light', 'dark', 'system']),
  daily_goal_xp: z.number().int().min(0).max(10000),
});

export type ProfileUpdate = z.infer<typeof profileSchema>;
export type Profile = ProfileUpdate & {
  id: string;
  role: 'user' | 'admin';
  enabled_modules: string[];
  avatar_url: string | null;
};

const key = (userId: string | undefined) => ['profile', userId] as const;

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: key(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile> => {
      // RLS guarantees only the caller's own row is visible.
      const { data, error } = await supabase.from('profiles').select('*').single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useUpdateProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileUpdate) => {
      if (!userId) throw new Error('Not signed in');
      const values = profileSchema.parse(input);
      const { error } = await supabase.from('profiles').update(values).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  });
}
