/**
 * Test Lorekeeper Validation Pass Rate
 *
 * Generates 10 AI quests and calculates what percentage pass Lorekeeper validation.
 * Success criteria: 85%+ pass rate (score >= 85)
 *
 * Usage: node test-lorekeeper-validation.js <characterId>
 */

require('dotenv').config();
const storyCoordinator = require('./src/services/agents/storyCoordinator');
const questCreator = require('./src/services/agents/questCreator');
const lorekeeper = require('./src/services/agents/lorekeeper');
const questService = require('./src/services/questService');
const pool = require('./src/config/database');

async function testLorekeeperValidation(characterId, numTests = 10) {
  console.log('='.repeat(80));
  console.log('🧪 Testing Lorekeeper Validation Pass Rate');
  console.log('='.repeat(80));
  console.log(`Target: 85%+ of AI-generated quests must score >= 85`);
  console.log(`Running ${numTests} quest generations...`);
  console.log();

  const results = [];
  let totalCost = 0;

  try {
    // Get character
    const character = await questService.getCharacter(characterId);
    if (!character) {
      console.error('❌ Character not found');
      return;
    }

    console.log(`Character: ${character.name} (Level ${character.level || 1})`);
    console.log();

    for (let i = 1; i <= numTests; i++) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Test ${i}/${numTests}`);
      console.log('='.repeat(80));

      try {
        // Step 1: Story Coordinator
        console.log('📊 Story Coordinator...');
        const decision = await storyCoordinator.evaluateQuestNeed(characterId, character, 0);

        if (!decision.needsQuest) {
          console.log('⚠️  Story Coordinator said no quest needed, forcing generation...');
          decision.needsQuest = true;
          decision.questType = 'side';
          decision.suggestedDifficulty = 'medium';
          decision.suggestedTheme = 'Test quest generation';
        }

        totalCost += decision.metadata?.cost || 0;
        console.log(`   Cost: $${(decision.metadata?.cost || 0).toFixed(4)}`);

        // Step 2: Quest Creator
        console.log('✨ Quest Creator...');
        const quest = await questCreator.generateQuest(decision, character, characterId);

        totalCost += quest.metadata?.cost || 0;
        console.log(`   Title: "${quest.title}"`);
        console.log(`   Fallback: ${quest.metadata?.fallback ? 'Yes' : 'No'}`);
        console.log(`   Cost: $${(quest.metadata?.cost || 0).toFixed(4)}`);

        // Step 3: Lorekeeper
        console.log('🛡️  Lorekeeper...');
        const validation = await lorekeeper.validateQuest(quest, character, characterId);

        totalCost += validation.metadata?.cost || 0;
        console.log(`   Score: ${validation.score}/100`);
        console.log(`   Passed: ${validation.passed ? '✅' : '❌'}`);
        console.log(`   Fallback: ${validation.metadata?.fallback ? 'Yes' : 'No'}`);
        console.log(`   Cost: $${(validation.metadata?.cost || 0).toFixed(4)}`);

        // Store result
        results.push({
          test: i,
          questTitle: quest.title,
          wasAIGenerated: !quest.metadata?.fallback,
          validationScore: validation.score,
          passed: validation.passed,
          wasAIValidated: !validation.metadata?.fallback,
          violations: validation.violations?.length || 0,
          cost: (decision.metadata?.cost || 0) + (quest.metadata?.cost || 0) + (validation.metadata?.cost || 0)
        });

        // Brief pause between generations
        await sleep(1000);

      } catch (error) {
        console.error(`❌ Test ${i} failed:`, error.message);
        results.push({
          test: i,
          error: error.message,
          passed: false,
          validationScore: 0
        });
      }
    }

    // Calculate statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    console.log();

    const aiGenerated = results.filter(r => r.wasAIGenerated && !r.error);
    const aiValidated = results.filter(r => r.wasAIValidated && !r.error);
    const passed = results.filter(r => r.passed && !r.error);
    const passedAI = results.filter(r => r.passed && r.wasAIGenerated && !r.error);

    console.log(`Total Tests: ${numTests}`);
    console.log(`Successful: ${results.filter(r => !r.error).length}`);
    console.log(`Failed: ${results.filter(r => r.error).length}`);
    console.log();

    console.log('Quest Generation:');
    console.log(`  AI-Generated: ${aiGenerated.length}/${numTests} (${((aiGenerated.length/numTests)*100).toFixed(1)}%)`);
    console.log(`  Fallback Used: ${numTests - aiGenerated.length}`);
    console.log();

    console.log('Lorekeeper Validation:');
    console.log(`  AI-Validated: ${aiValidated.length}/${numTests} (${((aiValidated.length/numTests)*100).toFixed(1)}%)`);
    console.log(`  Fallback Used: ${numTests - aiValidated.length}`);
    console.log();

    console.log('Pass Rate (All Quests):');
    const allPassRate = (passed.length / results.filter(r => !r.error).length) * 100;
    console.log(`  ${passed.length}/${results.filter(r => !r.error).length} passed (${allPassRate.toFixed(1)}%)`);
    console.log();

    if (aiGenerated.length > 0) {
      const aiPassRate = (passedAI.length / aiGenerated.length) * 100;
      console.log('Pass Rate (AI-Generated Quests Only):');
      console.log(`  ${passedAI.length}/${aiGenerated.length} passed (${aiPassRate.toFixed(1)}%)`);
      console.log();

      // Score distribution for AI quests
      const scores = aiGenerated.map(r => r.validationScore).sort((a,b) => b-a);
      console.log('Score Distribution (AI Quests):');
      console.log(`  Highest: ${scores[0]}`);
      console.log(`  Lowest: ${scores[scores.length-1]}`);
      console.log(`  Average: ${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)}`);
      console.log();

      // Phase 4 gate
      console.log('='.repeat(80));
      if (aiPassRate >= 85) {
        console.log('✅ PHASE 4 → 5 GATE: PASSED');
        console.log(`   ${aiPassRate.toFixed(1)}% >= 85% threshold`);
      } else {
        console.log('❌ PHASE 4 → 5 GATE: FAILED');
        console.log(`   ${aiPassRate.toFixed(1)}% < 85% threshold`);
        console.log('   Need to improve Quest Creator or Lorekeeper prompts');
      }
      console.log('='.repeat(80));
    } else {
      console.log('⚠️  No AI-generated quests to evaluate!');
      console.log('   All quests used fallback templates.');
      console.log('   Cannot validate Phase 4 gate.');
    }

    console.log();
    console.log('Cost Analysis:');
    console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`  Cost per Quest: $${(totalCost/numTests).toFixed(4)}`);
    console.log();

    // Detailed results
    console.log('Detailed Results:');
    console.log();
    results.forEach(r => {
      if (r.error) {
        console.log(`  Test ${r.test}: ❌ ERROR - ${r.error}`);
      } else {
        const ai = r.wasAIGenerated ? '🤖' : '📄';
        const pass = r.passed ? '✅' : '❌';
        console.log(`  Test ${r.test}: ${pass} ${ai} Score ${r.validationScore}/100 - "${r.questTitle}"`);
        if (r.violations > 0) {
          console.log(`           ${r.violations} violation(s)`);
        }
      }
    });

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run test
const characterId = process.argv[2];
const numTests = parseInt(process.argv[3]) || 10;

if (!characterId) {
  console.error('Usage: node test-lorekeeper-validation.js <characterId> [numTests]');
  console.error('\nExample: node test-lorekeeper-validation.js 1 10');
  process.exit(1);
}

console.log(`Testing Lorekeeper validation for character ID: ${characterId}\n`);
testLorekeeperValidation(parseInt(characterId), numTests);
