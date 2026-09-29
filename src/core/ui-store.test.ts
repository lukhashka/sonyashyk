import { resolveTheme } from './ui-store';

it('resolves system theme from preference', () => {
  expect(resolveTheme('system', true)).toBe('dark');
  expect(resolveTheme('system', false)).toBe('light');
  expect(resolveTheme('dark', false)).toBe('dark');
});
