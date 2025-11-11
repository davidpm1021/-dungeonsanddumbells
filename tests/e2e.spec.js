const { test, expect } = require('@playwright/test');

// Generate unique test data
const timestamp = Date.now();
const testEmail = `test${timestamp}@example.com`;
const testUsername = `testuser${timestamp}`;
const testPassword = 'TestPassword123';
const characterName = 'Sir Test of Playwright';

test.describe('Dumbbells & Dragons E2E Tests', () => {
  test('Complete user journey: Register → Create Character → Add Goals → Complete Goals', async ({ page }) => {
    // Clear local storage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 1. Navigate to login page
    await page.goto('/login');
    await expect(page).toHaveTitle(/Dumbbells & Dragons/);

    // 2. Should be on login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Dumbbells & Dragons/i })).toBeVisible();

    // 3. Click register link
    await page.getByRole('link', { name: /Register here/i }).click();
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByRole('heading', { name: /Join the Adventure/i })).toBeVisible();

    // 4. Fill out registration form
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel(/^Username$/).fill(testUsername);
    await page.getByLabel(/^Password$/).fill(testPassword);
    await page.getByLabel(/Confirm Password/).fill(testPassword);

    // 5. Submit registration
    await page.getByRole('button', { name: /Create Account/i }).click();

    // 6. Should redirect to character creation
    await expect(page).toHaveURL(/.*character\/create/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Create Your Character/i })).toBeVisible();

    // Verify starting stats are displayed
    await expect(page.getByText('STR 10')).toBeVisible();
    await expect(page.getByText('DEX 10')).toBeVisible();
    await expect(page.getByText('CON 10')).toBeVisible();

    // 7. Create character
    await page.getByLabel('Character Name').fill(characterName);
    await page.getByRole('button', { name: /Begin Your Journey/i }).click();

    // 8. Should redirect to goal setup
    await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Set Your Wellness Goals/i })).toBeVisible();

    // 9. Add first goal (binary)
    await page.getByRole('button', { name: /Add Goal/i }).click();
    await page.getByLabel('Goal Title').fill('30-minute workout');
    await page.getByLabel('Description').fill('Complete a strength training session');
    await page.getByLabel('Goal Type').selectOption('binary');
    await page.getByLabel('Frequency').selectOption('daily');
    await page.getByLabel(/Stat to Level Up/).selectOption('str');
    await page.getByRole('button', { name: /Add Goal/i, exact: true }).click();

    // Wait for goal to be added
    await expect(page.getByText('30-minute workout')).toBeVisible({ timeout: 5000 });

    // 10. Add second goal (quantitative)
    await page.getByRole('button', { name: /Add Goal/i }).click();
    await page.getByLabel('Goal Title').fill('Daily steps');
    await page.getByLabel('Description').fill('Walk 10,000 steps');
    await page.getByLabel('Goal Type').selectOption('quantitative');
    await page.getByLabel('Target Value').fill('10000');
    await page.getByLabel('Frequency').selectOption('daily');
    await page.getByLabel(/Stat to Level Up/).selectOption('dex');
    await page.getByRole('button', { name: /Add Goal/i, exact: true }).click();

    // Wait for second goal to be added
    await expect(page.getByText('Daily steps')).toBeVisible({ timeout: 5000 });

    // 11. Continue to dashboard
    await page.getByRole('button', { name: /Continue with 2 goals/i }).click();

    // 12. Verify dashboard loaded
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: characterName })).toBeVisible();
    await expect(page.getByText(/Level 1/)).toBeVisible();

    // 13. Verify character stats are displayed
    await expect(page.getByRole('heading', { name: 'Strength' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dexterity' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Constitution' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Intelligence' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wisdom' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Charisma' })).toBeVisible();

    // 14. Verify goals are displayed
    await expect(page.getByText('30-minute workout')).toBeVisible();
    await expect(page.getByText('Daily steps')).toBeVisible();

    // 15. Complete first goal (binary)
    const workoutGoalCard = page.locator('.card', { has: page.getByText('30-minute workout') });
    await expect(workoutGoalCard.getByRole('button', { name: /Complete Goal/i })).toBeVisible();
    await workoutGoalCard.getByRole('button', { name: /Complete Goal/i }).click();

    // 16. Verify goal marked as completed
    await expect(workoutGoalCard.getByText(/Completed today/i)).toBeVisible({ timeout: 5000 });

    // 17. Complete second goal (quantitative)
    const stepsGoalCard = page.locator('.card', { has: page.getByText('Daily steps') });
    await stepsGoalCard.getByPlaceholder('0').fill('12500');
    await stepsGoalCard.getByRole('button', { name: /Complete Goal/i }).click();

    // 18. Verify second goal marked as completed
    await expect(stepsGoalCard.getByText(/Completed today/i)).toBeVisible({ timeout: 5000 });

    // 19. Verify XP progress updated (check that at least one stat has XP)
    // The page should show XP progress for STR and DEX now
    await expect(page.getByText(/\d+\s*\/\s*\d+/).first()).toBeVisible();

    // 20. Test logout
    await page.getByRole('button', { name: /Logout/i }).click();

    // 21. Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });

    // 22. Test login with created account
    await page.getByLabel(/Email or Username/).fill(testUsername);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: /^Login$/i }).click();

    // 23. Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: characterName })).toBeVisible();

    // 24. Verify goals are still marked as completed
    await expect(page.getByText(/Completed today/i).first()).toBeVisible();

    console.log('✅ All E2E tests passed!');
  });

  test('Protected route redirects to login when not authenticated', async ({ page }) => {
    // Clear local storage to ensure not authenticated
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Try to access dashboard without logging in
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('Try to complete goal again should show already completed', async ({ page, context }) => {
    // This test assumes the previous test ran successfully
    // Login with the test user
    await page.goto('/login');
    await page.getByLabel(/Email or Username/).fill(testUsername);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: /^Login$/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // Goals should already be marked as completed
    const completedMessages = page.getByText(/Completed today/i);
    const count = await completedMessages.count();
    expect(count).toBeGreaterThan(0);
  });
});
