import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/core/api/supabase';
import { useAuth } from '@/core/auth/AuthProvider';
import { buildSearchQuery } from './notes';
import { NOTE_COLUMNS, fetchFolders, fetchNote, fetchNotes, searchNoteIds } from './fetchers';
import type { Folder, Note } from './types';

function useUserId() {
  return useAuth().session?.user.id;
}

export function useNotes() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['nt', 'notes', userId],
    enabled: Boolean(userId),
    queryFn: fetchNotes,
  });
}

export function useNote(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['nt', 'note', userId, id],
    enabled: Boolean(userId && id),
    // The editor keeps its own copy while typing; refetching would fight with it.
    staleTime: Infinity,
    queryFn: () => fetchNote(id as string),
  });
}

export function useFolders() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['nt', 'folders', userId],
    enabled: Boolean(userId),
    queryFn: fetchFolders,
  });
}

/** Ids of notes matching the search text (null when the text has nothing searchable). */
export function useSearchIds(text: string) {
  const userId = useUserId();
  const q = buildSearchQuery(text);
  return useQuery({
    queryKey: ['nt', 'search', userId, q],
    enabled: Boolean(userId && q),
    queryFn: async () => new Set(await searchNoteIds(q as string)),
  });
}

export interface NewNote {
  title: string;
  body_md: string;
  folder_id?: string | null;
  tags?: string[];
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewNote): Promise<Note> => {
      const { data, error } = await supabase
        .from('nt_notes')
        .insert({
          title: input.title,
          body_md: input.body_md,
          folder_id: input.folder_id ?? null,
          tags: input.tags ?? [],
        })
        .select(NOTE_COLUMNS)
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nt', 'notes'] }),
  });
}

export type NotePatch = Partial<
  Pick<Note, 'title' | 'body_md' | 'tags' | 'folder_id' | 'pinned' | 'archived_at' | 'deleted_at'>
>;

export function useUpdateNote() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: NotePatch }) => {
      const { error } = await supabase.from('nt_notes').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, { id, patch }) => {
      // Keep the cached copy in step without refetching (the editor owns the live text).
      qc.setQueryData<Note | null>(['nt', 'note', userId, id], (old) =>
        old ? { ...old, ...patch } : old,
      );
      void qc.invalidateQueries({ queryKey: ['nt', 'notes'] });
      void qc.invalidateQueries({ queryKey: ['nt', 'search'] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('nt_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nt'] }),
  });
}

export function useSaveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string }): Promise<Folder> => {
      const name = input.name.trim();
      const q = input.id
        ? supabase.from('nt_folders').update({ name }).eq('id', input.id)
        : supabase.from('nt_folders').insert({ name });
      const { data, error } = await q.select('id, name').single();
      if (error) throw error;
      return data as Folder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nt', 'folders'] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Notes in the folder are kept (folder_id is set to null by the FK).
      const { error } = await supabase.from('nt_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nt'] }),
  });
}
