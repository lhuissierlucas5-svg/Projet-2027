import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests', fullyParallel:true, forbidOnly:!!process.env.CI,
 retries:process.env.CI?1:0, workers:2,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:process.env.SITE_URL ?? 'http://localhost:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}]
});
