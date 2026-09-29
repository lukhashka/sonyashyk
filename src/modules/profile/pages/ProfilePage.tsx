import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/core/auth/AuthProvider';
import {
  profileSchema,
  useProfile,
  useUpdateProfile,
  type ProfileUpdate,
} from '@/core/auth/profile';
import { Button, Card, Skeleton } from '@/shared/ui';
import { AvatarPicker } from '../components/AvatarPicker';
import { DataCard } from '../components/DataCard';
import { PasswordCard } from '../components/PasswordCard';
import { TwoFactorCard } from '../components/TwoFactorCard';

const field = 'min-h-11 w-full rounded-md border border-border bg-surface px-4 text-text';

export default function ProfilePage() {
  const { t } = useTranslation('profile');
  const { signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ProfileUpdate>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (profile) reset(profile);
  }, [profile, reset]);

  if (isLoading || !profile) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <Card>
        <h2 className="mb-4 text-xl font-bold">{t('heading')}</h2>
        <form
          onSubmit={(e) => void handleSubmit((v) => update.mutateAsync(v))(e)}
          className="grid gap-4"
        >
          <label className="grid gap-1 font-semibold">
            {t('displayName')}
            <input className={field} maxLength={60} {...register('display_name')} />
          </label>
          <label className="grid gap-1 font-semibold">
            {t('bio')}
            <input className={field} maxLength={160} {...register('bio')} />
          </label>
          <AvatarPicker path={profile.avatar_url} emoji={profile.avatar_emoji} />
          <label className="grid gap-1 font-semibold">
            {t('avatar')}
            <input className={field} maxLength={16} {...register('avatar_emoji')} />
          </label>
          <label className="grid gap-1 font-semibold">
            {t('timezone')}
            <input className={field} {...register('timezone')} />
          </label>
          <label className="grid gap-1 font-semibold">
            {t('rollover')}
            <input
              type="number"
              min={0}
              max={23}
              className={field}
              {...register('day_rollover_hour', { valueAsNumber: true })}
            />
          </label>
          <label className="grid gap-1 font-semibold">
            {t('goal')}
            <input
              type="number"
              min={0}
              className={field}
              {...register('daily_goal_xp', { valueAsNumber: true })}
            />
          </label>
          <label className="grid gap-1 font-semibold">
            {t('language')}
            <select className={field} {...register('locale')}>
              <option value="uk">Українська</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            {t('theme')}
            <select className={field} {...register('theme')}>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
              <option value="system">{t('themeSystem')}</option>
            </select>
          </label>
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {t('save')}
          </Button>
          {update.isSuccess && !isDirty && <p role="status">{t('saved')}</p>}
          {update.isError && (
            <p role="alert" className="text-danger">
              {t('saveError')}
            </p>
          )}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-bold">{t('security')}</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="soft" onClick={() => void signOut()}>
            {t('signOut')}
          </Button>
          <Button variant="ghost" onClick={() => void signOut(true)}>
            {t('signOutAll')}
          </Button>
        </div>
      </Card>

      <PasswordCard />
      <TwoFactorCard />
      <DataCard />
    </div>
  );
}
