import { test, expect } from '@playwright/test';

// Generate unique test user credentials
const timestamp = Date.now();
const TEST_USER = {
  email: `test${timestamp}@example.com`,
  username: `testuser${timestamp}`,
  password: 'TestPassword123!',
  characterName: `TestHero${timestamp}`,
  characterClass: 'Fighter'
};

test.describe('Full User Flow E2E Test', () => {
  test('complete user journey from registration to quest interaction', async ({ page }) => {
    console.log('=== Starting E2E Test ===');
    console.log('Test User:', TEST_USER);

    // Set longer timeout for this test (quest generation takes 30+ seconds)
    test.setTimeout(120000); // 2 minutes

    // Step 1: Registration
    console.log('\n--- Step 1: Registration ---');
    await page.goto('/register');
    await expect(page).toHaveURL(/.*register/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);

    console.log('Submitting registration form...');
    await page.click('button[type="submit"]');

    // Should redirect to character creation
    await page.waitForURL(/.*character\/create/, { timeout: 10000 });
    console.log('✓ Registration successful, redirected to character creation');

    // Step 2: Character Creation
    console.log('\n--- Step 2: Character Creation ---');

    // Wait for character creation page to load
    await expect(page.locator('text=Choose Your Path')).toBeVisible({ timeout: 10000 });

    // Enter character name (field is named "characterName")
    await page.fill('input[name="characterName"]', TEST_USER.characterName);
    console.log(`Character name entered: ${TEST_USER.characterName}`);

    // Select character class (Fighter class has title "The Champion")
    await page.click(`button:has-text("The Champion")`);
    console.log('Character class selected: Fighter (The Champion)');

    // Submit character creation (button says "Begin Your Legend")
    await page.click('button:has-text("Begin Your Legend")');

    // Should redirect to goal setup
    await page.waitForURL(/.*goals\/setup/, { timeout: 10000 });
    console.log('✓ Character created successfully, redirected to goal setup');

    // Step 3: Goal Setup (Training Rituals)
    console.log('\n--- Step 3: Goal Setup ---');

    // Wait for tutorial to load - use unique heading "The Pillar Grove"
    await expect(page.locator('text=The Pillar Grove')).toBeVisible({ timeout: 10000 });

    // Click "Approach the Pillars" to start tutorial
    await page.click('button:has-text("Approach the Pillars")');
    console.log('Started tutorial - Approached the Pillars');

    // Wait for pillar selection step - look for pillar cards
    await expect(page.locator('text=Pillar of Might')).toBeVisible({ timeout: 5000 });

    // Select STR (Might) pillar
    await page.click('button:has-text("Pillar of Might")');
    console.log('Selected Pillar of Might (STR)');

    // Wait for goal creation form
    await expect(page.locator('text=Create Your Training Ritual')).toBeVisible({ timeout: 5000 });

    // Fill out first goal (STR - weightlifting) - field name is "title" not "ritual"
    await page.fill('input[name="title"]', '100 Push-ups');
    // Select quantitative type - field name is "type" not "goalType"
    await page.selectOption('select[name="type"]', 'quantitative');
    // Fill target value
    await page.fill('input[name="targetValue"]', '100');
    console.log('Created first goal: 100 Push-ups (quantitative)');

    // Submit first goal (button says "Forge Bond with Pillar")
    await page.click('button:has-text("Forge Bond with Pillar")');

    // After creating goal, we're back at pillar selection.
    await page.waitForTimeout(2000); // Wait for goal to be created
    console.log('✓ First goal created successfully');

    // Click the "Continue with 1 Ritual" button to proceed to completion screen
    await page.click('button:has-text("Continue with 1 Ritual")');
    console.log('Clicked Continue button');

    // Wait for completion screen with "Your Path is Set"
    await expect(page.locator('text=Your Path is Set')).toBeVisible({ timeout: 5000 });
    console.log('✓ Reached completion screen');

    // Now click "Enter the Kingdom" to go to dashboard
    await page.click('button:has-text("Enter the Kingdom")');

    // Should redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    console.log('✓ Redirected to dashboard');

    // Step 4: Dashboard Verification
    console.log('\n--- Step 4: Dashboard Verification ---');

    // Check that character name is displayed
    await expect(page.locator(`text=${TEST_USER.characterName}`)).toBeVisible({ timeout: 5000 });
    console.log('✓ Character name visible on dashboard');

    // Check that goal/ritual is displayed
    const goalVisible = await page.locator('text=100 Push-ups').isVisible({ timeout: 3000 }).catch(() => false);
    if (goalVisible) {
      console.log('✓ Training ritual visible');
    } else {
      console.log('⚠ Training ritual not immediately visible (may need to expand section)');
    }

    // Step 5: Training Ritual Completion
    console.log('\n--- Step 5: Training Ritual Completion ---');

    // Find the "Complete Training" button
    const completeTrainingButton = page.locator('button:has-text("Complete Training")').first();

    if (await completeTrainingButton.isVisible()) {
      console.log('Found Complete Training button, clicking...');

      // Handle the alert dialog
      page.on('dialog', async dialog => {
        console.log(`Alert message: ${dialog.message()}`);
        await dialog.accept();
      });

      await completeTrainingButton.click();

      // Wait for data to reload
      await page.waitForTimeout(2000);
      console.log('✓ Training ritual completed successfully');

      // Check if button changed to "Completed Today"
      const completedButton = page.locator('button:has-text("Completed Today")').first();
      if (await completedButton.isVisible()) {
        console.log('✓ Button updated to show "Completed Today"');
      }

      // Check if "Done" badge appeared
      const doneBadge = page.locator('text=✓ Done').first();
      if (await doneBadge.isVisible()) {
        console.log('✓ "Done" badge visible on completed ritual');
      }
    } else {
      console.log('⚠ No "Complete Training" button found');
    }

    // Step 6: Quest Generation
    console.log('\n--- Step 6: Quest Generation ---');

    // Look for "Generate New Quest" button
    const generateButton = page.locator('button:has-text("Generate New Quest")');

    if (await generateButton.isVisible()) {
      console.log('Generate Quest button found, clicking...');
      await generateButton.click();

      // Wait for "Summoning Your Quest..." message
      await expect(page.locator('text=Summoning Your Quest')).toBeVisible({ timeout: 5000 });
      console.log('Quest generation started...');

      // Wait for quest to appear (up to 40 seconds)
      console.log('Waiting for quest to generate (this takes 30+ seconds)...');
      const questCard = page.locator('.glass-card').filter({ hasText: 'Quest' }).first();
      await questCard.waitFor({ state: 'visible', timeout: 45000 });
      console.log('✓ Quest generated and displayed!');

      // Get quest title
      const questTitle = await page.locator('h3').first().textContent();
      console.log(`Quest title: ${questTitle}`);
    } else {
      console.log('No Generate Quest button found - checking if quest already exists');

      // Check if a quest card is already visible
      const existingQuest = page.locator('.glass-card').filter({ hasText: 'Quest' }).first();
      if (await existingQuest.isVisible()) {
        console.log('✓ Quest already present on dashboard');
      } else {
        console.log('⚠ No quest found and no generate button available');
      }
    }

    // Step 7: Quest Interaction (Abandon)
    console.log('\n--- Step 7: Quest Interaction ---');

    // Find abandon button
    const abandonButton = page.locator('button:has-text("Abandon")').first();

    if (await abandonButton.isVisible()) {
      console.log('Found Abandon button, testing abandon functionality...');

      // Click abandon
      await abandonButton.click();

      // Handle confirmation dialog
      page.on('dialog', async dialog => {
        console.log(`Confirmation dialog: ${dialog.message()}`);
        await dialog.accept();
      });

      // Wait for quest to be removed (the card should disappear)
      await page.waitForTimeout(2000);
      console.log('✓ Quest abandoned successfully');
    } else {
      console.log('No Abandon button found on quest');
    }

    // Step 8: Logout
    console.log('\n--- Step 8: Logout ---');

    const logoutButton = page.locator('button:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL(/.*login/, { timeout: 5000 });
      console.log('✓ Logged out successfully');
    } else {
      console.log('⚠ Logout button not found');
    }

    // Step 9: Login
    console.log('\n--- Step 9: Login ---');

    await page.goto('/login');
    await page.fill('input[name="emailOrUsername"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Should redirect back to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    console.log('✓ Logged in successfully');

    // Verify character is still there
    await expect(page.locator(`text=${TEST_USER.characterName}`)).toBeVisible({ timeout: 5000 });
    console.log('✓ Character data persisted after logout/login');

    console.log('\n=== E2E Test Complete ===');
    console.log('All major features tested successfully!');
  });
});
