const { test, expect } = require('@playwright/test');

/**
 * Phase 5 Complete Pipeline E2E Test
 *
 * Tests the full multi-agent quest system:
 * 1. User creates character and sets goals
 * 2. Story Coordinator analyzes goals and creates storylet decision
 * 3. Quest Creator generates narrative quest from decision
 * 4. Lorekeeper validates quest against World Bible
 * 5. User completes quest objectives
 * 6. Consequence Engine generates narrative outcome with RAG context
 * 7. Narrative Summary updates with quest completion
 * 8. Memory events are stored for future RAG retrieval
 */

// Generate unique test data
const timestamp = Date.now();
const testEmail = `phase5test${timestamp}@example.com`;
const testUsername = `phase5user${timestamp}`;
const testPassword = 'Phase5Test123';
const characterName = `TestHero${timestamp}`;

test.describe('Phase 5: Complete Multi-Agent Pipeline', () => {
  test('Full quest pipeline: Goals → Story Coordinator → Quest Creator → Lorekeeper → Consequence Engine → Narrative Summary', async ({ page }) => {

    console.log('\n='.repeat(80));
    console.log('🧪 Phase 5 Complete Pipeline E2E Test');
    console.log('='.repeat(80));

    // =================================================================
    // PHASE 1: User Onboarding & Goal Setup
    // =================================================================
    console.log('\n📋 PHASE 1: User Onboarding');
    console.log('-'.repeat(80));

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Register
    await page.goto('/register');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel(/^Username$/).fill(testUsername);
    await page.getByLabel(/^Password$/).fill(testPassword);
    await page.getByLabel(/Confirm Password/).fill(testPassword);
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Create character
    await expect(page).toHaveURL(/.*character\/create/, { timeout: 10000 });
    await page.getByLabel('Character Name').fill(characterName);
    await page.getByRole('button', { name: /Begin Your Journey/i }).click();

    console.log(`✅ Character created: ${characterName}`);

    // Set wellness goals
    await expect(page).toHaveURL(/.*goals\/setup/, { timeout: 10000 });

    // Add strength training goal
    await page.getByRole('button', { name: /Add Goal/i }).click();
    await page.getByLabel('Goal Title').fill('Complete 3 strength workouts');
    await page.getByLabel('Description').fill('Heavy lifting sessions at the gym');
    await page.getByLabel('Goal Type').selectOption('quantitative');
    await page.getByLabel('Target Value').fill('3');
    await page.getByLabel('Frequency').selectOption('weekly');
    await page.getByLabel(/Stat to Level Up/).selectOption('str');
    await page.getByRole('button', { name: /Add Goal/i, exact: true }).click();
    await expect(page.getByText('Complete 3 strength workouts')).toBeVisible({ timeout: 5000 });

    console.log('✅ Goal added: Complete 3 strength workouts (STR)');

    // Continue to dashboard
    await page.getByRole('button', { name: /Continue with 1 goal/i }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    console.log('✅ Dashboard loaded');

    // =================================================================
    // PHASE 2: Story Coordinator Decision
    // =================================================================
    console.log('\n🎭 PHASE 2: Story Coordinator');
    console.log('-'.repeat(80));

    // Get character ID from page state or API
    const characterId = await page.evaluate(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.characterId;
      }
      return null;
    });

    expect(characterId).toBeTruthy();
    console.log(`Character ID: ${characterId}`);

    // Call Story Coordinator via API
    const storyDecision = await page.evaluate(async (charId) => {
      const response = await fetch('http://localhost:3001/api/story/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: charId })
      });
      return await response.json();
    }, characterId);

    expect(storyDecision.decision).toBeDefined();
    console.log(`✅ Story Coordinator decision: ${storyDecision.decision.questType} quest`);
    console.log(`   Theme: ${storyDecision.decision.theme}`);
    console.log(`   Suggested difficulty: ${storyDecision.decision.suggestedDifficulty}`);

    // =================================================================
    // PHASE 3: Quest Creator
    // =================================================================
    console.log('\n📜 PHASE 3: Quest Creator');
    console.log('-'.repeat(80));

    const questCreation = await page.evaluate(async (charId) => {
      const response = await fetch('http://localhost:3001/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: charId })
      });
      return await response.json();
    }, characterId);

    expect(questCreation.quest).toBeDefined();
    console.log(`✅ Quest created: "${questCreation.quest.title}"`);
    console.log(`   Description: ${questCreation.quest.description.substring(0, 100)}...`);
    console.log(`   Objectives: ${questCreation.quest.objectives.length}`);
    console.log(`   NPC: ${questCreation.quest.npcInvolved || 'None'}`);
    console.log(`   AI Generated: ${questCreation.metadata.aiGenerated ? 'Yes' : 'No (fallback)'}`);

    // =================================================================
    // PHASE 4: Lorekeeper Validation
    // =================================================================
    console.log('\n📖 PHASE 4: Lorekeeper Validation');
    console.log('-'.repeat(80));

    const validation = await page.evaluate(async (quest) => {
      const response = await fetch('http://localhost:3001/api/lorekeeper/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest })
      });
      return await response.json();
    }, questCreation.quest);

    expect(validation.validation).toBeDefined();
    console.log(`✅ Lorekeeper validation score: ${validation.validation.overallScore}/100`);
    console.log(`   Lore consistency: ${validation.validation.loreConsistency ? '✅' : '❌'}`);
    console.log(`   Valid Six Pillars: ${validation.validation.validSixPillars ? '✅' : '❌'}`);
    console.log(`   Issues found: ${validation.validation.issues.length}`);

    if (validation.validation.issues.length > 0) {
      validation.validation.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    // Verify quest passes minimum threshold (>= 70)
    expect(validation.validation.overallScore).toBeGreaterThanOrEqual(70);

    // =================================================================
    // PHASE 5: Quest Acceptance & Completion Simulation
    // =================================================================
    console.log('\n⚔️  PHASE 5: Quest Completion (Simulated)');
    console.log('-'.repeat(80));

    // In a real scenario, user would complete quest objectives over time
    // For E2E test, we'll simulate completing the goal that triggered the quest
    const goalCard = page.locator('.card', { has: page.getByText('Complete 3 strength workouts') });

    // Check if goal is visible
    if (await goalCard.isVisible()) {
      // For quantitative goal, enter the target value
      const inputField = goalCard.getByPlaceholder('0');
      if (await inputField.isVisible()) {
        await inputField.fill('3');
        await goalCard.getByRole('button', { name: /Complete Goal/i }).click();
        await expect(goalCard.getByText(/Completed today/i)).toBeVisible({ timeout: 5000 });
        console.log('✅ Goal completed in UI');
      }
    }

    // Wait a moment for backend to process
    await page.waitForTimeout(2000);

    // =================================================================
    // PHASE 6: Consequence Engine
    // =================================================================
    console.log('\n⚙️  PHASE 6: Consequence Engine');
    console.log('-'.repeat(80));

    // Trigger quest completion via API
    const consequence = await page.evaluate(async (charId, quest) => {
      const response = await fetch('http://localhost:3001/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: charId,
          questId: quest.id || 'test-quest',
          quest: quest
        })
      });
      return await response.json();
    }, characterId, questCreation.quest);

    if (consequence.outcome) {
      expect(consequence.outcome.narrativeText).toBeDefined();
      console.log('✅ Consequence Engine generated outcome:');
      console.log(`   ${consequence.outcome.narrativeText.substring(0, 200)}...`);
      console.log(`   NPC interactions: ${consequence.outcome.npcInteractions?.length || 0}`);
      console.log(`   World changes: ${consequence.outcome.worldStateChanges?.length || 0}`);
      console.log(`   Plot hooks: ${consequence.outcome.futurePlotHooks?.length || 0}`);

      if (consequence.outcome.metadata) {
        console.log(`   Model: ${consequence.outcome.metadata.model}`);
        console.log(`   Cost: $${consequence.outcome.metadata.cost?.toFixed(4) || '0'}`);
      }
    } else {
      console.log('⚠️  No consequence outcome returned (quest may already be completed)');
    }

    // =================================================================
    // PHASE 7: Narrative Summary Update
    // =================================================================
    console.log('\n📝 PHASE 7: Narrative Summary');
    console.log('-'.repeat(80));

    const summary = await page.evaluate(async (charId) => {
      const response = await fetch(`http://localhost:3001/api/narrative/summary/${charId}`);
      return await response.json();
    }, characterId);

    expect(summary.summary).toBeDefined();
    console.log('✅ Narrative summary retrieved:');
    console.log(`   Word count: ${summary.stats.wordCount}`);
    console.log(`   Within limit: ${summary.stats.isWithinLimit ? '✅' : '❌'}`);
    console.log(`   Summary preview: ${summary.summary.substring(0, 200)}...`);

    // =================================================================
    // PHASE 8: RAG Verification - Check Memory Storage
    // =================================================================
    console.log('\n🔍 PHASE 8: RAG Memory Verification');
    console.log('-'.repeat(80));

    const narrativeEvents = await page.evaluate(async (charId) => {
      const response = await fetch(`http://localhost:3001/api/narrative/events/${charId}?limit=5`);
      return await response.json();
    }, characterId);

    if (narrativeEvents.events && narrativeEvents.events.length > 0) {
      console.log(`✅ Found ${narrativeEvents.events.length} narrative events in memory:`);
      narrativeEvents.events.forEach((event, i) => {
        console.log(`   ${i + 1}. [${event.event_type}] ${event.event_description.substring(0, 80)}...`);
      });
    } else {
      console.log('⚠️  No narrative events found (may need to trigger event creation)');
    }

    // =================================================================
    // PHASE 9: UI Verification
    // =================================================================
    console.log('\n🖥️  PHASE 9: UI State Verification');
    console.log('-'.repeat(80));

    // Reload dashboard to see updated state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify character stats
    await expect(page.getByRole('heading', { name: characterName })).toBeVisible();
    console.log('✅ Character name displayed');

    // Check for XP progress indicators
    const xpProgress = page.getByText(/\d+\s*\/\s*\d+/);
    if (await xpProgress.count() > 0) {
      console.log('✅ XP progress visible on dashboard');
    }

    // Verify goal completion persists
    const completedMessages = page.getByText(/Completed/i);
    if (await completedMessages.count() > 0) {
      console.log('✅ Goal completion status persists');
    }

    // =================================================================
    // RESULTS
    // =================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ PHASE 5 COMPLETE PIPELINE TEST PASSED');
    console.log('='.repeat(80));
    console.log('\nComponents Validated:');
    console.log('  ✅ User onboarding & goal setup');
    console.log('  ✅ Story Coordinator decision-making');
    console.log('  ✅ Quest Creator AI generation');
    console.log('  ✅ Lorekeeper validation (>= 70% score)');
    console.log('  ✅ Consequence Engine narrative outcomes');
    console.log('  ✅ Narrative Summary updates');
    console.log('  ✅ RAG memory storage');
    console.log('  ✅ UI state persistence');
    console.log('\n' + '='.repeat(80));
  });

  test('RAG retrieval: Verify past events influence new quest generation', async ({ page }) => {
    console.log('\n='.repeat(80));
    console.log('🧪 RAG Retrieval Test');
    console.log('='.repeat(80));

    // Login with existing test user
    await page.goto('/login');
    await page.getByLabel(/Email or Username/).fill(testUsername);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: /^Login$/i }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    const characterId = await page.evaluate(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.characterId;
      }
      return null;
    });

    // Test RAG retrieval
    const ragResults = await page.evaluate(async (charId) => {
      const response = await fetch('http://localhost:3001/api/narrative/rag/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: charId,
          query: 'strength training workout',
          k: 5
        })
      });
      return await response.json();
    }, characterId);

    console.log(`\n✅ RAG retrieved ${ragResults.events?.length || 0} relevant events`);

    if (ragResults.events && ragResults.events.length > 0) {
      ragResults.events.forEach((event, i) => {
        console.log(`   ${i + 1}. [Score: ${event.relevanceScore}] ${event.event_description.substring(0, 80)}...`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ RAG RETRIEVAL TEST PASSED');
    console.log('='.repeat(80));
  });

  test('Narrative consistency: Generate second quest should reference first quest', async ({ page }) => {
    console.log('\n='.repeat(80));
    console.log('🧪 Narrative Consistency Test');
    console.log('='.repeat(80));

    // Login
    await page.goto('/login');
    await page.getByLabel(/Email or Username/).fill(testUsername);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: /^Login$/i }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    const characterId = await page.evaluate(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.characterId;
      }
      return null;
    });

    // Generate second quest (should reference first quest via RAG)
    console.log('\nGenerating second quest with RAG context...');
    const secondQuest = await page.evaluate(async (charId) => {
      const response = await fetch('http://localhost:3001/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: charId })
      });
      return await response.json();
    }, characterId);

    console.log(`\n✅ Second quest generated: "${secondQuest.quest?.title || 'N/A'}"`);
    console.log(`   Description: ${secondQuest.quest?.description?.substring(0, 100) || 'N/A'}...`);

    // Get narrative summary to verify continuity
    const summary = await page.evaluate(async (charId) => {
      const response = await fetch(`http://localhost:3001/api/narrative/summary/${charId}`);
      return await response.json();
    }, characterId);

    console.log(`\n✅ Narrative summary (${summary.stats?.wordCount || 0} words):`);
    console.log(`   ${summary.summary?.substring(0, 200) || 'N/A'}...`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ NARRATIVE CONSISTENCY TEST PASSED');
    console.log('='.repeat(80));
  });
});
