import { zipSync, strToU8 } from 'fflate';
import type { Note } from './types';

// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f]/g;

export function safeFileName(title: string, fallback = 'note'): string {
  const base = title.replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return base || fallback;
}

/** A note as a Markdown file: title as H1 plus tags, then the body. */
export function noteToMarkdown(note: Pick<Note, 'title' | 'body_md' | 'tags'>): string {
  const head = note.title ? `# ${note.title}\n\n` : '';
  const tags = note.tags.length
    ? `${note.tags.map((t) => `#${t.replace(/\s+/g, '-')}`).join(' ')}\n\n`
    : '';
  return `${head}${tags}${note.body_md}\n`;
}

export interface ExportFolder {
  id: string;
  name: string;
}

/** Zip of all notes as .md files, one directory per folder. File names are de-duplicated. */
export function buildNotesZip(notes: Note[], folders: ExportFolder[]): Uint8Array {
  const folderName = new Map(folders.map((f) => [f.id, safeFileName(f.name, 'folder')]));
  const used = new Set<string>();
  const files: Record<string, Uint8Array> = {};
  for (const note of notes) {
    const dir = note.folder_id ? (folderName.get(note.folder_id) ?? '') : '';
    const prefix = dir ? `${dir}/` : '';
    const base = safeFileName(note.title);
    let path = `${prefix}${base}.md`;
    for (let i = 2; used.has(path.toLowerCase()); i++) path = `${prefix}${base} (${i}).md`;
    used.add(path.toLowerCase());
    files[path] = strToU8(noteToMarkdown(note));
  }
  return zipSync(files);
}

export function downloadBlob(data: BlobPart, type: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
