import { expect, test } from '@playwright/test';
import { installFakeBackend } from './fakeBackend';

test('web app manifest is installable', async ({ page, request }) => {
  await installFakeBackend(page);
  await page.goto('/login');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/', lang: 'uk' });

  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons as { src: string }[]) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
  }
});

test('the app ships a service worker and an apple touch icon', async ({ request, page }) => {
  await installFakeBackend(page);
  await page.goto('/login');
  expect((await request.get('/sw.js')).ok()).toBe(true);
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(touch!)).ok()).toBe(true);
});

test('theme-color follows the theme without a flash', async ({ page }) => {
  await installFakeBackend(page);
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#221819');
});

test('the top bar toggle switches between light and dark', async ({ page }) => {
  await installFakeBackend(page, { signedIn: true, theme: 'light' });
  await page.goto('/m/dashboard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Увімкнути темну тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Увімкнути світлу тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
