import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/core/api/supabase';
import { useAuth } from '@/core/auth/AuthProvider';
import { Button, Card, EmptyState } from '@/shared/ui';

const schema = z.object({ email: z.email(), password: z.string().min(1) });
type Values = z.infer<typeof schema>;

const inputClass =
  'min-h-11 w-full rounded-md border border-border bg-surface px-4 text-text placeholder:text-text-muted';

export function LoginPage() {
  const { t } = useTranslation();
  const { session, needsMfa, signIn, verifyMfa, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [mfaFailed, setMfaFailed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (!isSupabaseConfigured) {
    return (
      <EmptyState emoji="🔧" title={t('auth.notConfigured')}>
        {t('auth.notConfiguredHint')}
      </EmptyState>
    );
  }
  if (session && !needsMfa) return <Navigate to={from} replace />;

  const onSubmit = async (values: Values) => {
    setFailed(false);
    const { error, mfa } = await signIn(values.email, values.password);
    if (error) setFailed(true);
    else if (!mfa) navigate(from, { replace: true });
  };

  const onVerify = async () => {
    setMfaFailed(false);
    setVerifying(true);
    const ok = await verifyMfa(code.trim());
    setVerifying(false);
    if (ok) navigate(from, { replace: true });
    else setMfaFailed(true);
  };

  if (session && needsMfa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] p-4">
        <Card className="w-full max-w-sm">
          <h1 className="mb-1 text-2xl font-bold">{t('auth.mfaTitle')}</h1>
          <p className="mb-5 text-text-muted">{t('auth.mfaHint')}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onVerify();
            }}
            className="grid gap-4"
          >
            <label className="grid gap-1 font-semibold">
              {t('auth.mfaCode')}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            {mfaFailed && (
              <p role="alert" className="text-sm text-danger">
                {t('auth.mfaInvalid')}
              </p>
            )}
            <Button type="submit" disabled={verifying || code.length !== 6}>
              {t('auth.mfaSubmit')}
            </Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              {t('auth.mfaCancel')}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">{t('auth.title')}</h1>
        <p className="mb-5 text-text-muted">{t('auth.subtitle')}</p>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="grid gap-4">
          <label className="grid gap-1 font-semibold">
            {t('auth.email')}
            <input
              type="email"
              autoComplete="username"
              className={inputClass}
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && (
              <span role="alert" className="text-sm text-danger">
                {t('auth.required')}
              </span>
            )}
          </label>
          <label className="grid gap-1 font-semibold">
            {t('auth.password')}
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && (
              <span role="alert" className="text-sm text-danger">
                {t('auth.required')}
              </span>
            )}
          </label>
          {failed && (
            <p role="alert" className="text-sm text-danger">
              {t('auth.invalid')}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {t('auth.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
