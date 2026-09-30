import { supabase } from '@/core/api/supabase';
import type { DateRange } from '@/core/modules/types';
import type { Folder, Note, NoteSummary } from './types';

// Plain fetchers with no React imports, so the module index (stats provider) can use them
// without an import cycle through the registry.

export const SUMMARY_COLUMNS =
  'id, folder_id, title, preview, tags, pinned, archived_at, deleted_at, created_at, updated_at';
export const NOTE_COLUMNS = `${SUMMARY_COLUMNS}, body_md`;

export async function fetchNotes(): Promise<NoteSummary[]> {
  const { data, error } = await supabase
    .from('nt_notes')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as NoteSummary[];
}

export async function fetchNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('nt_notes')
    .select(NOTE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Note | null) ?? null;
}

export async function fetchAllNotesWithBody(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('nt_notes')
    .select(NOTE_COLUMNS)
    .is('deleted_at', null)
    .order('created_at')
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase.from('nt_folders').select('id, name').order('name');
  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function searchNoteIds(tsquery: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('nt_notes')
    .select('id')
    .textSearch('search', tsquery, { config: 'simple' })
    .limit(2000);
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

/** Notes written in a range (inclusive dates) and the current total; trashed notes never count. */
export async function fetchNoteStats(
  range: DateRange,
): Promise<{ total: number; written: number }> {
  // Day after `to`, computed in UTC so it never depends on the machine's timezone.
  const end = new Date(`${range.to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const after = end.toISOString().slice(0, 10);
  const [total, written] = await Promise.all([
    supabase.from('nt_notes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('nt_notes')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', range.from)
      .lt('created_at', after),
  ]);
  if (total.error) throw total.error;
  if (written.error) throw written.error;
  return { total: total.count ?? 0, written: written.count ?? 0 };
}
