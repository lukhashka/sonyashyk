import { useEffect } from 'react';
import { useProfile } from '@/core/auth/profile';
import i18n from '@/core/i18n';
import { useUiStore } from '@/core/ui-store';

/** Applies the saved profile preferences (language, theme) to the running app. */
export function ProfileSync() {
  const { data } = useProfile();
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    if (!data) return;
    setTheme(data.theme);
    if (i18n.language !== data.locale) void i18n.changeLanguage(data.locale);
  }, [data, setTheme]);

  return null;
}
