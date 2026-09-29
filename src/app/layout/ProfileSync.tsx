import { useEffect } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useProfile } from '@/core/auth/profile';
import i18n from '@/core/i18n';
import { useUiStore } from '@/core/ui-store';

/** Applies the saved profile preferences (language, theme) to the running app. */
export function ProfileSync() {
  const { data, error } = useProfile();
  const { signOut } = useAuth();
  const setTheme = useUiStore((s) => s.setTheme);

  // PGRST116 = no profile row for this session's user (e.g. the account was deleted in
  // Supabase but the browser still holds its token): drop the orphaned session.
  const orphaned = (error as { code?: string } | null)?.code === 'PGRST116';
  useEffect(() => {
    if (orphaned) void signOut();
  }, [orphaned, signOut]);

  useEffect(() => {
    if (!data) return;
    setTheme(data.theme);
    if (i18n.language !== data.locale) void i18n.changeLanguage(data.locale);
  }, [data, setTheme]);

  return null;
}
