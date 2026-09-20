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
    // Sources inside native disclosures become reachable after opening their summary.
    for (const details of await page.locator('details').all()) {
      if (await details.locator(selector).count() > 0 && await details.getAttribute('open') === null) {
        await details.locator('summary').click();
        await expect(details).toHaveAttribute('open', '');
      }
    }
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

const structuredPages: Array<[string,string]> = [
 ['/candidats','.candidate-grid'], ['/candidatures','.contender-grid'],
 ['/propositions','.proposal-spotlight-grid'], ['/agenda','.agenda-card-v2'],
 ['/candidats/edouard-philippe','.candidate-hero-grid-v2'], ['/primaires','.primary-candidate-grid-v2'],
];
for(const [path,selector] of structuredPages) {
 test(`${path} conserve sa grille et ses espacements`,async({page})=>{
  await page.goto(path);
  const grid=page.locator(selector).first();
  await expect(grid).toBeVisible();
  expect(await grid.evaluate(el=>getComputedStyle(el).display)).toBe('grid');
  expect(await grid.evaluate(el=>parseFloat(getComputedStyle(el).gap))).toBeGreaterThanOrEqual(16);
 });
}
test('les portraits restent grands et les partis identifiables',async({page})=>{
 await page.goto('/candidats');
 const portrait=page.locator('.candidate-photo').first();
 expect((await portrait.boundingBox())?.height).toBeGreaterThanOrEqual(250);
 expect(await page.locator('.candidate-card').first().evaluate(el=>getComputedStyle(el).getPropertyValue('--party').trim())).not.toBe('');
});
test('le comparateur présente chaque ligne comme une fiche visuelle sans classement', async ({ page }) => {
 await page.goto('/comparer');
 const table=page.locator('.comparison-table').first();
 await expect(table).toBeVisible();
 expect(await table.evaluate(el=>getComputedStyle(el).borderCollapse)).toBe('separate');
 const firstRow=table.locator('tbody tr').first();
 await expect(firstRow.locator('.compare-person')).toBeVisible();
 if (await firstRow.locator('.compare-proposal-cell').count()) {
  await expect(firstRow.locator('.compare-lead')).toBeVisible();
 }
});

test('les sondages et le comparateur sont de vrais tableaux',async({page})=>{
 await page.goto('/sondages');
 await expect(page.locator('.poll-results').first()).toBeVisible();
 expect(await page.locator('.poll-results tbody tr').count()).toBeGreaterThan(0);
 await page.goto('/comparer');
 await expect(page.locator('.comparison-table').first()).toBeVisible();
 expect(await page.locator('.comparison-table').first().locator('thead th').count()).toBe(4);
 await page.locator('.comparison-details summary').first().click();
 await expect(page.locator('.comparison-details').first()).toHaveAttribute('open','');
});
test('la charte et les styles structurels sont réellement chargés',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.flag-year-lockup .election-year')).toHaveText('2027');
 expect(await page.locator('.election-year').evaluate(el=>getComputedStyle(el).textShadow)).not.toBe('none');
 expect(await page.locator('.agenda-card-v2').first().evaluate(el=>getComputedStyle(el).display)).toBe('grid');
});


test('l’accueil expose ses repères éditoriaux sans classement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.homepage-figure-grid > div')).toHaveCount(3);
  for (const value of await page.locator('.homepage-figure-grid dd').allTextContents()) {
    expect(Number.parseInt(value.trim(), 10)).toBeGreaterThanOrEqual(0);
  }
  await expect(page.locator('.homepage-methodology p')).toHaveText(/\S/);
});
