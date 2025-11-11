const { test, expect } = require('@playwright/test');

// Generate unique test data
const timestamp = Date.now();
const testEmail = `component-test-${timestamp}@example.com`;
const testUsername = `componenttest${timestamp}`;
const testPassword = 'TestPassword123';

test.describe('Component Tests', () => {
  test.describe('Login Page', () => {
    test('should display login form elements', async ({ page }) => {
      await page.goto('/login');

      // Check title
      await expect(page).toHaveTitle(/Dumbbells & Dragons/);
      await expect(page.getByRole('heading', { name: /Dumbbells & Dragons/i })).toBeVisible();
      await expect(page.getByText(/Level up your life through wellness/i)).toBeVisible();

      // Check form elements
      await expect(page.getByLabel(/Email or Username/i)).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /^Login$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Register here/i })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/Email or Username/i).fill('nonexistent@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /^Login$/i }).click();

      // Should show error message
      await expect(page.getByText(/Login failed|Invalid|error/i)).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('link', { name: /Register here/i }).click();
      await expect(page).toHaveURL(/.*register/);
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form elements', async ({ page }) => {
      await page.goto('/register');

      // Check heading
      await expect(page.getByRole('heading', { name: /Join the Adventure/i })).toBeVisible();

      // Check form elements
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel(/^Username$/)).toBeVisible();
      await expect(page.getByLabel(/^Password$/)).toBeVisible();
      await expect(page.getByLabel(/Confirm Password/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Login here/i })).toBeVisible();
    });

    test('should show error with password mismatch', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel(/^Username$/).fill(testUsername);
      await page.getByLabel(/^Password$/).fill('Password123');
      await page.getByLabel(/Confirm Password/).fill('DifferentPassword');
      await page.getByRole('button', { name: /Create Account/i }).click();

      await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 2000 });
    });

    test('should show error with short password', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel(/^Username$/).fill(testUsername);
      await page.getByLabel(/^Password$/).fill('short');
      await page.getByLabel(/Confirm Password/).fill('short');
      await page.getByRole('button', { name: /Create Account/i }).click();

      await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 2000 });
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/register');

      await page.getByRole('link', { name: /Login here/i }).click();
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Character Creation Page', () => {
    test.beforeEach(async ({ page }) => {
      // Clear storage and register a new user
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/register');

      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel(/^Username$/).fill(testUsername);
      await page.getByLabel(/^Password$/).fill(testPassword);
      await page.getByLabel(/Confirm Password/).fill(testPassword);
      await page.getByRole('button', { name: /Create Account/i }).click();

      // Should redirect to character creation
      await expect(page).toHaveURL(/.*character\/create/, { timeout: 10000 });
    });

    test('should display character creation form', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Create Your Character/i })).toBeVisible();
      await expect(page.getByLabel(/Character Name/i)).toBeVisible();
      await expect(page.getByLabel(/Character Class/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Begin Your Journey/i })).toBeVisible();

      // Check that all 6 starting stats are displayed
      await expect(page.getByText('STR 10')).toBeVisible();
      await expect(page.getByText('DEX 10')).toBeVisible();
      await expect(page.getByText('CON 10')).toBeVisible();
      await expect(page.getByText('INT 10')).toBeVisible();
      await expect(page.getByText('WIS 10')).toBeVisible();
      await expect(page.getByText('CHA 10')).toBeVisible();
    });

    test('should have all three character classes', async ({ page }) => {
      const classSelect = page.getByLabel(/Character Class/i);

      // Check default option
      await expect(classSelect).toHaveValue('Fighter');

      // Check all options exist
      const options = await classSelect.locator('option').allTextContents();
      expect(options.some(opt => opt.includes('Fighter'))).toBeTruthy();
      expect(options.some(opt => opt.includes('Mage'))).toBeTruthy();
      expect(options.some(opt => opt.includes('Rogue'))).toBeTruthy();
    });

    test('should create character and redirect to goal setup', async ({ page }) => {
      await page.getByLabel(/Character Name/i).fill('Test Hero');
      await page.getByLabel(/Character Class/i).selectOption('Mage');
      await page.getByRole('button', { name: /Begin Your Journey/i }).click();

      await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 10000 });
    });
  });

  test.describe('Goal Setup Page', () => {
    test.beforeEach(async ({ page }) => {
      // Register, create character to get to goal setup
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/register');

      const uniqueEmail = `goaltest-${Date.now()}@example.com`;
      const uniqueUsername = `goaltest${Date.now()}`;

      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel(/^Username$/).fill(uniqueUsername);
      await page.getByLabel(/^Password$/).fill(testPassword);
      await page.getByLabel(/Confirm Password/).fill(testPassword);
      await page.getByRole('button', { name: /Create Account/i }).click();

      await expect(page).toHaveURL(/.*character\/create/, { timeout: 10000 });

      await page.getByLabel(/Character Name/i).fill('Goal Test Hero');
      await page.getByRole('button', { name: /Begin Your Journey/i }).click();

      await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 10000 });
    });

    test('should display goal setup page elements', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Set Your Wellness Goals/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Add Goal/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Skip for now/i })).toBeVisible();
    });

    test('should show goal form when Add Goal clicked', async ({ page }) => {
      await page.getByRole('button', { name: /Add Goal/i }).first().click();

      await expect(page.getByLabel(/Goal Title/i)).toBeVisible();
      await expect(page.getByLabel(/Description/i)).toBeVisible();
      await expect(page.getByLabel(/Goal Type/i)).toBeVisible();
      await expect(page.getByLabel(/Frequency/i)).toBeVisible();
      await expect(page.getByLabel(/Stat to Level Up/i)).toBeVisible();
    });

    test('should show target value field for quantitative goals', async ({ page }) => {
      await page.getByRole('button', { name: /Add Goal/i }).first().click();

      // Target value should not be visible initially
      await expect(page.getByLabel(/Target Value/i)).not.toBeVisible();

      // Select quantitative type
      await page.getByLabel(/Goal Type/i).selectOption('quantitative');

      // Target value should now be visible
      await expect(page.getByLabel(/Target Value/i)).toBeVisible();
    });

    test('should add a goal to the list', async ({ page }) => {
      await page.getByRole('button', { name: /Add Goal/i }).first().click();

      await page.getByLabel(/Goal Title/i).fill('Test Workout');
      await page.getByLabel(/Description/i).fill('Test description');
      await page.getByLabel(/Goal Type/i).selectOption('binary');
      await page.getByLabel(/Frequency/i).selectOption('daily');
      await page.getByLabel(/Stat to Level Up/i).selectOption('str');
      await page.getByRole('button', { name: /^Add Goal$/i }).click();

      // Goal should appear in the list
      await expect(page.getByText('Test Workout')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Continue with 1 goal/i)).toBeVisible();
    });

    test('should navigate to dashboard after continuing', async ({ page }) => {
      // Skip goals and go to dashboard
      await page.getByRole('button', { name: /Skip for now/i }).click();

      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    });
  });

  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      // Create a full user account with character
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/register');

      const uniqueEmail = `dashtest-${Date.now()}@example.com`;
      const uniqueUsername = `dashtest${Date.now()}`;

      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel(/^Username$/).fill(uniqueUsername);
      await page.getByLabel(/^Password$/).fill(testPassword);
      await page.getByLabel(/Confirm Password/).fill(testPassword);
      await page.getByRole('button', { name: /Create Account/i }).click();

      await expect(page).toHaveURL(/.*character\/create/, { timeout: 10000 });

      await page.getByLabel(/Character Name/i).fill('Dashboard Hero');
      await page.getByRole('button', { name: /Begin Your Journey/i }).click();

      await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 10000 });

      // Skip to dashboard
      await page.getByRole('button', { name: /Skip for now/i }).click();
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    });

    test('should display dashboard elements', async ({ page }) => {
      // Check header
      await expect(page.getByRole('heading', { name: /Dumbbells & Dragons/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();

      // Check character name heading
      await expect(page.getByRole('heading', { name: /Dashboard Hero/i })).toBeVisible();
      await expect(page.getByText(/Level 1/i)).toBeVisible();

      // Check stats heading
      await expect(page.getByRole('heading', { name: /Your Stats/i })).toBeVisible();
    });

    test('should display all 6 character stats', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Strength' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dexterity' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Constitution' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Intelligence' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Wisdom' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Charisma' })).toBeVisible();
    });

    test('should show XP progress for each stat', async ({ page }) => {
      // Each stat should show XP progress like "0 / 100"
      const xpProgress = page.getByText(/\d+\s*\/\s*\d+/);
      await expect(xpProgress.first()).toBeVisible();

      // Should have 6 stat cards (one for each stat)
      const statCards = await page.locator('.card').filter({ hasText: /XP Progress/i }).count();
      expect(statCards).toBe(6);
    });

    test('should display goals section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Daily Goals/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /\\+ Add Goal/i })).toBeVisible();
    });

    test('should show message when no goals exist', async ({ page }) => {
      await expect(page.getByText(/haven't set any goals yet/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Your First Goal/i })).toBeVisible();
    });

    test('should navigate to goal setup when clicking Add Goal', async ({ page }) => {
      await page.getByRole('button', { name: /\\+ Add Goal/i }).click();
      await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 5000 });
    });

    test('should logout and redirect to login', async ({ page }) => {
      await page.getByRole('button', { name: /Logout/i }).click();
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
    });

    test('should allow access to protected routes when authenticated', async ({ page }) => {
      // Register and create character first
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/register');

      const uniqueEmail = `authtest-${Date.now()}@example.com`;
      const uniqueUsername = `authtest${Date.now()}`;

      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel(/^Username$/).fill(uniqueUsername);
      await page.getByLabel(/^Password$/).fill(testPassword);
      await page.getByLabel(/Confirm Password/).fill(testPassword);
      await page.getByRole('button', { name: /Create Account/i }).click();

      await expect(page).toHaveURL(/.*character\/create/, { timeout: 10000 });

      await page.getByLabel(/Character Name/i).fill('Auth Test');
      await page.getByRole('button', { name: /Begin Your Journey/i }).click();

      await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 10000 });

      await page.getByRole('button', { name: /Skip for now/i }).click();
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

      // Now try to navigate to other protected routes - should work
      await page.goto('/character/create');
      await expect(page).toHaveURL(/.*character\/create/, { timeout: 5000 });

      await page.goto('/goals/setup');
      await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 5000 });
    });
  });
});
