import { test, expect } from '@playwright/test';
import { acceptDisclaimer, activateFocusMode, deactivateFocusMode } from './helpers/blurControlHelpers';

test.describe('BlurControl - UI Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await acceptDisclaimer(page);
  });

  test.describe('Focus Mode Button', () => {
    
    test('should toggle focus mode via button click', async ({ page }) => {
      // Click focus mode button
      await page.click('#focusModeBtn');
      
      // Verify blur layer appears
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Verify indicator shows
      await expect(page.locator('#focusModeIndicator')).toHaveClass(/show/);
      
      // Verify button has active state
      const btnBgColor = await page.locator('#focusModeBtn').evaluate(el =>
        (el as HTMLElement).style.background
      );
      expect(btnBgColor).toContain('primary-color');
      
      // Click again to deactivate
      await page.click('#focusModeBtn');
      
      // Verify blur layer is removed
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
      
      // Verify indicator is hidden
      const indicatorHasShow = await page.locator('#focusModeIndicator').evaluate(el =>
        el.classList.contains('show')
      );
      expect(indicatorHasShow).toBe(false);
    });

    test('should keep timer visible in focus mode', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Timer should be focused
      await expect(page.locator('.timer-display')).toHaveClass(/blur-control-focused/);
      
      // Timer controls should be focused
      await expect(page.locator('.timer-controls')).toHaveClass(/blur-control-focused/);
      
      // Timer should be interactive
      const isClickable = await page.locator('#startBtn').isEnabled();
      expect(isClickable).toBe(true);
    });

    test('should blur tasks and stats in focus mode', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Tasks should not be focused
      const tasksFocused = await page.locator('.task-list.blur-control-focused').count();
      expect(tasksFocused).toBe(0);
      
      // Stats should not be focused
      const statsFocused = await page.locator('.stats-grid.blur-control-focused').count();
      expect(statsFocused).toBe(0);
    });
  });

  test.describe('Focus Mode Indicator', () => {
    
    test('should show indicator when focus mode activates', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Indicator should be visible
      await expect(page.locator('#focusModeIndicator')).toBeVisible();
      
      // Indicator should have correct text
      const text = await page.locator('.blur-control-indicator-text').textContent();
      expect(text).toContain('Focus Mode Active');
      expect(text).toContain('ESC to exit');
    });

    test('should hide indicator when focus mode deactivates', async ({ page }) => {
      await page.click('#focusModeBtn');
      await page.click('#focusModeBtn');
      
      // Indicator should not have show class
      const hasShow = await page.locator('#focusModeIndicator').evaluate(el =>
        el.classList.contains('show')
      );
      expect(hasShow).toBe(false);
    });

    test('should be positioned correctly', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Check indicator position
      const position = await page.locator('#focusModeIndicator').evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          position: style.position,
          top: style.top,
          right: style.right
        };
      });
      
      expect(position.position).toBe('fixed');
      expect(position.top).toBeTruthy();
      expect(position.right).toBeTruthy();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    
    test('should toggle focus mode with Ctrl+F', async ({ page }) => {
      // Press Ctrl+F
      await page.keyboard.press('Control+f');
      
      // Verify blur is active
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Press Ctrl+F again
      await page.keyboard.press('Control+f');
      
      // Verify blur is deactivated
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
    });

    test('should work with Meta+F on Mac', async ({ page }) => {
      // Press Meta+F (Cmd+F)
      await page.keyboard.press('Meta+f');
      
      // Verify blur is active
      await expect(page.locator('.blur-control-layer')).toBeVisible();
    });

    test('should not trigger when typing in input field', async ({ page }) => {
      // Focus on task input
      await page.click('#taskInput');
      
      // Press Ctrl+F while in input
      await page.keyboard.press('Control+f');
      
      // Blur should NOT activate
      const blurLayerCount = await page.locator('.blur-control-layer').count();
      expect(blurLayerCount).toBe(0);
    });

    test('should deactivate with Escape key', async ({ page }) => {
      // Activate focus mode
      await page.click('#focusModeBtn');
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Verify blur is deactivated
      await expect(page.locator('.blur-control-layer')).not.toBeVisible();
      await expect(page.locator('#focusModeIndicator')).not.toHaveClass(/show/);
    });
  });

  test.describe('Integration with Timer', () => {
    
    test('should work while timer is running', async ({ page }) => {
      // Start timer
      await page.click('#startBtn');
      
      // Activate focus mode
      await page.click('#focusModeBtn');
      
      // Timer should still be running
      const isRunning = await page.evaluate(() => (window as any).state.timer.isRunning);
      expect(isRunning).toBe(true);
      
      // Timer should be visible and focused
      await expect(page.locator('.timer-display')).toHaveClass(/blur-control-focused/);
      
      // Timer should still update
      await page.waitForTimeout(2000);
      const timerText = await page.locator('#timerDisplay').textContent();
      expect(timerText).not.toBe('25:00'); // Should have changed
    });

    test('should allow timer controls to work in focus mode', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Start timer
      await page.click('#startBtn');
      
      // Verify timer started
      const isRunning = await page.evaluate(() => (window as any).state.timer.isRunning);
      expect(isRunning).toBe(true);
      
      // Pause timer
      await page.click('#startBtn');
      
      // Verify timer paused
      const isPaused = await page.evaluate(() => !(window as any).state.timer.isRunning);
      expect(isPaused).toBe(true);
    });

    test('should allow reset button to work in focus mode', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Start timer
      await page.click('#startBtn');
      await page.waitForTimeout(2000);
      
      // Reset timer
      await page.click('button:has-text("Reset")');
      
      // Verify timer is reset
      const timerText = await page.locator('#timerDisplay').textContent();
      expect(timerText).toBe('25:00');
    });
  });

  test.describe('Integration with Modals', () => {
    
    test('should work with settings modal', async ({ page }) => {
      // Activate focus mode
      await page.click('#focusModeBtn');
      
      // Open settings
      await page.click('button[onclick="openSettings()"]');
      
      // Settings modal should be visible
      await expect(page.locator('#settingsModal')).toHaveClass(/show/);
      
      // Blur layer should still exist
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Close settings
      await page.click('button[onclick="closeSettings()"]');
      
      // Blur should still be active
      const isActive = await page.evaluate(() => (window as any).blurControl?.isBlurActive());
      expect(isActive).toBe(true);
    });

    test('should deactivate when pressing Escape in modal', async ({ page }) => {
      await page.click('#focusModeBtn');
      await page.click('button[onclick="openSettings()"]');
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Blur should be deactivated
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
    });
  });

  test.describe('Visual Effects', () => {
    
    test('should apply backdrop-filter to blur layer', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      const backdropFilter = await page.locator('.blur-control-layer').evaluate(el =>
        window.getComputedStyle(el).backdropFilter
      );
      
      expect(backdropFilter).toContain('blur');
    });

    test('should have smooth transition on activation', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      const transition = await page.locator('.blur-control-layer').evaluate(el =>
        window.getComputedStyle(el).transition
      );
      
      expect(transition).toContain('opacity');
    });

    test('should elevate focused elements with z-index', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      const timerZIndex = await page.locator('.timer-display').evaluate(el =>
        window.getComputedStyle(el).zIndex
      );
      
      expect(parseInt(timerZIndex)).toBeGreaterThan(9000);
    });

    test('should apply highlight shadow to focused elements', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      const boxShadow = await page.locator('.timer-display').evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );
      
      // Should have shadow with primary color
      expect(boxShadow).toBeTruthy();
      expect(boxShadow).not.toBe('none');
    });
  });

  test.describe('Responsive Behavior', () => {
    
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await page.click('#focusModeBtn');
      
      // Verify blur works on mobile
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Verify indicator is visible
      await expect(page.locator('#focusModeIndicator')).toBeVisible();
    });

    test('should maintain touch interactions on focused elements', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('#focusModeBtn');
      
      // Timer controls should still be tappable
      const startBtn = page.locator('#startBtn');
      await expect(startBtn).toBeEnabled();
      await startBtn.click();
      
      // Verify timer started
      const isRunning = await page.evaluate(() => (window as any).state.timer.isRunning);
      expect(isRunning).toBe(true);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      await page.click('#focusModeBtn');
      
      // Verify blur works
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Verify focused elements are interactive
      await page.click('#startBtn');
      const isRunning = await page.evaluate(() => (window as any).state.timer.isRunning);
      expect(isRunning).toBe(true);
    });
  });

  test.describe('Multiple Focus Scenarios', () => {
    
    test('should handle rapid button clicks', async ({ page }) => {
      // Rapidly click focus mode button
      for (let i = 0; i < 10; i++) {
        await page.click('#focusModeBtn');
        await page.waitForTimeout(100);
      }
      
      // Should end in deactivated state (even number of clicks)
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
    });

    test('should handle keyboard and button combination', async ({ page }) => {
      // Activate with button
      await page.click('#focusModeBtn');
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Deactivate with keyboard
      await page.keyboard.press('Escape');
      await expect(page.locator('.blur-control-layer')).not.toBeVisible();
      
      // Activate with keyboard
      await page.keyboard.press('Control+f');
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      
      // Deactivate with button
      await page.click('#focusModeBtn');
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    
    test('should maintain keyboard navigation for focused elements', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Tab should navigate to timer controls
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate start button with Enter
      await page.keyboard.press('Enter');
      
      // Verify timer started
      const isRunning = await page.evaluate(() => (window as any).state.timer.isRunning);
      expect(isRunning).toBe(true);
    });

    test('should keep focused elements interactive', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // All timer buttons should be enabled
      const startBtn = await page.locator('#startBtn').isEnabled();
      const resetBtn = await page.locator('button:has-text("Reset")').isEnabled();
      const skipBtn = await page.locator('button:has-text("Skip")').isEnabled();
      
      expect(startBtn).toBe(true);
      expect(resetBtn).toBe(true);
      expect(skipBtn).toBe(true);
    });
  });

  test.describe('State Management', () => {
    
    test('should maintain blur state across page interactions', async ({ page }) => {
      await page.click('#focusModeBtn');
      
      // Interact with timer
      await page.click('#startBtn');
      await page.waitForTimeout(1000);
      await page.click('#startBtn'); // Pause
      
      // Blur should still be active
      await expect(page.locator('.blur-control-layer')).toBeVisible();
      const isActive = await page.evaluate(() => (window as any).blurControl?.isBlurActive());
      expect(isActive).toBe(true);
    });

    test('should update button state correctly', async ({ page }) => {
      const btn = page.locator('#focusModeBtn');
      
      // Initial state - not active
      let hasActive = await btn.evaluate(el => el.classList.contains('active'));
      expect(hasActive).toBe(false);
      
      // After activation - should be active
      await page.click('#focusModeBtn');
      hasActive = await btn.evaluate(el => el.classList.contains('active'));
      expect(hasActive).toBe(true);
      
      // After deactivation - should not be active
      await page.click('#focusModeBtn');
      hasActive = await btn.evaluate(el => el.classList.contains('active'));
      expect(hasActive).toBe(false);
    });
  });

  test.describe('Error Recovery', () => {
    
    test('should handle missing elements gracefully', async ({ page }) => {
      // Try to activate with non-existent selector
      const result = await page.evaluate(() => {
        try {
          (window as any).blurControl = new (window as any).BlurControl();
          (window as any).blurControl.activate(['.does-not-exist']);
          return { success: true, isActive: (window as any).blurControl.isBlurActive() };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.isActive).toBe(true);
    });

    test('should not break app when BlurControl errors', async ({ page }) => {
      // Cause an error in BlurControl
      await page.evaluate(() => {
        try {
          const blur = new (window as any).BlurControl();
          blur.activate(['###invalid###selector']);
        } catch (error) {
          // Ignore error
        }
      });
      
      // App should still work
      await page.click('#startBtn');
      const isRunning = await page.evaluate(() => (window as any).state.timer.isRunning);
      expect(isRunning).toBe(true);
    });
  });

  test.describe('Performance and Cleanup', () => {
    
    test('should clean up event listeners on deactivate', async ({ page }) => {
      await page.evaluate(() => {
        const blur = new (window as any).BlurControl();
        blur.activate(['.timer-display']);
        blur.deactivate();
        (window as any).testBlur = blur;
      });
      
      // Press Escape - should not affect anything since listener removed
      await page.keyboard.press('Escape');
      
      // No errors should occur
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      await page.waitForTimeout(500);
      expect(errors.length).toBe(0);
    });

    test('should not cause memory leaks on multiple activations', async ({ page }) => {
      // Activate and deactivate multiple times
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => {
          const blur = new (window as any).BlurControl();
          blur.activate(['.timer-display']);
          blur.deactivate();
        });
      }
      
      // Should only have one blur layer at most
      const layerCount = await page.locator('.blur-control-layer').count();
      expect(layerCount).toBe(0);
    });
  });
});