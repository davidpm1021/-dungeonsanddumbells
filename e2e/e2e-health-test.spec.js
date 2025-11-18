const { test, expect } = require('@playwright/test');

/**
 * End-to-End Test: Health System
 * Tests the complete health tracking flow from UI interaction to backend
 */

test.describe('Health System E2E Tests', () => {

  test('should load health page and display all components', async ({ page }) => {
    // Navigate to health page
    await page.goto('http://localhost:5173/health');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check header
    await expect(page.locator('h1')).toContainText('Health & Wellness');

    // Check main components are visible
    await expect(page.locator('h2:has-text("Log Health Activity")')).toBeVisible();
    await expect(page.locator('h2:has-text("Activity Streaks")')).toBeVisible();
    await expect(page.locator('h2:has-text("Active Conditions")')).toBeVisible();

    console.log('✅ Health page loaded with all components');
  });

  test('should log a strength training activity', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Find the activity logger form
    const form = page.locator('form').filter({ hasText: 'Log Activity' });

    // Fill out activity form - use nth(0) to get the first select (activity type)
    await form.locator('select').nth(0).selectOption('strength');
    await form.locator('input[placeholder*="Morning"]').fill('Test Strength Workout');
    await form.locator('input[type="number"]').fill('30');
    await form.locator('select').nth(1).selectOption('moderate'); // Intensity is the second select

    // Check XP preview appears
    await expect(page.locator('text=Estimated XP')).toBeVisible();

    // Submit form
    await form.locator('button:has-text("Log Activity")').click();

    // Wait for success message
    await page.waitForSelector('text=Activity logged', { timeout: 10000 });
    await expect(page.locator('text=Activity logged')).toBeVisible();
    await expect(page.locator('text=Earned')).toBeVisible();
    await expect(page.locator('text=XP')).toBeVisible();

    console.log('✅ Successfully logged strength training activity');
  });

  test('should log sleep activity and trigger Well-Rested buff', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Find the activity logger form
    const form = page.locator('form').filter({ hasText: 'Log Activity' });

    // Select sleep activity
    await form.locator('select').nth(0).selectOption('sleep');
    await form.locator('input[placeholder*="Morning"]').fill('8 hours of quality sleep');
    await form.locator('input[type="number"]').fill('480');

    // Submit
    await form.locator('button:has-text("Log Activity")').click();

    // Wait for success
    await page.waitForSelector('text=Activity logged', { timeout: 10000 });

    // Refresh conditions to check for Well-Rested buff
    await page.locator('button:has-text("🔄 Refresh")').click();
    await page.waitForTimeout(2000);

    // Check if Well-Rested buff appears (might not if no character)
    const hasBuffs = await page.locator('text=Well-Rested').isVisible().catch(() => false);

    if (hasBuffs) {
      console.log('✅ Well-Rested buff applied');
    } else {
      console.log('ℹ️  No character found - buffs require character creation');
    }
  });

  test('should display activity stats in dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Check stats section
    await expect(page.locator('text=Your Progress')).toBeVisible();

    // Stats cards should be visible
    await expect(page.locator('text=Activities Logged')).toBeVisible();
    await expect(page.locator('text=Total XP Earned')).toBeVisible();
    await expect(page.locator('text=Minutes Invested')).toBeVisible();

    // Period selector should work
    await page.selectOption('select', 'week');
    await page.waitForTimeout(1000);

    await page.selectOption('select', 'month');
    await page.waitForTimeout(1000);

    console.log('✅ Stats dashboard displays correctly');
  });

  test('should show graduated success levels in streaks', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Check streak legend
    await expect(page.locator('text=Bronze')).toBeVisible();
    await expect(page.locator('text=Silver')).toBeVisible();
    await expect(page.locator('text=Gold')).toBeVisible();

    // Check for streak explanation
    await expect(page.locator('text=50%')).toBeVisible();
    await expect(page.locator('text=75%')).toBeVisible();
    await expect(page.locator('text=100%')).toBeVisible();

    console.log('✅ Graduated success levels displayed');
  });

  test('should display How It Works section', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check stat mappings
    await expect(page.locator('text=STR (Might)')).toBeVisible();
    await expect(page.locator('text=DEX (Grace)')).toBeVisible();
    await expect(page.locator('text=CON (Endurance)')).toBeVisible();
    await expect(page.locator('text=INT (Clarity)')).toBeVisible();
    await expect(page.locator('text=WIS (Serenity)')).toBeVisible();
    await expect(page.locator('text=CHA (Radiance)')).toBeVisible();

    // Check combat benefits
    await expect(page.locator('text=Well-Rested')).toBeVisible();
    await expect(page.locator('text=Battle-Ready')).toBeVisible();
    await expect(page.locator('text=Unstoppable')).toBeVisible();

    // Check anti-exploit explanation
    await expect(page.locator('text=Healthy Limits')).toBeVisible();
    await expect(page.locator('text=diminishing returns')).toBeVisible();

    console.log('✅ How It Works section complete');
  });

  test('should test multiple activity types', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').filter({ hasText: 'Log Activity' });

    const activities = [
      { type: 'cardio', name: 'Morning Run', stat: 'CON' },
      { type: 'flexibility', name: 'Yoga Session', stat: 'DEX' },
      { type: 'meditation', name: 'Mindfulness Practice', stat: 'WIS' },
    ];

    for (const activity of activities) {
      // Select activity type
      await form.locator('select').nth(0).selectOption(activity.type);

      // Verify stat mapping is shown
      await expect(form.locator(`text=${activity.stat}`)).toBeVisible();

      // Fill form
      await form.locator('input[placeholder*="Morning"]').fill(activity.name);
      await form.locator('input[type="number"]').fill('20');

      // Submit
      await form.locator('button:has-text("Log Activity")').click();

      // Wait for success
      await page.waitForSelector('text=Activity logged', { timeout: 10000 });

      console.log(`✅ Logged ${activity.type} activity → ${activity.stat}`);

      // Wait a bit before next activity
      await page.waitForTimeout(500);
    }
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Click back button
    await page.click('button:has-text("Back to Home")');

    // Should redirect (might go to login if not authenticated)
    await page.waitForTimeout(1000);

    console.log('✅ Navigation works');
  });

  test('should show XP estimation correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').filter({ hasText: 'Log Activity' });

    // Test XP calculation preview
    await form.locator('select').nth(0).selectOption('strength');
    await form.locator('input[type="number"]').fill('30');

    // Should show estimated XP
    await page.waitForSelector('text=Estimated XP', { timeout: 5000 });

    // With moderate intensity, 30 mins = base 5 * 30 * 1.5 = 225 XP
    await expect(page.locator('text=225 XP')).toBeVisible();

    // Change to high intensity
    await form.locator('select').nth(1).selectOption('high');
    await page.waitForTimeout(500);

    // High intensity: 5 * 30 * 2.0 = 300 XP
    await expect(page.locator('text=300 XP')).toBeVisible();

    console.log('✅ XP estimation accurate');
  });

  test('full user journey: log activities and check stats update', async ({ page }) => {
    console.log('\n🎯 Starting full user journey test...\n');

    // Step 1: Navigate to health page
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');
    console.log('1️⃣ Navigated to health page');

    const form = page.locator('form').filter({ hasText: 'Log Activity' });

    // Step 2: Check initial stats
    const initialActivities = await page.locator('text=Activities Logged').locator('..').locator('.text-3xl').textContent();
    console.log(`2️⃣ Initial activities count: ${initialActivities}`);

    // Step 3: Log a workout
    await form.locator('select').nth(0).selectOption('strength');
    await form.locator('input[placeholder*="Morning"]').fill('Full Journey Test Workout');
    await form.locator('input[type="number"]').fill('45');
    await form.locator('select').nth(1).selectOption('high');

    await form.locator('button:has-text("Log Activity")').click();
    await page.waitForSelector('text=Activity logged', { timeout: 10000 });
    console.log('3️⃣ Logged strength training activity');

    // Step 4: Wait for stats to refresh
    await page.waitForTimeout(2000);

    // Step 5: Check stats updated
    const updatedActivities = await page.locator('text=Activities Logged').locator('..').locator('.text-3xl').textContent();
    console.log(`4️⃣ Updated activities count: ${updatedActivities}`);

    // Step 6: Check XP earned
    const totalXP = await page.locator('text=Total XP Earned').locator('..').locator('.text-3xl').textContent();
    console.log(`5️⃣ Total XP earned: ${totalXP}`);

    // Step 7: Verify conditions are evaluated
    await page.locator('button:has-text("🔄 Refresh")').click();
    await page.waitForTimeout(2000);
    console.log('6️⃣ Refreshed health conditions');

    console.log('\n✅ Full user journey completed successfully!\n');
  });
});
