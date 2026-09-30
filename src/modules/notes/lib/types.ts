export interface Folder {
  id: string;
  name: string;
}

/** A note as shown in lists: no body, only a short preview. */
export interface NoteSummary {
  id: string;
  folder_id: string | null;
  title: string;
  preview: string;
  tags: string[];
  pinned: boolean;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note extends NoteSummary {
  body_md: string;
}

export type NoteView = 'all' | 'pinned' | 'archived' | 'trash';
export type NoteSort = 'updated' | 'created' | 'title';

export const MAX_BODY = 100_000;
export const MAX_TITLE = 200;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
