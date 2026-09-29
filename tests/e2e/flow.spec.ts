import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, installFakeBackend } from './fakeBackend';

test.describe('sign in', () => {
  test('a signed-out visitor is sent to the login page', async ({ page }) => {
    await installFakeBackend(page);
    await page.goto('/m/today');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Вхід до Соняшика');
  });

  test('wrong credentials give one generic message', async ({ page }) => {
    await installFakeBackend(page);
    await page.goto('/login');
    await page.getByLabel('Електронна пошта').fill(E2E_EMAIL);
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page.getByRole('alert')).toHaveText(/Не вдалося увійти/);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('valid credentials open the dashboard', async ({ page }) => {
    await installFakeBackend(page);
    await page.goto('/login');
    await page.getByLabel('Електронна пошта').fill(E2E_EMAIL);
    await page.getByLabel('Пароль').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page).toHaveURL(/\/m\/dashboard$/);
    await expect(page.getByText('Соня', { exact: false }).first()).toBeVisible();
  });
});

test.describe('daily set → stats', () => {
  test('completing the day celebrates and shows up in the stats', async ({ page }) => {
    await installFakeBackend(page, { signedIn: true });
    await page.goto('/m/today');

    const task = page.getByRole('listitem').filter({ hasText: 'Привітатись із Соняшиком' });
    await expect(task).toBeVisible();
    await task.getByRole('button', { name: 'Готово' }).click();

    // Day complete card + a new-achievement toast (announced politely).
    await expect(page.getByText('День завершено!')).toBeVisible();
    await expect(page.getByText('Нове досягнення!')).toBeVisible();
    // Confetti runs on its own canvas (created on demand, removed when it finishes).
    await expect(page.locator('canvas').first()).toBeAttached();

    // Stats: 5 XP for the task + 10 XP day bonus.
    await page.goto('/m/stats');
    const totalXp = page.getByText('Усього XP').locator('xpath=following-sibling::p[1]');
    await expect(totalXp).toHaveText('15');
  });

  test('reduced motion: the day still completes, without confetti', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installFakeBackend(page, { signedIn: true });
    await page.goto('/m/today');
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Привітатись із Соняшиком' })
      .getByRole('button', { name: 'Готово' })
      .click();
    await expect(page.getByText('День завершено!')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
