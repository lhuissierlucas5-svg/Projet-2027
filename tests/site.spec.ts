import { test, expect } from '@playwright/test';

const publicPages = [
  '/',
  '/candidats',
  '/candidatures',
  '/propositions',
  '/comparer',
  '/primaires',
  '/sondages',
  '/agenda',
  '/suivi',
  '/admin',
];

for (const path of publicPages) {
  test(`${path} reste lisible et accessible`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);

    if (path === '/admin') {
      await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toHaveCount(0);
    }
  });
}

const activeNavigation: Array<[string, string]> = [
  ['/', 'Accueil'],
  ['/candidats', 'Candidats'],
  ['/candidats/edouard-philippe', 'Candidats'],
  ['/comparer', 'Comparer'],
  ['/propositions', 'Propositions'],
  ['/primaires', 'Primaires'],
  ['/candidatures', 'Candidatures'],
  ['/sondages', 'Sondages'],
  ['/agenda', 'Agenda'],
];

for (const [path, label] of activeNavigation) {
  test(`${path} affiche un seul onglet actif : ${label}`, async ({ page }) => {
    await page.goto(path);
    const current = page.getByRole('navigation', { name: 'Navigation principale' }).locator('a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText(label);
  });
}

const sourcePages: Array<[string, string]> = [
  ['/candidatures', '.contender-footer a'],
  ['/propositions', '.proposal-source a'],
  ['/comparer', '.compare-card-footer a'],
  ['/primaires', 'a.source-link'],
  ['/sondages', 'a.source-link'],
  ['/agenda', '.agenda-meta-v2 a'],
];

for (const [path, selector] of sourcePages) {
  test(`les sources de ${path} sont cliquables et sûres`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator(selector);
    expect(await links.count()).toBeGreaterThan(0);

    const limit = Math.min(await links.count(), 30);
    for (let index = 0; index < limit; index += 1) {
      const link = links.nth(index);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
      expect(await link.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return top === el || (!!top && el.contains(top));
      })).toBe(true);
    }
  });
}

test('l’agenda conserve un repère visuel pour chaque événement', async ({ page }) => {
  await page.goto('/agenda');
  const cards = page.locator('.agenda-card-v2');
  expect(await cards.count()).toBeGreaterThan(0);

  for (const card of await cards.all()) {
    await expect(card.locator('.agenda-visual')).toHaveCount(1);
  }
});

test('les sondages respectent l’ordre premier tour puis second tour', async ({ page }) => {
  await page.goto('/sondages');
  const labels = (await page.locator('.poll-panel-v2 .tag.subtle').allTextContents()).map(text => text.trim().toLowerCase());
  const firstRound = labels.findIndex(text => text.includes('1er tour'));
  const secondRound = labels.findIndex(text => text.includes('2e tour'));

  if (firstRound >= 0 && secondRound >= 0) {
    expect(firstRound).toBeLessThan(secondRound);
  }
});

test('le serveur répond avec une base disponible', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect((await response.json()).status).toBe('ok');
});
