/**
 * Test script for AI Quest Generation Pipeline
 *
 * Tests the full workflow:
 * 1. Story Coordinator evaluates quest need
 * 2. Quest Creator generates quest
 * 3. Lorekeeper validates against World Bible
 * 4. Quest is stored in database
 *
 * Usage: node test-quest-generation.js <characterId>
 */

require('dotenv').config();
const storyCoordinator = require('./src/services/agents/storyCoordinator');
const questCreator = require('./src/services/agents/questCreator');
const lorekeeper = require('./src/services/agents/lorekeeper');
const questService = require('./src/services/questService');
const pool = require('./src/config/database');

async function testQuestGeneration(characterId) {
  console.log('='.repeat(80));
  console.log('🧪 Testing AI Quest Generation Pipeline');
  console.log('='.repeat(80));
  console.log();

  try {
    // Get character data
    console.log('📋 Step 1: Fetching character data...');
    const character = await questService.getCharacter(characterId);
    if (!character) {
      console.error('❌ Character not found');
      return;
    }

    console.log(`✅ Character loaded: ${character.name} (Level ${character.level || 1})`);
    console.log(`   Stats: STR ${character.str} DEX ${character.dex} CON ${character.con} INT ${character.int} WIS ${character.wis} CHA ${character.cha}`);
    console.log();

    // Get active quest count
    const activeQuestCount = await questService.getActiveQuestCount(characterId);
    console.log(`   Active quests: ${activeQuestCount}`);
    console.log();

    // Step 1: Story Coordinator
    console.log('🧠 Step 2: Story Coordinator - Evaluating quest need...');
    console.time('Story Coordinator');
    const decision = await storyCoordinator.evaluateQuestNeed(characterId, character, activeQuestCount);
    console.timeEnd('Story Coordinator');
    console.log();

    console.log('📊 Story Coordinator Decision:');
    console.log(`   Needs Quest: ${decision.needsQuest}`);
    if (decision.needsQuest) {
      console.log(`   Quest Type: ${decision.questType}`);
      console.log(`   Theme: ${decision.suggestedTheme}`);
      console.log(`   Difficulty: ${decision.suggestedDifficulty}`);
      console.log(`   Target Stat: ${decision.targetStat || 'N/A'}`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      console.log(`   Model: ${decision.metadata?.model || 'unknown'}`);
      console.log(`   Cost: $${decision.metadata?.cost?.toFixed(4) || '0.0000'}`);
      console.log(`   Cached: ${decision.metadata?.cached ? 'Yes' : 'No'}`);
    } else {
      console.log(`   Reasoning: ${decision.reasoning}`);
      console.log('\n✅ Test complete - no quest needed');
      return;
    }
    console.log();

    // Step 2: Quest Creator
    console.log('✨ Step 3: Quest Creator - Generating quest...');
    console.time('Quest Creator');
    const quest = await questCreator.generateQuest(decision, character, characterId);
    console.timeEnd('Quest Creator');
    console.log();

    console.log('📜 Generated Quest:');
    console.log(`   Title: ${quest.title}`);
    console.log(`   Description: ${quest.description}`);
    console.log(`   NPC Involved: ${quest.npcInvolved || 'None'}`);
    console.log(`   Estimated Duration: ${quest.estimatedDuration}`);
    console.log(`   Objectives (${quest.objectives.length}):`);
    quest.objectives.forEach((obj, i) => {
      console.log(`     ${i + 1}. ${obj.description}`);
      console.log(`        Mapping: ${obj.goalMapping}`);
      console.log(`        Reward: ${obj.statReward} +${obj.xpReward} XP`);
    });
    console.log(`   Model: ${quest.metadata?.model || 'unknown'}`);
    console.log(`   Cost: $${quest.metadata?.cost?.toFixed(4) || '0.0000'}`);
    console.log(`   Fallback: ${quest.metadata?.fallback ? 'Yes' : 'No'}`);
    console.log();

    // Step 3: Lorekeeper
    console.log('🛡️  Step 4: Lorekeeper - Validating quest...');
    console.time('Lorekeeper');
    const validation = await lorekeeper.validateQuest(quest, character, characterId);
    console.timeEnd('Lorekeeper');
    console.log();

    console.log('🔍 Validation Results:');
    console.log(`   Score: ${validation.score}/100`);
    console.log(`   Passed: ${validation.passed ? '✅ Yes' : '❌ No'}`);

    if (validation.violations && validation.violations.length > 0) {
      console.log(`   Violations (${validation.violations.length}):`);
      validation.violations.forEach(v => {
        console.log(`     [${v.severity.toUpperCase()}] ${v.type}: ${v.description}`);
        console.log(`       Location: ${v.location}`);
      });
    } else {
      console.log('   Violations: None');
    }

    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log(`   Suggestions:`);
      validation.suggestions.forEach(s => console.log(`     - ${s}`));
    }

    if (validation.strengths && validation.strengths.length > 0) {
      console.log(`   Strengths:`);
      validation.strengths.forEach(s => console.log(`     - ${s}`));
    }

    console.log(`   Model: ${validation.metadata?.model || 'unknown'}`);
    console.log(`   Cost: $${validation.metadata?.cost?.toFixed(4) || '0.0000'}`);
    console.log(`   Fallback: ${validation.metadata?.fallback ? 'Yes' : 'No'}`);
    console.log();

    // Step 4: Store Quest
    console.log('💾 Step 5: Storing quest in database...');
    console.time('Store Quest');
    const result = await questService.storeQuest(characterId, quest, decision, validation);
    console.timeEnd('Store Quest');
    console.log();

    console.log('✅ Quest stored successfully!');
    console.log(`   Quest ID: ${result.quest.id}`);
    console.log(`   Status: ${result.quest.status}`);
    console.log(`   Expires: ${new Date(result.quest.expires_at).toLocaleDateString()}`);
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('📊 Pipeline Summary');
    console.log('='.repeat(80));
    console.log(`Quest Title: ${quest.title}`);
    console.log(`Quest Type: ${decision.questType}`);
    console.log(`Validation Score: ${validation.score}/100 ${validation.passed ? '✅' : '❌'}`);
    console.log(`Total Cost: $${(
      (decision.metadata?.cost || 0) +
      (quest.metadata?.cost || 0) +
      (validation.metadata?.cost || 0)
    ).toFixed(4)}`);
    console.log(`Quest ID: ${result.quest.id}`);
    console.log();
    console.log('✅ AI Quest Generation Pipeline Test Complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run test
const characterId = process.argv[2];

if (!characterId) {
  console.error('Usage: node test-quest-generation.js <characterId>');
  console.error('\nExample: node test-quest-generation.js 1');
  process.exit(1);
}

console.log(`Testing quest generation for character ID: ${characterId}\n`);
testQuestGeneration(parseInt(characterId));
