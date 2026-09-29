import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { installFakeBackend } from './fakeBackend';

const PAGES = [
  { name: 'dashboard', path: '/m/dashboard' },
  { name: 'today', path: '/m/today' },
  { name: 'stats', path: '/m/stats' },
  { name: 'profile', path: '/m/profile' },
  { name: 'english words', path: '/m/english-words' },
  { name: 'dictionary', path: '/m/english-words/dictionary' },
];

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes[0]?.target.join(' ')}`,
  );
  expect(summary, 'axe violations').toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`a11y · ${theme} theme`, () => {
    test(`login page`, async ({ page }) => {
      await installFakeBackend(page);
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto('/login');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await scan(page);
    });

    for (const p of PAGES) {
      test(p.name, async ({ page }) => {
        await installFakeBackend(page, { signedIn: true, theme });
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
        await page.goto(p.path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('main')).toBeVisible();
        // Let lazy pages, skeletons and the route fade settle before scanning.
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);
        await scan(page);
      });
    }
  });
}

test('keyboard: the skip link is the first tab stop and jumps to the content', async ({ page }) => {
  await installFakeBackend(page, { signedIn: true });
  await page.goto('/m/dashboard');
  await expect(page.locator('main#main')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Перейти до вмісту' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});
