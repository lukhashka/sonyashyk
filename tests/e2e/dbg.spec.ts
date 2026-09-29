import { test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, installFakeBackend } from './fakeBackend';
test('dbg', async ({ page }) => {
  const b = await installFakeBackend(page);
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('requestfailed', (r) => console.log('REQFAIL', r.url(), r.failure()?.errorText));
  await page.goto('/login');
  await page.getByLabel('Електронна пошта').fill(E2E_EMAIL);
  await page.getByLabel('Пароль').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await page.waitForTimeout(2000);
  console.log(page.url(), b.calls);
  console.log(await page.evaluate(() => JSON.stringify(Object.keys(localStorage))));
});
