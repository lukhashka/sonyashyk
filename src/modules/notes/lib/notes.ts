import type { NoteSort, NoteSummary, NoteView } from './types';
import { MAX_TAGS, MAX_TAG_LENGTH } from './types';

/** "  Civil Law, ЦК,civil law " -> ['civil law', 'цк'] — trimmed, lower-cased, unique, capped. */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,;\n]/)) {
    const tag = raw.trim().replace(/^#/, '').toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** Builds a prefix `to_tsquery` string ("дог:* & ліб:*") from free text; null if nothing searchable. */
export function buildSearchQuery(input: string): string | null {
  const words = input.match(/[\p{L}\p{N}]+/gu);
  if (!words) return null;
  return words
    .slice(0, 8)
    .map((w) => `${w.toLowerCase()}:*`)
    .join(' & ');
}

export interface NoteFilter {
  view: NoteView;
  folderId: string | null;
  tag: string | null;
  /** When set, only notes with these ids (search results) are kept. */
  ids?: Set<string> | null;
}

export function filterNotes(notes: NoteSummary[], f: NoteFilter): NoteSummary[] {
  return notes.filter((n) => {
    if (f.view === 'trash') {
      if (!n.deleted_at) return false;
    } else {
      if (n.deleted_at) return false;
      if (f.view === 'archived' ? !n.archived_at : n.archived_at) return false;
      if (f.view === 'pinned' && !n.pinned) return false;
    }
    if (f.folderId && n.folder_id !== f.folderId) return false;
    if (f.tag && !n.tags.includes(f.tag)) return false;
    if (f.ids && !f.ids.has(n.id)) return false;
    return true;
  });
}

/** Pinned notes first (except in the trash), then by the chosen key. */
export function sortNotes(notes: NoteSummary[], sort: NoteSort, view: NoteView): NoteSummary[] {
  const byKey = (a: NoteSummary, b: NoteSummary) => {
    if (sort === 'title') return a.title.localeCompare(b.title, 'uk');
    const key = sort === 'created' ? 'created_at' : 'updated_at';
    return b[key].localeCompare(a[key]);
  };
  return [...notes].sort((a, b) => {
    if (view !== 'trash' && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return byKey(a, b);
  });
}

export function allTags(notes: NoteSummary[]): string[] {
  const set = new Set<string>();
  for (const n of notes) if (!n.deleted_at) n.tags.forEach((t) => set.add(t));
  return [...set].sort((a, b) => a.localeCompare(b, 'uk'));
}
