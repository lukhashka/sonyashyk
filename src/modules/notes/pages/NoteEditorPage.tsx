import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Copy,
  Download,
  Pin,
  PinOff,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/shared/ui';
import { MarkdownView } from '../components/MarkdownView';
import { downloadBlob, noteToMarkdown, safeFileName } from '../lib/export';
import { parseTags } from '../lib/notes';
import {
  useCreateNote,
  useDeleteNote,
  useFolders,
  useNote,
  useUpdateNote,
  type NotePatch,
} from '../lib/queries';
import { MAX_BODY, MAX_TITLE, type Note } from '../lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const field = 'min-h-11 rounded-md border border-border bg-surface px-3 text-base';

function Editor({ note }: { note: Note }) {
  const { t } = useTranslation('notes');
  const navigate = useNavigate();
  const { data: folders } = useFolders();
  const update = useUpdateNote();
  const create = useCreateNote();
  const remove = useDeleteNote();

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body_md);
  const [tagText, setTagText] = useState(note.tags.join(', '));
  const [folderId, setFolderId] = useState<string | null>(note.folder_id);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [state, setState] = useState<SaveState>('idle');
  const readOnly = Boolean(note.deleted_at);

  const tags = parseTags(tagText);
  const saved = useRef({
    title: note.title,
    body_md: note.body_md,
    tags: note.tags,
    folder_id: note.folder_id,
  });
  const latest = useRef({ title, body_md: body, tags, folder_id: folderId });
  useEffect(() => {
    latest.current = { title, body_md: body, tags, folder_id: folderId };
  });

  const save = useCallback(async () => {
    const cur = latest.current;
    const patch: NotePatch = {};
    if (cur.title !== saved.current.title) patch.title = cur.title;
    if (cur.body_md !== saved.current.body_md) patch.body_md = cur.body_md;
    if (cur.tags.join('\u0000') !== saved.current.tags.join('\u0000')) patch.tags = cur.tags;
    if (cur.folder_id !== saved.current.folder_id) patch.folder_id = cur.folder_id;
    if (Object.keys(patch).length === 0) return;
    setState('saving');
    try {
      await update.mutateAsync({ id: note.id, patch });
      saved.current = { ...saved.current, ...cur };
      setState('saved');
    } catch {
      setState('error');
    }
  }, [note.id, update]);

  // Debounced autosave; a failed save is retried on the next edit or after a pause.
  useEffect(() => {
    if (readOnly) return;
    const id = setTimeout(() => void save(), state === 'error' ? 4000 : 800);
    return () => clearTimeout(id);
  }, [title, body, tagText, folderId, readOnly, save, state]);

  // Flush pending edits when leaving the page.
  useEffect(
    () => () => {
      if (!readOnly) void save();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const preview = useDeferredValue(body);

  const patchNow = (patch: NotePatch) => update.mutate({ id: note.id, patch });

  const duplicate = async () => {
    const copy = await create.mutateAsync({
      title: `${title || t('untitled')} ${t('action.copySuffix')}`,
      body_md: body,
      folder_id: folderId,
      tags,
    });
    void navigate(`/m/notes/${copy.id}`);
  };

  const exportOne = () =>
    downloadBlob(
      noteToMarkdown({ title, body_md: body, tags }),
      'text/markdown;charset=utf-8',
      `${safeFileName(title)}.md`,
    );

  const deleteForever = async () => {
    if (!window.confirm(t('action.deleteConfirm'))) return;
    await remove.mutateAsync(note.id);
    void navigate('/m/notes');
  };

  const statusText =
    state === 'saving'
      ? t('editor.saving')
      : state === 'saved'
        ? t('editor.saved')
        : state === 'error'
          ? t('editor.saveError')
          : '';

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/m/notes"
          className="inline-flex min-h-11 items-center gap-1 text-primary-ink hover:underline"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          {t('editor.back')}
        </Link>
        <p role="status" aria-live="polite" className="text-sm text-text-muted">
          {statusText}
        </p>
      </div>

      {readOnly && (
        <Card className="flex flex-wrap items-center justify-between gap-2 bg-surface-muted">
          <p>{t('editor.inTrash')}</p>
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => patchNow({ deleted_at: null })}>
              <Undo2 size={16} aria-hidden="true" />
              {t('action.restore')}
            </Button>
            <Button variant="ghost" onClick={() => void deleteForever()}>
              <Trash2 size={16} aria-hidden="true" />
              {t('action.deleteForever')}
            </Button>
          </div>
        </Card>
      )}

      <Card className="grid gap-4">
        <label className="grid gap-1 text-sm font-semibold">
          {t('editor.title')}
          <input
            className={`${field} text-lg font-bold`}
            value={title}
            maxLength={MAX_TITLE}
            readOnly={readOnly}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            {t('folder.manage')}
            <select
              className={field}
              value={folderId ?? ''}
              disabled={readOnly}
              onChange={(e) => setFolderId(e.target.value || null)}
            >
              <option value="">{t('folder.none')}</option>
              {folders?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('tag.label')}
            <input
              className={field}
              value={tagText}
              readOnly={readOnly}
              placeholder={t('tag.placeholder')}
              onChange={(e) => setTagText(e.target.value)}
            />
            <span className="text-xs font-normal text-text-muted">{t('tag.hint')}</span>
          </label>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2" role="toolbar" aria-label={t('editor.settings')}>
            <Button variant="soft" onClick={() => patchNow({ pinned: !note.pinned })}>
              {note.pinned ? (
                <PinOff size={16} aria-hidden="true" />
              ) : (
                <Pin size={16} aria-hidden="true" />
              )}
              {t(note.pinned ? 'action.unpin' : 'action.pin')}
            </Button>
            <Button
              variant="soft"
              onClick={() =>
                patchNow({ archived_at: note.archived_at ? null : new Date().toISOString() })
              }
            >
              {note.archived_at ? (
                <ArchiveRestore size={16} aria-hidden="true" />
              ) : (
                <Archive size={16} aria-hidden="true" />
              )}
              {t(note.archived_at ? 'action.unarchive' : 'action.archive')}
            </Button>
            <Button variant="soft" onClick={() => void duplicate()} disabled={create.isPending}>
              <Copy size={16} aria-hidden="true" />
              {t('action.duplicate')}
            </Button>
            <Button variant="soft" onClick={exportOne}>
              <Download size={16} aria-hidden="true" />
              {t('exportOne')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void save().then(() =>
                  update.mutate({ id: note.id, patch: { deleted_at: new Date().toISOString() } }),
                );
                void navigate('/m/notes');
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              {t('action.trash')}
            </Button>
          </div>
        )}
      </Card>

      <div
        className="flex gap-2 md:hidden"
        role="tablist"
        aria-label={`${t('editor.write')} / ${t('editor.preview')}`}
      >
        {(['write', 'preview'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 flex-1 rounded-full font-semibold ${
              mode === m ? 'bg-primary text-[#3d2c2e]' : 'bg-primary-soft text-primary-ink'
            }`}
          >
            {t(`editor.${m}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label
          className={`grid gap-1 text-sm font-semibold ${mode === 'preview' ? 'hidden md:grid' : ''}`}
        >
          <span>
            {t('editor.body')}{' '}
            <span className="font-normal text-text-muted">
              · {t('editor.chars', { count: body.length })}
            </span>
          </span>
          <textarea
            className={`${field} min-h-[50vh] resize-y py-3 font-mono text-[15px] leading-relaxed`}
            value={body}
            maxLength={MAX_BODY}
            readOnly={readOnly}
            spellCheck
            onChange={(e) => setBody(e.target.value)}
          />
          <span className="text-xs font-normal text-text-muted">{t('md.hint')}</span>
          {body.length >= MAX_BODY && (
            <span className="text-xs font-normal text-danger">
              {t('editor.limit', { max: MAX_BODY })}
            </span>
          )}
        </label>
        <Card className={`min-h-[50vh] ${mode === 'write' ? 'hidden md:block' : ''}`}>
          <h2 className="mb-2 text-sm font-semibold text-text-muted">{t('editor.preview')}</h2>
          <MarkdownView source={preview} empty={t('editor.previewEmpty')} />
        </Card>
      </div>
    </div>
  );
}

export default function NoteEditorPage() {
  const { t } = useTranslation('notes');
  const { id } = useParams();
  const { data: note, isPending, isError } = useNote(id);

  if (isPending) return <Skeleton className="mx-auto h-96 max-w-5xl" />;
  if (isError || !note) {
    return (
      <EmptyState emoji="🔍" title={t('editor.notFound')}>
        <Link to="/m/notes" className="text-primary-ink underline">
          {t('editor.back')}
        </Link>
      </EmptyState>
    );
  }
  return <Editor key={note.id} note={note} />;
}
