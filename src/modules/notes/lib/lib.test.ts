import { unzipSync, strFromU8 } from 'fflate';
import { buildNotesZip, noteToMarkdown, safeFileName } from './export';
import { renderMarkdown } from './markdown';
import { allTags, buildSearchQuery, filterNotes, parseTags, sortNotes } from './notes';
import { TEMPLATE_IDS, getTemplate } from './templates';
import type { Note, NoteSummary } from './types';

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  folder_id: null,
  title: 'T',
  preview: '',
  body_md: 'body',
  tags: [],
  pinned: false,
  archived_at: null,
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

describe('parseTags', () => {
  it('trims, lower-cases, de-duplicates and caps', () => {
    expect(parseTags('  Civil Law, ЦК,civil law ,#Exam')).toEqual(['civil law', 'цк', 'exam']);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(','))).toHaveLength(10);
    expect(parseTags('')).toEqual([]);
  });
});

describe('buildSearchQuery', () => {
  it('makes a prefix query and ignores punctuation / operators', () => {
    expect(buildSearchQuery('Договір ліб')).toBe('договір:* & ліб:*');
    expect(buildSearchQuery("tort'; drop table --")).toBe('tort:* & drop:* & table:*');
    expect(buildSearchQuery('  !!  ')).toBeNull();
  });
});

describe('filter and sort', () => {
  const list: NoteSummary[] = [
    note({ id: 'a', title: 'Б', pinned: false, updated_at: '2026-03-01T00:00:00Z', tags: ['цк'] }),
    note({
      id: 'b',
      title: 'А',
      pinned: true,
      updated_at: '2026-01-01T00:00:00Z',
      folder_id: 'f1',
    }),
    note({ id: 'c', archived_at: '2026-02-01T00:00:00Z' }),
    note({ id: 'd', deleted_at: '2026-02-01T00:00:00Z', pinned: true }),
  ];
  const ids = (l: NoteSummary[]) => l.map((n) => n.id);
  const base = { folderId: null, tag: null };

  it('splits notes across views', () => {
    expect(ids(filterNotes(list, { ...base, view: 'all' }))).toEqual(['a', 'b']);
    expect(ids(filterNotes(list, { ...base, view: 'pinned' }))).toEqual(['b']);
    expect(ids(filterNotes(list, { ...base, view: 'archived' }))).toEqual(['c']);
    expect(ids(filterNotes(list, { ...base, view: 'trash' }))).toEqual(['d']);
  });

  it('filters by folder, tag and search ids', () => {
    expect(ids(filterNotes(list, { view: 'all', folderId: 'f1', tag: null }))).toEqual(['b']);
    expect(ids(filterNotes(list, { view: 'all', folderId: null, tag: 'цк' }))).toEqual(['a']);
    expect(ids(filterNotes(list, { ...base, view: 'all', ids: new Set(['a']) }))).toEqual(['a']);
  });

  it('keeps pinned notes first, then sorts by key', () => {
    const all = filterNotes(list, { ...base, view: 'all' });
    expect(ids(sortNotes(all, 'updated', 'all'))).toEqual(['b', 'a']);
    expect(ids(sortNotes([all[1]!, all[0]!], 'title', 'archived'))).toEqual(['b', 'a']);
  });

  it('collects tags from live notes only', () => {
    expect(allTags([note({ tags: ['x'] }), note({ tags: ['y'], deleted_at: 'now' })])).toEqual([
      'x',
    ]);
  });
});

describe('renderMarkdown', () => {
  it('renders GFM: headings, bold and task lists', () => {
    const html = renderMarkdown('# Hi\n\n**b**\n\n- [x] done');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('type="checkbox"');
  });

  it('strips scripts, event handlers, images and javascript: links', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a> [y](javascript:alert) <div onclick="a()">z</div>',
    );
    expect(html).not.toMatch(/<script|onerror|onclick|<img|href="javascript:/i);
  });

  it('opens safe links in a new tab without the opener', () => {
    const html = renderMarkdown('[site](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});

describe('templates', () => {
  it('has every template in both languages; IRAC has its four parts', () => {
    for (const id of TEMPLATE_IDS) {
      expect(getTemplate(id, 'uk')).toBeDefined();
      expect(getTemplate(id, 'en')).toBeDefined();
    }
    const irac = getTemplate('irac', 'en').body;
    for (const part of ['Issue', 'Rule', 'Application', 'Conclusion']) expect(irac).toContain(part);
  });
});

describe('export', () => {
  it('makes safe file names', () => {
    expect(safeFileName('a/b:c*?')).toBe('a b c');
    expect(safeFileName('   ')).toBe('note');
  });

  it('writes a note as Markdown with title and tags', () => {
    expect(noteToMarkdown({ title: 'T', body_md: 'x', tags: ['a b', 'c'] })).toBe(
      '# T\n\n#a-b #c\n\nx\n',
    );
  });

  it('zips notes into folder directories with unique names', () => {
    const zip = unzipSync(
      buildNotesZip(
        [
          note({ id: '1', title: 'Same', folder_id: 'f' }),
          note({ id: '2', title: 'Same', folder_id: 'f' }),
          note({ id: '3', title: '' }),
        ],
        [{ id: 'f', name: 'Civil/Law' }],
      ),
    );
    expect(Object.keys(zip).sort()).toEqual([
      'Civil Law/Same (2).md',
      'Civil Law/Same.md',
      'note.md',
    ]);
    expect(strFromU8(zip['note.md']!)).toContain('body');
  });
});
