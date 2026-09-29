import type { AppModule } from './types';
import { dashboardModule } from '@/modules/dashboard';
import { profileModule } from '@/modules/profile';
import { todayModule } from '@/modules/today';

/** The ONLY place where modules are enabled. */
export const registry: AppModule[] = [dashboardModule, todayModule, profileModule];

export function getEnabledModules(
  modules: AppModule[] = registry,
  enabledIds?: string[],
): AppModule[] {
  return modules
    .filter((m) => (enabledIds ? enabledIds.includes(m.id) : m.enabledByDefault))
    .sort((a, b) => (a.nav?.order ?? 999) - (b.nav?.order ?? 999));
}

export function assertValidRegistry(modules: AppModule[]): void {
  const seen = new Set<string>();
  for (const m of modules) {
    if (!/^[a-z][a-z0-9-]*$/.test(m.id)) throw new Error(`Invalid module id: ${m.id}`);
    if (seen.has(m.id)) throw new Error(`Duplicate module id: ${m.id}`);
    seen.add(m.id);
  }
}
