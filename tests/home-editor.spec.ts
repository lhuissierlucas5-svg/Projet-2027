import { test, expect, type Page } from '@playwright/test';
import { defaultHomeContent, homeFields } from '../lib/home-content';

// Auth and writes are intercepted in this browser only: never edit production in UI tests.
async function mockAdmin(page: Page, outcome: 'success' | 'conflict' | 'denied' = 'success') {
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'editor@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const session = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user };
  await page.addInitScript(value => localStorage.setItem('sb-lwqxkjrzyfnyxrdxcpmm-auth-token', JSON.stringify(value)), session);
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/site_admins?*', route => route.fulfill({ json: { user_id: user.id } }));
  let saved = { ...defaultHomeContent, id: 'home', updated_at: '2026-09-20T00:00:00.000Z' };
  const writes: Record<string, string>[] = [];
  await page.route('**/rest/v1/homepage_content?*', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      writes.push(payload);
      expect(new URL(route.request().url()).searchParams.get('updated_at')).toBe(`eq.${saved.updated_at}`);
      if (outcome === 'conflict') return route.fulfill({ json: null });
      if (outcome === 'denied') return route.fulfill({ status: 403, json: { message: 'Denied', code: '42501' } });
      saved = { ...saved, ...payload, updated_at: '2026-09-20T01:00:00.000Z' };
    }
    await route.fulfill({ json: saved });
  });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Modifier la page d’accueil', exact: true })).toBeVisible();
  await expect(page.getByLabel('Titre principal', { exact: false })).toHaveValue(defaultHomeContent.title);
  return writes;
}

test('accueil : drapeau, méthode, navigation clavier et absence des décors remplacés', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Drapeau français' })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.editorial-figures > div')).toHaveCount(3);
  await expect(page.locator('.editorial-method')).toContainText('Notre méthode', { ignoreCase: true });
  await expect(page.locator('.hero-visual,.tile-star,.visual-spark,.french-flag')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contenu')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('éditeur : aperçu, publication et relecture des textes enregistrés', async ({ page }) => {
  const writes = await mockAdmin(page);
  const save = page.getByRole('button', { name: 'Enregistrer et publier', exact: true });
  await expect(save).toBeDisabled();
  await page.getByLabel('Titre principal', { exact: false }).fill('Comprendre la campagne française');
  await page.getByLabel('Bouton vers les candidats').fill('Lire les profils');
  await page.getByLabel('Note méthodologique').fill('Consultez les sources datées avant de comparer.');
  await expect(page.locator('.admin-home-preview .editorial-title')).toHaveText('Comprendre la campagne française');
  expect(writes).toHaveLength(0);
  await save.click();
  await expect(page.getByRole('status')).toContainText('Accueil enregistré et publié');
  expect(writes).toHaveLength(1);
  expect(Object.keys(writes[0]).sort()).toEqual(homeFields.map(field => field.key).sort());
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Titre principal', { exact: false })).toHaveValue('Comprendre la campagne française');
  await expect(page.getByLabel('Bouton vers les candidats')).toHaveValue('Lire les profils');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

for (const outcome of ['conflict', 'denied'] as const) {
  test(`éditeur : conserve le brouillon lors d’un ${outcome}`, async ({ page }) => {
    await mockAdmin(page, outcome);
    await page.getByLabel('Titre principal', { exact: false }).fill('Brouillon conservé');
    await page.getByRole('button', { name: 'Enregistrer et publier', exact: true }).click();
    await expect(page.getByRole('status')).toContainText(outcome === 'conflict' ? 'Rien n’a été écrasé' : 'Enregistrement refusé');
    await expect(page.getByLabel('Titre principal', { exact: false })).toHaveValue('Brouillon conservé');
    if (outcome === 'conflict') await expect(page.getByRole('button', { name: 'Enregistrer et publier', exact: true })).toBeDisabled();
  });
}

test('éditeur : validation, annulation et protection au changement de rubrique', async ({ page }) => {
  const writes = await mockAdmin(page);
  const title = page.getByLabel('Titre principal', { exact: false });
  await title.fill('   ');
  await page.getByRole('button', { name: 'Enregistrer et publier', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Complète tous les champs');
  expect(writes).toHaveLength(0);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect(title).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Annuler les modifications' }).click();
  await expect(title).toHaveValue(defaultHomeContent.title);
});

test('éditeur : un compte sans rôle administrateur ne voit aucun réglage', async ({ page }) => {
  await page.route('**/auth/v1/user', route => route.fulfill({ json: { id: '00000000-0000-4000-8000-000000000002', email: 'reader@example.test' } }));
  await page.addInitScript(() => localStorage.setItem('sb-lwqxkjrzyfnyxrdxcpmm-auth-token', JSON.stringify({ access_token: 'test', refresh_token: 'test', expires_at: Math.floor(Date.now()/1000)+3600, user: { id: '00000000-0000-4000-8000-000000000002' } })));
  await page.route('**/rest/v1/site_admins?*', route => route.fulfill({ json: null }));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Accès non activé' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer et publier', exact: true })).toHaveCount(0);
});
