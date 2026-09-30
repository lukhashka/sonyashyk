import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { profileSchema, useProfile, useUpdateProfile } from '@/core/auth/profile';
import { resolveTheme, useUiStore } from '@/core/ui-store';

/** One-tap light/dark switch; the choice is saved to the profile so it follows the user. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const { data: profile } = useProfile();
  const update = useUpdateProfile();

  const isDark =
    resolveTheme(theme, window.matchMedia('(prefers-color-scheme: dark)').matches) === 'dark';
  const next = isDark ? 'light' : 'dark';
  const Icon = isDark ? Sun : Moon;

  const toggle = () => {
    setTheme(next);
    if (profile) {
      update.mutate({ ...profileSchema.parse(profile), theme: next });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t(isDark ? 'themeToLight' : 'themeToDark')}
      title={t(isDark ? 'themeToLight' : 'themeToDark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-ink hover:bg-nude-soft"
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
