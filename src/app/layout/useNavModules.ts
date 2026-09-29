import { useMemo } from 'react';
import { getEnabledModules } from '@/core/modules/registry';

/** Modules visible in navigation, split by placement. */
export function useNavModules() {
  return useMemo(() => {
    const nav = getEnabledModules().filter((m) => m.nav);
    return {
      main: nav.filter((m) => m.nav?.placement === 'main'),
      more: nav.filter((m) => m.nav?.placement === 'more'),
    };
  }, []);
}
