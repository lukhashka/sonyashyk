import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmTotp,
  getTotpFactorId,
  removeTotp,
  startTotpEnrollment,
  type TotpEnrollment,
} from '@/core/auth/account';
import { Button, Card, Skeleton } from '@/shared/ui';

const field = 'min-h-11 w-full rounded-md border border-border bg-surface px-4 text-text';
const factorKey = ['mfa-factor'] as const;

export function TwoFactorCard() {
  const { t } = useTranslation('profile');
  const qc = useQueryClient();
  const { data: factorId, isLoading } = useQuery({ queryKey: factorKey, queryFn: getTotpFactorId });
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [failed, setFailed] = useState(false);

  const start = useMutation({
    mutationFn: startTotpEnrollment,
    onSuccess: (e) => {
      setEnrollment(e);
      setCode('');
      setFailed(false);
    },
  });
  const confirm = useMutation({
    mutationFn: async () => {
      if (!enrollment) return false;
      return confirmTotp(enrollment.factorId, code.trim());
    },
    onSuccess: async (ok) => {
      if (!ok) return setFailed(true);
      setEnrollment(null);
      await qc.invalidateQueries({ queryKey: factorKey });
    },
  });
  const disable = useMutation({
    mutationFn: async () => {
      if (factorId) await removeTotp(factorId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: factorKey }),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <h2 className="mb-1 text-xl font-bold">{t('mfa.heading')}</h2>
      <p className="mb-4 text-text-muted">{t('mfa.hint')}</p>

      {factorId && !enrollment && (
        <div className="grid gap-3">
          <p role="status">{t('mfa.enabled')}</p>
          <Button variant="soft" onClick={() => disable.mutate()} disabled={disable.isPending}>
            {t('mfa.disable')}
          </Button>
          {disable.isError && (
            <p role="alert" className="text-danger">
              {t('mfa.error')}
            </p>
          )}
        </div>
      )}

      {!factorId && !enrollment && (
        <div className="grid gap-3">
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            {t('mfa.enable')}
          </Button>
          {start.isError && (
            <p role="alert" className="text-danger">
              {t('mfa.error')}
            </p>
          )}
        </div>
      )}

      {enrollment && (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            confirm.mutate();
          }}
        >
          <p>{t('mfa.scan')}</p>
          <img
            src={enrollment.qrCode}
            alt={t('mfa.qrAlt')}
            className="mx-auto h-44 w-44 rounded-md bg-white p-2"
          />
          <p className="text-sm text-text-muted">
            {t('mfa.manual')} <code className="break-all">{enrollment.secret}</code>
          </p>
          <label className="grid gap-1 font-semibold">
            {t('mfa.code')}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={field}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {failed && (
            <p role="alert" className="text-danger">
              {t('mfa.invalid')}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={confirm.isPending || code.length !== 6}>
              {t('mfa.confirm')}
            </Button>
            <Button variant="ghost" onClick={() => setEnrollment(null)}>
              {t('mfa.cancel')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
