// Playwright test for 72 Grammar Rules website
const { test, expect } = require('@playwright/test');

const BASE_URL = 'file://' + __dirname + '/index.html';

test.describe('Grammar Rules Website', () => {
  
  test('page loads and shows title', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/72 Golden Rules/);
  });

  test('all 72 rule cards exist in DOM', async ({ page }) => {
    await page.goto(BASE_URL);
    for (let i = 1; i <= 72; i++) {
      const rule = page.locator(`#rule${i}`);
      await expect(rule, `Rule ${i} should exist`).toBeAttached();
    }
  });

  test('all rule cards have rule-header and rule-body', async ({ page }) => {
    await page.goto(BASE_URL);
    for (let i = 1; i <= 72; i++) {
      const header = page.locator(`#rule${i} .rule-header`);
      const body = page.locator(`#rule${i} .rule-body`);
      await expect(header, `Rule ${i} header`).toBeAttached();
      await expect(body, `Rule ${i} body`).toBeAttached();
    }
  });

  test('all rule cards become visible (not blank white)', async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    for (let i = 1; i <= 72; i++) {
      const rule = page.locator(`#rule${i}`);
      // Scroll to the rule
      await rule.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      
      // Check it has the 'visible' class (from IntersectionObserver)
      const hasVisible = await rule.evaluate(el => el.classList.contains('visible'));
      expect(hasVisible, `Rule ${i} should be visible`).toBe(true);
      
      // Check opacity is not 0
      const opacity = await rule.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity), `Rule ${i} opacity should be > 0`).toBeGreaterThan(0);
    }
  });

  test('sidebar navigation has all 72 rules', async ({ page }) => {
    await page.goto(BASE_URL);
    for (let i = 1; i <= 72; i++) {
      const navLink = page.locator(`.nav-link[data-target="rule${i}"]`);
      await expect(navLink, `Nav link for rule ${i}`).toBeAttached();
    }
  });

  test('clicking sidebar nav scrolls to rule', async ({ page }) => {
    await page.goto(BASE_URL);
    const navLink = page.locator('.nav-link[data-target="rule13"]');
    await navLink.click();
    await page.waitForTimeout(500);
    const rule13 = page.locator('#rule13');
    await expect(rule13).toBeInViewport();
  });

  test('search functionality works', async ({ page }) => {
    await page.goto(BASE_URL);
    const searchInput = page.locator('.search-input');
    await searchInput.fill('conditional');
    await page.waitForTimeout(500);
    
    // Rule 14 (Conditional Sentences) should be visible
    const rule14 = page.locator('#rule14');
    await expect(rule14).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE_URL);
    const themeToggle = page.locator('.theme-toggle');
    await themeToggle.click();
    const theme = await page.evaluate(() => document.body.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('rules 61-72 have proper structure (header closes before body)', async ({ page }) => {
    await page.goto(BASE_URL);
    for (let i = 61; i <= 72; i++) {
      const rule = page.locator(`#rule${i}`);
      const header = rule.locator('.rule-header');
      const body = rule.locator('.rule-body');
      
      // Both should exist
      await expect(header, `Rule ${i} header`).toBeAttached();
      await expect(body, `Rule ${i} body`).toBeAttached();
      
      // Body should NOT be nested inside header
      const bodyInsideHeader = await body.evaluate(
        (el, hdr) => hdr.contains(el),
        await header.elementHandle()
      );
      expect(bodyInsideHeader, `Rule ${i} body should NOT be inside header`).toBe(false);
    }
  });

  test('duplicate analysis section removed', async ({ page }) => {
    await page.goto(BASE_URL);
    const analysisSections = page.locator('#analysis');
    const count = await analysisSections.count();
    expect(count, 'Should have exactly 1 analysis section').toBe(1);
  });

  test('no broken HTML - page has proper closing tags', async ({ page }) => {
    await page.goto(BASE_URL);
    // Check that main content area exists
    const main = page.locator('.main-content');
    await expect(main).toBeAttached();
    
    // Check rules-grid exists
    const grid = page.locator('.rules-grid');
    await expect(grid).toBeAttached();
    
    // Check back-to-top button exists
    const backToTop = page.locator('.back-to-top');
    await expect(backToTop).toBeAttached();
  });
});
