import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { z } from 'zod';
import { ChevronLeft, Plus, Trash2, Volume2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/shared/ui';
import {
  useAddCustomWord,
  useDeleteCustomWord,
  useDictionary,
  useMarkKnown,
  useUserWords,
} from '../lib/queries';
import { canSpeak, speak } from '../lib/speech';
import type { UserWord, Word, WordStatus } from '../lib/types';

type StatusFilter = 'all' | WordStatus;

const customWordSchema = z.object({
  term: z.string().trim().min(1).max(80),
  translation_uk: z.string().trim().min(1).max(200),
  pos: z.string().trim().max(30),
  ipa: z.string().trim().max(80),
  definition_en: z.string().trim().max(400),
  example_en: z.string().trim().max(400),
});

const inputClass = 'min-h-11 rounded-md border border-border bg-surface px-3 text-base font-normal';

function AddWordForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('english-words');
  const add = useAddCustomWord();
  const [values, setValues] = useState({
    term: '',
    translation_uk: '',
    pos: '',
    ipa: '',
    definition_en: '',
    example_en: '',
  });
  const [invalid, setInvalid] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = customWordSchema.safeParse(values);
    setInvalid(!parsed.success);
    setDuplicate(false);
    if (!parsed.success) return;
    add.mutate(parsed.data, {
      onSuccess: onClose,
      // 23505 = unique violation (the same term already exists in the user's own words)
      onError: (err) => setDuplicate((err as { code?: string }).code === '23505'),
    });
  };

  const field = (key: keyof typeof values, label: string, required = false) => (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        value={values[key]}
        onChange={set(key)}
        required={required}
        autoComplete="off"
        className={inputClass}
      />
    </label>
  );

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <h2 className="text-lg font-bold">{t('dict.addTitle')}</h2>
        {field('term', t('dict.term'), true)}
        {field('translation_uk', t('dict.translation'), true)}
        <div className="grid gap-3 sm:grid-cols-2">
          {field('pos', t('dict.pos'))}
          {field('ipa', t('dict.ipa'))}
        </div>
        {field('definition_en', t('dict.definition'))}
        {field('example_en', t('dict.example'))}
        {invalid && (
          <p role="alert" className="text-sm text-danger">
            {t('dict.required')}
          </p>
        )}
        {duplicate && (
          <p role="alert" className="text-sm text-danger">
            {t('dict.duplicate')}
          </p>
        )}
        {add.isError && !duplicate && (
          <p role="alert" className="text-sm text-danger">
            {t('dict.saveError')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('dict.cancel')}
          </Button>
          <Button type="submit" disabled={add.isPending}>
            {t('dict.save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function WordRow({ word, state }: { word: Word; state: UserWord | undefined }) {
  const { t } = useTranslation('english-words');
  const markKnown = useMarkKnown();
  const remove = useDeleteCustomWord();
  const status: WordStatus = state?.status ?? 'new';
  const custom = word.owner_id !== null;

  return (
    <li>
      <details className="rounded-md border border-border bg-surface-muted p-3">
        <summary className="flex cursor-pointer flex-wrap items-center gap-2">
          <span className="font-semibold">{word.term}</span>
          <span className="text-sm text-text-muted">{word.ipa}</span>
          <span className="flex-1 text-text-muted">— {word.translation_uk}</span>
          {custom && <Badge>{t('dict.custom')}</Badge>}
          <Badge>{t(`dict.${status}`)}</Badge>
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          {word.definition_en && (
            <p>
              <span className="font-semibold">{t('card.definition')}: </span>
              {word.definition_en}
            </p>
          )}
          {word.example_en && (
            <p className="text-text-muted italic">
              <span className="font-semibold not-italic">{t('card.example')}: </span>
              {word.example_en}
            </p>
          )}
          <p className="text-sm text-text-muted">
            {word.topics.map((topic) => t(`topics.${topic}`, { defaultValue: topic })).join(' · ')}
            {word.level && ` · ${word.level}`}
            {state && ` · ${t('dict.dueOn', { date: state.due_on })}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {canSpeak() && (
              <Button
                variant="soft"
                aria-label={t('card.listen', { term: word.term })}
                onClick={() => speak(word.term)}
                className="px-3"
              >
                <Volume2 size={18} aria-hidden="true" />
              </Button>
            )}
            {status !== 'known' && (
              <Button
                variant="soft"
                disabled={markKnown.isPending}
                onClick={() => markKnown.mutate({ wordId: word.id, current: state })}
              >
                {t('dict.markKnown')}
              </Button>
            )}
            {custom && (
              <Button
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(t('dict.confirmRemove', { term: word.term }))) {
                    remove.mutate(word.id);
                  }
                }}
              >
                <Trash2 size={16} aria-hidden="true" /> {t('dict.remove')}
              </Button>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

export default function DictionaryPage() {
  const { t } = useTranslation('english-words');
  const words = useDictionary();
  const userWords = useUserWords();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [topic, setTopic] = useState('all');
  const [adding, setAdding] = useState(false);

  const states = useMemo(
    () => new Map((userWords.data ?? []).map((u) => [u.word_id, u])),
    [userWords.data],
  );
  const topics = useMemo(
    () => [...new Set((words.data ?? []).flatMap((w) => w.topics))].sort(),
    [words.data],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (words.data ?? []).filter((w) => {
      const s = states.get(w.id)?.status ?? 'new';
      return (
        (status === 'all' || s === status) &&
        (topic === 'all' || w.topics.includes(topic)) &&
        (!q || w.term.toLowerCase().includes(q) || w.translation_uk.toLowerCase().includes(q))
      );
    });
  }, [words.data, states, query, status, topic]);

  if (words.isError || userWords.isError) {
    return <EmptyState emoji="🌧️" title={t('hub.error')} />;
  }
  if (!words.data || !userWords.data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link
          to="/m/english-words"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-ink"
        >
          <ChevronLeft size={16} aria-hidden="true" /> {t('dict.back')}
        </Link>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t('dict.heading')}</h1>
          {!adding && (
            <Button variant="soft" onClick={() => setAdding(true)}>
              <Plus size={18} aria-hidden="true" /> {t('dict.add')}
            </Button>
          )}
        </div>
      </header>

      {adding && <AddWordForm onClose={() => setAdding(false)} />}

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('dict.search')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('dict.status')}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className={inputClass}
            >
              {(['all', 'new', 'learning', 'known'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`dict.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('dict.topic')}
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass}>
              <option value="all">{t('dict.all')}</option>
              {topics.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`topics.${tp}`, { defaultValue: tp })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm text-text-muted" aria-live="polite">
          {t('dict.count', { count: filtered.length })}
        </p>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState emoji="🔎" title={t('dict.empty')} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, 200).map((w) => (
            <WordRow key={w.id} word={w} state={states.get(w.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
