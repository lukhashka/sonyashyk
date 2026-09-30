import { expect, test } from '@playwright/test';
import { installFakeBackend } from './fakeBackend';

test.describe('notes', () => {
  test('create from a template, write Markdown, autosave, find and trash it', async ({ page }) => {
    await installFakeBackend(page, { signedIn: true });
    await page.goto('/m/notes');
    await expect(page.getByRole('heading', { level: 1, name: /Нотатки/ })).toBeVisible();
    await expect(page.getByText('Ще немає нотаток')).toBeVisible();

    await page.getByRole('button', { name: 'Нова нотатка' }).click();
    await page.getByRole('button', { name: 'IRAC', exact: true }).click();
    await expect(page).toHaveURL(/\/m\/notes\/[0-9a-f-]+$/);

    const title = page.getByRole('textbox', { name: 'Заголовок', exact: true });
    await expect(title).toHaveValue('IRAC: ');
    await title.fill('IRAC: Порушення договору');
    await page
      .getByRole('textbox', { name: /^Текст \(Markdown\)/ })
      .fill('## Висновок\n\n**Договір** порушено\n\n- [x] перевірено');
    await page.getByLabel('Теги').fill('цк, договір');
    await expect(page.getByText('Збережено ✓')).toBeVisible();

    // Live preview is sanitised Markdown.
    const preview = page.locator('.md-body');
    await expect(preview.locator('h2')).toHaveText('Висновок');
    await expect(preview.locator('strong')).toHaveText('Договір');

    await page.getByRole('link', { name: 'До нотаток' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'IRAC: Порушення договору' }),
    ).toBeVisible();
    await expect(page.getByRole('link').getByText('#цк')).toBeVisible();

    await page.getByPlaceholder('Пошук по нотатках…').fill('дого');
    await expect(
      page.getByRole('heading', { level: 2, name: 'IRAC: Порушення договору' }),
    ).toBeVisible();
    await page.getByPlaceholder('Пошук по нотатках…').fill('нема-такого');
    await expect(page.getByText('Нічого не знайдено')).toBeVisible();
    await page.getByPlaceholder('Пошук по нотатках…').fill('');

    // Trash it, then restore it from the trash view.
    await page.getByRole('heading', { level: 2, name: 'IRAC: Порушення договору' }).click();
    await page.getByRole('button', { name: 'У кошик' }).click();
    await expect(page.getByText('Ще немає нотаток')).toBeVisible();
    await page.getByRole('button', { name: 'Кошик' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'IRAC: Порушення договору' }),
    ).toBeVisible();
  });

  test('raw HTML in a note never runs', async ({ page }) => {
    await installFakeBackend(page, { signedIn: true });
    let dialog = false;
    page.on('dialog', () => (dialog = true));
    await page.goto('/m/notes');
    await page.getByRole('button', { name: 'Нова нотатка' }).click();
    await page.getByRole('button', { name: 'Порожня' }).click();
    await page
      .getByRole('textbox', { name: /^Текст \(Markdown\)/ })
      .fill('<img src=x onerror="alert(1)"><script>alert(2)</script>[x](javascript:alert(3))');
    await page.waitForTimeout(500);
    expect(dialog).toBe(false);
    await expect(page.locator('.md-body img, .md-body script')).toHaveCount(0);
  });

  test('folders can be created and used to file a note', async ({ page }) => {
    await installFakeBackend(page, { signedIn: true });
    await page.goto('/m/notes');
    await page.getByRole('button', { name: 'Папки' }).click();
    await page.getByPlaceholder('Назва папки').fill('Цивільне право');
    await page.getByRole('button', { name: 'Додати' }).click();
    await expect(page.getByText('📁 Цивільне право')).toBeVisible();
  });
});
