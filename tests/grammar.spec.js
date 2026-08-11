// Playwright test for 93 Grammar Rules website
const { test, expect } = require('@playwright/test');

const BASE_URL = 'file://' + __dirname + '/index.html';

test.describe('Grammar Rules Website', () => {
  
  test('page loads and shows title', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/93 Golden Rules/);
  });

  test('all 93 rule cards exist in DOM', async ({ page }) => {
    await page.goto(BASE_URL);
    for (let i = 1; i <= 93; i++) {
      const rule = page.locator(`#rule${i}`);
      await expect(rule, `Rule ${i} should exist`).toBeAttached();
    }
  });

  test('hero stats show 93 rules and 3443 PYQs', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.stats-badge').last()).toContainText('93 Rules');
    await expect(page.locator('.stats-badge').last()).toContainText('3443 PYQs');
  });

  test('questions.json is loadable', async ({ page }) => {
    await page.goto(BASE_URL);
    const response = await page.evaluate(async () => {
      const r = await fetch('questions.json');
      return r.ok;
    });
    expect(response).toBeTruthy();
  });
});
