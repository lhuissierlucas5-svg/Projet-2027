import { test, expect } from '@playwright/test';
for(const path of ['/','/candidats','/candidatures','/propositions','/comparer','/primaires','/sondages','/agenda','/suivi','/admin']) {
 test(`${path} reste lisible et accessible`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(path);
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Navigation principale'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  if(path==='/admin'){
   await expect(page.getByRole('button',{name:'Se connecter',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'Enregistrer',exact:true})).toHaveCount(0);
  }
 });
}
test('les boutons source des candidatures ne sont pas recouverts',async({page})=>{
 await page.goto('/candidatures');
 const links=page.locator('.contender-footer a');
 expect(await links.count()).toBeGreaterThan(0);
 for(const link of await links.all()){
  await link.scrollIntoViewIfNeeded();
  expect(await link.evaluate(el=>{
   const rect=el.getBoundingClientRect();const top=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   return top===el||!!top&&el.contains(top);
  })).toBe(true);
  expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
 }
});
test('le serveur répond avec une base disponible',async({request})=>{
 const response=await request.get('/api/health');expect(response.status()).toBe(200);
 expect((await response.json()).status).toBe('ok');
});
