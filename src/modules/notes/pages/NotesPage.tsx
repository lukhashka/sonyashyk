import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Download, FolderCog, Pin, Plus, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/shared/ui';
import { FolderManager } from '../components/FolderManager';
import { downloadBlob, buildNotesZip } from '../lib/export';
import { fetchAllNotesWithBody } from '../lib/fetchers';
import { allTags, filterNotes, sortNotes } from '../lib/notes';
import { useCreateNote, useFolders, useNotes, useSearchIds } from '../lib/queries';
import { TEMPLATE_IDS, getTemplate, type TemplateId, type TemplateLang } from '../lib/templates';
import type { NoteSort, NoteView } from '../lib/types';

const VIEWS: NoteView[] = ['all', 'pinned', 'archived', 'trash'];
const field = 'min-h-11 rounded-md border border-border bg-surface px-3 text-base';

export default function NotesPage() {
  const { t, i18n } = useTranslation('notes');
  const navigate = useNavigate();
  const { data: notes, isPending, isError } = useNotes();
  const { data: folders = [] } = useFolders();
  const create = useCreateNote();

  const [view, setView] = useState<NoteView>('all');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<NoteSort>('updated');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [managing, setManaging] = useState(false);

  const search = useSearchIds(query);
  const searching = query.trim().length > 0 && Boolean(query.match(/[\p{L}\p{N}]/u));

  const visible = useMemo(() => {
    if (!notes) return [];
    const ids = searching ? (search.data ?? new Set<string>()) : null;
    return sortNotes(filterNotes(notes, { view, folderId, tag, ids }), sort, view);
  }, [notes, view, folderId, tag, sort, searching, search.data]);

  const tags = useMemo(() => allTags(notes ?? []), [notes]);
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;

  const newNote = async (id: TemplateId) => {
    const lang: TemplateLang = i18n.language.startsWith('en') ? 'en' : 'uk';
    const tpl = getTemplate(id, lang);
    const note = await create.mutateAsync({
      title: tpl.title,
      body_md: tpl.body,
      folder_id: folderId,
    });
    void navigate(`/m/notes/${note.id}`);
  };

  const exportAll = async () => {
    const all = await fetchAllNotesWithBody();
    downloadBlob(
      buildNotesZip(all, folders) as BlobPart,
      'application/zip',
      `sonyashyk-notes-${new Date().toISOString().slice(0, 10)}.zip`,
    );
  };

  const emptyKey = searching ? 'search' : view;

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('heading')}</h1>
          <p className="text-text-muted">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
          <Plus size={18} aria-hidden="true" />
          {t('new')}
        </Button>
      </header>

      {picking && (
        <Card>
          <p className="mb-2 font-semibold">{t('chooseTemplate')}</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_IDS.map((id) => (
              <Button
                key={id}
                variant="soft"
                disabled={create.isPending}
                onClick={() => void newNote(id)}
              >
                {t(`template.${id}`)}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          aria-label={t('search')}
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${field} w-full pl-10`}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('heading')}>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-11 rounded-full px-4 font-semibold ${
              view === v ? 'bg-primary text-[#3d2c2e]' : 'bg-primary-soft text-primary-ink'
            }`}
          >
            {t(`view.${v}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t('folder.manage')}
          className={field}
          value={folderId ?? ''}
          onChange={(e) => setFolderId(e.target.value || null)}
        >
          <option value="">{t('folder.all')}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('tag.label')}
          className={field}
          value={tag ?? ''}
          onChange={(e) => setTag(e.target.value || null)}
        >
          <option value="">{t('tag.all')}</option>
          {tags.map((x) => (
            <option key={x} value={x}>
              #{x}
            </option>
          ))}
        </select>
        <select
          aria-label={t('sort.label')}
          className={field}
          value={sort}
          onChange={(e) => setSort(e.target.value as NoteSort)}
        >
          {(['updated', 'created', 'title'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`sort.${s}`)}
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={() => setManaging((m) => !m)} aria-expanded={managing}>
          <FolderCog size={16} aria-hidden="true" />
          {t('folder.manage')}
        </Button>
        <Button variant="ghost" onClick={() => void exportAll()}>
          <Download size={16} aria-hidden="true" />
          {t('exportAll')}
        </Button>
      </div>

      {managing && (
        <FolderManager
          folders={folders}
          onDeleted={(id) => {
            if (folderId === id) setFolderId(null);
          }}
        />
      )}

      {isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : isError ? (
        <EmptyState emoji="😿" title={t('loadError')} />
      ) : visible.length === 0 ? (
        <EmptyState emoji={view === 'trash' ? '🗑️' : '📝'} title={t(`empty.${emptyKey}`)}>
          {emptyKey === 'all' && t('empty.allHint')}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {visible.map((n) => (
            <li key={n.id}>
              <Link
                to={`/m/notes/${n.id}`}
                className="block rounded-lg border border-border bg-surface p-4 shadow-soft hover:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold">{n.title || t('untitled')}</h2>
                  {n.pinned && (
                    <span title={t('pinnedBadge')} className="text-primary-ink">
                      <Pin size={16} aria-label={t('pinnedBadge')} />
                    </span>
                  )}
                </div>
                {n.preview && <p className="mt-1 line-clamp-2 text-text-muted">{n.preview}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  {folderName(n.folder_id) && <Badge>📁 {folderName(n.folder_id)}</Badge>}
                  {n.tags.map((x) => (
                    <span key={x}>#{x}</span>
                  ))}
                  <span className="ml-auto">
                    {new Date(n.updated_at).toLocaleDateString(i18n.language)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
