import { Sun } from 'lucide-react';
import { assertValidRegistry, getEnabledModules } from './registry';
import type { AppModule } from './types';

const mk = (id: string, over: Partial<AppModule> = {}): AppModule => ({
  id,
  version: '1.0.0',
  title: `${id}:title`,
  icon: Sun,
  enabledByDefault: true,
  ...over,
});

describe('module registry', () => {
  it('sorts by nav order and respects enabledByDefault', () => {
    const mods = [
      mk('b', { nav: { order: 2, placement: 'main' } }),
      mk('a', { nav: { order: 1, placement: 'main' } }),
      mk('c', { enabledByDefault: false }),
    ];
    expect(getEnabledModules(mods).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('uses explicit enabled ids when provided', () => {
    const mods = [mk('a'), mk('c', { enabledByDefault: false })];
    expect(getEnabledModules(mods, ['c']).map((m) => m.id)).toEqual(['c']);
  });

  it('rejects duplicate and malformed ids', () => {
    expect(() => assertValidRegistry([mk('a'), mk('a')])).toThrow(/Duplicate/);
    expect(() => assertValidRegistry([mk('Bad_Id')])).toThrow(/Invalid/);
  });
});
