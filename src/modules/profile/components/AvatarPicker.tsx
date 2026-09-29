import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/core/auth/Avatar';
import { useRemoveAvatar, useUploadAvatar, validateAvatarFile } from '@/core/auth/avatarStorage';
import { Button } from '@/shared/ui';

interface Props {
  path: string | null;
  emoji: string;
}

export function AvatarPicker({ path, emoji }: Props) {
  const { t } = useTranslation('profile');
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar(path);
  const remove = useRemoveAvatar(path);
  const [fileError, setFileError] = useState<'type' | 'size' | null>(null);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const problem = validateAvatarFile(file);
    setFileError(problem);
    if (!problem) upload.mutate(file);
  };

  return (
    <div className="grid gap-2">
      <span className="font-semibold">{t('photo.label')}</span>
      <div className="flex items-center gap-4">
        <Avatar path={path} emoji={emoji} size={64} />
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => input.current?.click()} disabled={upload.isPending}>
            {t('photo.upload')}
          </Button>
          {path && (
            <Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {t('photo.remove')}
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label={t('photo.upload')}
          tabIndex={-1}
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-sm text-text-muted">{t('photo.hint')}</p>
      {fileError && (
        <p role="alert" className="text-danger">
          {fileError === 'type' ? t('photo.badType') : t('photo.tooBig')}
        </p>
      )}
      {(upload.isError || remove.isError) && (
        <p role="alert" className="text-danger">
          {t('photo.error')}
        </p>
      )}
    </div>
  );
}
