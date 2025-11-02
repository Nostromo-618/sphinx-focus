import { Page, expect } from '@playwright/test';

/**
 * Accept the disclaimer modal if it's visible
 */
export async function acceptDisclaimer(page: Page) {
  const disclaimerModal = page.locator('#disclaimerModal');
  
  try {
    // Wait a bit for modal to appear
    await disclaimerModal.waitFor({ state: 'visible', timeout: 2000 });
    
    // Click I Agree button
    await page.click('button:has-text("I Agree")');
    
    // Wait for modal to disappear
    await disclaimerModal.waitFor({ state: 'hidden', timeout: 2000 });
  } catch (error) {
    // Disclaimer already accepted or not shown
    console.log('Disclaimer not shown or already accepted');
  }
}

/**
 * Activate focus mode via button
 */
export async function activateFocusMode(page: Page) {
  await page.click('#focusModeBtn');
  await page.locator('.blur-control-layer').waitFor({ state: 'visible', timeout: 2000 });
}

/**
 * Deactivate focus mode via button
 */
export async function deactivateFocusMode(page: Page) {
  await page.click('#focusModeBtn');
  await page.locator('.blur-control-layer').waitFor({ state: 'hidden', timeout: 2000 });
}

/**
 * Check if blur is currently active
 */
export async function isBlurActive(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return (window as any).blurControl?.isBlurActive() || false;
  });
}

/**
 * Get count of focused elements
 */
export async function getFocusedElementsCount(page: Page): Promise<number> {
  return await page.locator('.blur-control-focused').count();
}

/**
 * Verify blur layer properties
 */
export async function verifyBlurLayer(page: Page, expectedProps: {
  backdropFilter?: string;
  backgroundColor?: string;
  zIndex?: string;
}) {
  const layer = page.locator('.blur-control-layer');
  
  if (expectedProps.backdropFilter) {
    const filter = await layer.evaluate(el => 
      window.getComputedStyle(el).backdropFilter
    );
    expect(filter).toContain(expectedProps.backdropFilter);
  }
  
  if (expectedProps.backgroundColor) {
    const bgColor = await layer.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe(expectedProps.backgroundColor);
  }
  
  if (expectedProps.zIndex) {
    const zIndex = await layer.evaluate(el =>
      window.getComputedStyle(el).zIndex
    );
    expect(zIndex).toBe(expectedProps.zIndex);
  }
}

/**
 * Create a test BlurControl instance in the page context
 */
export async function createTestBlurControl(page: Page, options = {}) {
  await page.evaluate((opts) => {
    (window as any).testBlur = new (window as any).BlurControl(opts);
  }, options);
}

/**
 * Get BlurControl options from test instance
 */
export async function getBlurControlOptions(page: Page) {
  return await page.evaluate(() => {
    return (window as any).testBlur?.options || null;
  });
}

/**
 * Clean up test BlurControl instance
 */
export async function cleanupTestBlurControl(page: Page) {
  await page.evaluate(() => {
    if ((window as any).testBlur) {
      (window as any).testBlur.destroy();
      delete (window as any).testBlur;
    }
  });
}