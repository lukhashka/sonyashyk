import { Navigate, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { isSupabaseConfigured } from '@/core/api/supabase';
import { EmptyState, Skeleton } from '@/shared/ui';
import { useAuth } from './AuthProvider';

/** UX guard only. Real protection is Row Level Security in the database. */
export function RequireAuth() {
  const { t } = useTranslation();
  const { session, loading, needsMfa } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <EmptyState emoji="🔧" title={t('auth.notConfigured')}>
        {t('auth.notConfiguredHint')}
      </EmptyState>
    );
  }
  if (loading) return <Skeleton className="m-6 h-40" />;
  if (!session || needsMfa)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
