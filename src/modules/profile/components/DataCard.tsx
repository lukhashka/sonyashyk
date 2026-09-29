import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/AuthProvider';
import { deleteMyAccount, exportMyData } from '@/core/auth/account';
import { Button, Card } from '@/shared/ui';

const field = 'min-h-11 w-full rounded-md border border-border bg-surface px-4 text-text';

export function DataCard() {
  const { t } = useTranslation('profile');
  const { session } = useAuth();
  const [exportFailed, setExportFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'wrong_password' | 'error' | null>(null);

  const onExport = async () => {
    setExportFailed(false);
    try {
      await exportMyData();
    } catch {
      setExportFailed(true);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    setResult(null);
    const r = await deleteMyAccount(session?.user.email ?? '', password);
    setBusy(false);
    if (r !== 'ok') setResult(r);
    // On success the session is gone and the route guard sends the user to /login.
  };

  return (
    <Card>
      <h2 className="mb-1 text-xl font-bold">{t('data.heading')}</h2>
      <p className="mb-4 text-text-muted">{t('data.hint')}</p>
      <div className="grid gap-3">
        <Button variant="soft" onClick={() => void onExport()}>
          {t('data.export')}
        </Button>
        {exportFailed && (
          <p role="alert" className="text-danger">
            {t('data.exportError')}
          </p>
        )}

        {!confirming ? (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            {t('data.delete')}
          </Button>
        ) : (
          <form
            className="grid gap-3 rounded-md border border-danger p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onDelete();
            }}
          >
            <p className="font-semibold text-danger">{t('data.deleteWarning')}</p>
            <label className="grid gap-1 font-semibold">
              {t('data.password')}
              <input
                type="password"
                autoComplete="current-password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {result === 'wrong_password' && (
              <p role="alert" className="text-danger">
                {t('data.wrongPassword')}
              </p>
            )}
            {result === 'error' && (
              <p role="alert" className="text-danger">
                {t('data.deleteError')}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="submit" disabled={busy || !password}>
                {t('data.deleteConfirm')}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {t('data.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
