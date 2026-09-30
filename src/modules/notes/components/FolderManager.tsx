import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { useDeleteFolder, useSaveFolder } from '../lib/queries';
import type { Folder } from '../lib/types';

const field = 'min-h-11 flex-1 rounded-md border border-border bg-surface px-3 text-base';

export function FolderManager({
  folders,
  onDeleted,
}: {
  folders: Folder[];
  onDeleted: (id: string) => void;
}) {
  const { t } = useTranslation('notes');
  const save = useSaveFolder();
  const del = useDeleteFolder();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Folder | null>(null);
  const [error, setError] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setError(false);
    try {
      await save.mutateAsync({ id: editing?.id, name });
      setName('');
      setEditing(null);
    } catch {
      setError(true); // most likely a duplicate name
    }
  };

  return (
    <Card className="grid gap-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          aria-label={t('folder.name')}
          placeholder={t('folder.name')}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {editing ? t('folder.rename') : t('folder.add')}
        </Button>
        {editing && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(null);
              setName('');
            }}
          >
            {t('action.cancel')}
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t('folder.exists')}
        </p>
      )}
      <ul className="grid gap-2">
        {folders.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2">
            <span>📁 {f.name}</span>
            <span className="flex gap-1">
              <Button
                variant="ghost"
                aria-label={`${t('folder.rename')}: ${f.name}`}
                onClick={() => {
                  setEditing(f);
                  setName(f.name);
                }}
              >
                <Pencil size={16} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                aria-label={`${t('folder.delete')}: ${f.name}`}
                onClick={() => {
                  if (!window.confirm(t('folder.deleteConfirm', { name: f.name }))) return;
                  void del.mutateAsync(f.id).then(() => onDeleted(f.id));
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
