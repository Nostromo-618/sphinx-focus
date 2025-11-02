import { test, expect } from '@playwright/test';
import { 
  acceptDisclaimer, 
  createTestBlurControl,
  getBlurControlOptions,
  cleanupTestBlurControl,
  getFocusedElementsCount
} from './helpers/blurControlHelpers';

test.describe('BlurControl - Core Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await acceptDisclaimer(page);
  });
  
  test.afterEach(async ({ page }) => {
    await cleanupTestBlurControl(page);
  });

  test.describe('Constructor and Initialization', () => {
    
    test('should create BlurControl instance with default options', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        return {
          hasInstance: blur !== null,
          isActive: blur.isBlurActive(),
          blurAmount: blur.options.blurAmount,
          zIndexBase: blur.options.zIndexBase,
          highlightFocused: blur.options.highlightFocused
        };
      });
      
      expect(result.hasInstance).toBe(true);
      expect(result.isActive).toBe(false);
      expect(result.blurAmount).toBe('8px');
      expect(result.zIndexBase).toBe(9000);
      expect(result.highlightFocused).toBe(true);
    });

    test('should create BlurControl with custom options', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl({
          blurAmount: '15px',
          backdropColor: 'rgba(255, 0, 0, 0.5)',
          highlightFocused: false,
          zIndexBase: 8000
        });
        return blur.options;
      });
      
      expect(result.blurAmount).toBe('15px');
      expect(result.backdropColor).toBe('rgba(255, 0, 0, 0.5)');
      expect(result.highlightFocused).toBe(false);
      expect(result.zIndexBase).toBe(8000);
    });
  });

  test.describe('activate() Method', () => {
    
    test('should activate blur with no exclusions', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate();
        (window as any).testBlur = blur;
      });
      
      // Check blur layer exists
      const blurLayer = page.locator('.blur-control-layer');
      await expect(blurLayer).toBeVisible();
      
      // Check blur is active
      const isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(true);
    });

    test('should activate blur with specific exclusions', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display', '.timer-controls']);
        (window as any).testBlur = blur;
      });
      
      // Check focused elements have correct class
      const focusedElements = await getFocusedElementsCount(page);
      expect(focusedElements).toBeGreaterThan(0);
      
      // Check timer display has higher z-index
      const timerZIndex = await page.locator('.timer-display').evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(parseInt(timerZIndex)).toBeGreaterThan(9000);
    });

    test('should apply highlight to focused elements when enabled', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl({ highlightFocused: true });
        blur.activate(['.timer-display']);
        (window as any).testBlur = blur;
      });
      
      // Check box shadow is applied
      const boxShadow = await page.locator('.timer-display').evaluate(el => 
        window.getComputedStyle(el).boxShadow
      );
      expect(boxShadow).toContain('rgb');
    });

    test('should not apply highlight when disabled', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl({ highlightFocused: false });
        blur.activate(['.timer-display']);
        (window as any).testBlur = blur;
      });
      
      // Check that inline box shadow is not set
      const inlineBoxShadow = await page.locator('.timer-display').evaluate(el => 
        (el as HTMLElement).style.boxShadow
      );
      expect(inlineBoxShadow).toBe('');
    });

    test('should add blur-control-focused class to excluded elements', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
      });
      
      const hasFocusedClass = await page.locator('.timer-display').evaluate(el =>
        el.classList.contains('blur-control-focused')
      );
      expect(hasFocusedClass).toBe(true);
    });
  });

  test.describe('deactivate() Method', () => {
    
    test('should deactivate blur and remove layer', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.deactivate();
        (window as any).testBlur = blur;
      });
      
      // Check blur layer is removed
      const blurLayerCount = await page.locator('.blur-control-layer').count();
      expect(blurLayerCount).toBe(0);
      
      // Check blur is not active
      const isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(false);
    });

    test('should remove blur-control-focused class on deactivate', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.deactivate();
      });
      
      const focusedCount = await page.locator('.blur-control-focused').count();
      expect(focusedCount).toBe(0);
    });

    test('should restore original z-index on deactivate', async ({ page }) => {
      // Get original z-index
      const originalZIndex = await page.locator('.timer-display').evaluate(el =>
        window.getComputedStyle(el).zIndex
      );
      
      // Activate and deactivate
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.deactivate();
      });
      
      // Check z-index is restored
      const restoredZIndex = await page.locator('.timer-display').evaluate(el =>
        window.getComputedStyle(el).zIndex
      );
      expect(restoredZIndex).toBe(originalZIndex);
    });

    test('should handle deactivate when not active', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.deactivate(); // Deactivate without activating first
        return blur.isBlurActive();
      });
      
      expect(result).toBe(false);
    });
  });

  test.describe('toggle() Method', () => {
    
    test('should toggle blur on and off', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.toggle(['.timer-display']);
        (window as any).testBlur = blur;
      });
      
      let isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(true);
      
      await page.evaluate(() => (window as any).testBlur.toggle());
      
      isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(false);
    });

    test('should toggle multiple times correctly', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        (window as any).testBlur = blur;
      });
      
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => (window as any).testBlur.toggle(['.timer-display']));
        const isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
        expect(isActive).toBe(i % 2 === 0);
      }
    });

    test('should maintain blur layer on rapid toggles', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        (window as any).testBlur = blur;
      });
      
      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => (window as any).testBlur.toggle(['.timer-display']));
      }
      
      // Should end in deactivated state (even number of toggles)
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
    });
  });

  test.describe('updateFocusedElements() Method', () => {
    
    test('should update focused elements without deactivating', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        (window as any).testBlur = blur;
      });
      
      // Verify initial focus
      let timerFocused = await page.locator('.timer-display.blur-control-focused').count();
      expect(timerFocused).toBe(1);
      
      // Update to different element
      await page.evaluate(() => {
        (window as any).testBlur.updateFocusedElements(['.task-list']);
      });
      
      // Verify timer is no longer focused
      timerFocused = await page.locator('.timer-display.blur-control-focused').count();
      expect(timerFocused).toBe(0);
      
      // Verify task list is now focused
      const taskListFocused = await page.locator('.task-list.blur-control-focused').count();
      expect(taskListFocused).toBe(1);
      
      // Verify blur is still active
      const isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(true);
    });

    test('should handle updateFocusedElements when not active', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.updateFocusedElements(['.timer-display']); // Update without activating
        return blur.isBlurActive();
      });
      
      expect(result).toBe(false);
    });
  });

  test.describe('Configuration Methods', () => {
    
    test('should update blur amount dynamically', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.setBlurAmount('20px');
        (window as any).testBlur = blur;
      });
      
      const backdropFilter = await page.locator('.blur-control-layer').evaluate(el =>
        window.getComputedStyle(el).backdropFilter
      );
      
      expect(backdropFilter).toContain('20px');
    });

    test('should update transition timing', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.setTransition('1s ease-in-out');
      });
      
      const transition = await page.locator('.blur-control-layer').evaluate(el =>
        window.getComputedStyle(el).transition
      );
      
      expect(transition).toContain('1s');
    });

    test('should update backdrop color', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.setBackdropColor('rgba(255, 0, 0, 0.8)');
      });
      
      const bgColor = await page.locator('.blur-control-layer').evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      
      expect(bgColor).toContain('255');
    });

    test('should support method chaining', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        const chain = blur
          .activate(['.timer-display'])
          .setBlurAmount('12px')
          .setBackdropColor('rgba(0, 0, 0, 0.6)');
        
        return {
          isChained: chain === blur,
          isActive: blur.isBlurActive(),
          blurAmount: blur.options.blurAmount,
          backdropColor: blur.options.backdropColor
        };
      });
      
      expect(result.isChained).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.blurAmount).toBe('12px');
      expect(result.backdropColor).toBe('rgba(0, 0, 0, 0.6)');
    });
  });

  test.describe('Utility Methods', () => {
    
    test('should correctly report blur active state', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        const beforeActivate = blur.isBlurActive();
        blur.activate(['.timer-display']);
        const afterActivate = blur.isBlurActive();
        blur.deactivate();
        const afterDeactivate = blur.isBlurActive();
        
        return { beforeActivate, afterActivate, afterDeactivate };
      });
      
      expect(result.beforeActivate).toBe(false);
      expect(result.afterActivate).toBe(true);
      expect(result.afterDeactivate).toBe(false);
    });

    test('should return array of focused elements', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display', '.timer-controls']);
        const elements = blur.getFocusedElements();
        return {
          isArray: Array.isArray(elements),
          count: elements.length
        };
      });
      
      expect(result.isArray).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });

    test('should clean up all resources on destroy', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.destroy();
        (window as any).testBlur = blur;
      });
      
      // Blur should be deactivated
      const isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(false);
      
      // Layer should be removed
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
      
      // Focused elements should be empty
      const focusedCount = await page.evaluate(() => 
        (window as any).testBlur.getFocusedElements().length
      );
      expect(focusedCount).toBe(0);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    
    test('should handle invalid CSS selectors gracefully', async ({ page }) => {
      // Listen for console warnings
      const warnings: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });
      
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['..invalid..selector', '.timer-display']);
        return {
          isActive: blur.isBlurActive(),
          focusedCount: blur.getFocusedElements().length
        };
      });
      
      // Should still activate with valid selectors
      expect(result.isActive).toBe(true);
      // Should have at least the valid selector
      expect(result.focusedCount).toBeGreaterThan(0);
      // Should log warning
      expect(warnings.some(w => w.includes('Invalid selector'))).toBe(true);
    });

    test('should handle selectors with no matching elements', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.non-existent-element-xyz']);
        return {
          isActive: blur.isBlurActive(),
          focusedCount: blur.getFocusedElements().length
        };
      });
      
      // Should still activate
      expect(result.isActive).toBe(true);
      // But no elements focused
      expect(result.focusedCount).toBe(0);
    });

    test('should handle multiple activate calls', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.activate(['.task-list']); // Second activation
        (window as any).testBlur = blur;
      });
      
      // Should update focused elements, not create multiple layers
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(1);
      
      // Should have new focused element
      const taskListFocused = await page.locator('.task-list.blur-control-focused').count();
      expect(taskListFocused).toBe(1);
    });

    test('should handle empty selector array', async ({ page }) => {
      const result = await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate([]); // Empty array
        return {
          isActive: blur.isBlurActive(),
          focusedCount: blur.getFocusedElements().length
        };
      });
      
      expect(result.isActive).toBe(true);
      expect(result.focusedCount).toBe(0);
    });
  });

  test.describe('Escape Key Handler', () => {
    
    test('should deactivate blur with Escape key', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        (window as any).testBlur = blur;
      });
      
      // Verify blur is active
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Verify blur is deactivated
      await expect(page.locator('.blur-control-layer')).not.toBeVisible();
      
      const isActive = await page.evaluate(() => (window as any).testBlur.isBlurActive());
      expect(isActive).toBe(false);
    });

    test('should not error when Escape pressed without active blur', async ({ page }) => {
      // Press Escape without activating blur
      await page.keyboard.press('Escape');
      
      // Should not cause errors - check console
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      await page.waitForTimeout(500);
      expect(errors.length).toBe(0);
    });
  });

  test.describe('Performance', () => {
    
    test('should activate blur quickly', async ({ page }) => {
      const duration = await page.evaluate(() => {
        const start = performance.now();
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display', '.timer-controls', '.task-list']);
        const end = performance.now();
        return end - start;
      });
      
      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    test('should handle many focused elements efficiently', async ({ page }) => {
      // Add many tasks first
      for (let i = 0; i < 20; i++) {
        await page.fill('#taskInput', `Task ${i}`);
        await page.click('button:has-text("Add")');
      }
      
      const duration = await page.evaluate(() => {
        const start = performance.now();
        const blur = new (window as any).BlurControl();
        blur.activate(['.task-item']); // Focus all tasks
        const end = performance.now();
        return end - start;
      });
      
      // Should still be fast
      expect(duration).toBeLessThan(100);
    });
  });

  test.describe('Theme Compatibility', () => {
    
    test('should work with dark theme', async ({ page }) => {
      // Switch to dark theme
      await page.click('.theme-toggle');
      await page.click('button[onclick="setTheme(\'dark\')"]');
      await page.waitForTimeout(500);
      
      // Activate blur
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
      });
      
      // Verify blur works
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Verify highlight color adapts to theme
      const boxShadow = await page.locator('.timer-display').evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );
      expect(boxShadow).toBeTruthy();
      expect(boxShadow).toContain('rgb');
    });

    test('should work with light theme', async ({ page }) => {
      // Ensure light theme
      await page.click('.theme-toggle');
      await page.click('button[onclick="setTheme(\'light\')"]');
      await page.waitForTimeout(500);
      
      // Activate blur
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
      });
      
      // Verify blur works
      await expect(page.locator('.blur-control-layer')).toBeVisible();
    });
  });
});