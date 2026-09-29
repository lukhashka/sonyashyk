import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/api/supabase';
import { useAuth } from './AuthProvider';

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export type AvatarFileError = 'type' | 'size' | null;

export function validateAvatarFile(file: { type: string; size: number }): AvatarFileError {
  if (!(file.type in EXT)) return 'type';
  if (file.size > AVATAR_MAX_BYTES) return 'size';
  return null;
}

/** Short-lived signed URL for a private avatar object. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', path],
    enabled: Boolean(path),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useUploadAvatar(currentPath: string | null | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('Not signed in');
      if (validateAvatarFile(file)) throw new Error('Invalid avatar file');
      const path = `${userId}/avatar-${Date.now()}.${EXT[file.type]}`;
      const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', userId);
      if (error) throw error;
      if (currentPath) await supabase.storage.from(AVATAR_BUCKET).remove([currentPath]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function useRemoveAvatar(currentPath: string | null | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);
      if (error) throw error;
      if (currentPath) await supabase.storage.from(AVATAR_BUCKET).remove([currentPath]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
