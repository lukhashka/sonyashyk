import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/core/auth/AuthProvider';
import {
  changePassword,
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/core/auth/account';
import { Button, Card } from '@/shared/ui';

const field = 'min-h-11 w-full rounded-md border border-border bg-surface px-4 text-text';

export function PasswordCard() {
  const { t } = useTranslation('profile');
  const { session } = useAuth();
  const [status, setStatus] = useState<'idle' | 'ok' | 'wrong_current' | 'error'>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordInput) => {
    setStatus('idle');
    const result = await changePassword(session?.user.email ?? '', values);
    setStatus(result);
    if (result === 'ok') reset();
  };

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold">{t('password.heading')}</h2>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="grid gap-4" noValidate>
        <label className="grid gap-1 font-semibold">
          {t('password.current')}
          <input
            type="password"
            autoComplete="current-password"
            className={field}
            {...register('current')}
          />
        </label>
        <label className="grid gap-1 font-semibold">
          {t('password.next')}
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            aria-invalid={Boolean(errors.next)}
            {...register('next')}
          />
          <span className="text-sm font-normal text-text-muted">{t('password.hint')}</span>
          {errors.next && (
            <span role="alert" className="text-sm font-normal text-danger">
              {errors.next.message === 'same' ? t('password.same') : t('password.tooShort')}
            </span>
          )}
        </label>
        <label className="grid gap-1 font-semibold">
          {t('password.confirm')}
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            aria-invalid={Boolean(errors.confirm)}
            {...register('confirm')}
          />
          {errors.confirm && (
            <span role="alert" className="text-sm font-normal text-danger">
              {t('password.mismatch')}
            </span>
          )}
        </label>
        <Button type="submit" disabled={isSubmitting}>
          {t('password.submit')}
        </Button>
        {status === 'ok' && <p role="status">{t('password.done')}</p>}
        {status === 'wrong_current' && (
          <p role="alert" className="text-danger">
            {t('password.wrongCurrent')}
          </p>
        )}
        {status === 'error' && (
          <p role="alert" className="text-danger">
            {t('password.error')}
          </p>
        )}
      </form>
    </Card>
  );
}
