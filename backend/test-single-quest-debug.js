/**
 * Debug single quest generation to see violations
 */

require('dotenv').config();
const storyCoordinator = require('./src/services/agents/storyCoordinator');
const questCreator = require('./src/services/agents/questCreator');
const lorekeeper = require('./src/services/agents/lorekeeper');
const questService = require('./src/services/questService');
const pool = require('./src/config/database');

async function debugQuest(characterId) {
  try {
    const character = await questService.getCharacter(characterId);

    console.log('Generating quest...\n');

    // Story Coordinator
    const decision = await storyCoordinator.evaluateQuestNeed(characterId, character, 0);
    if (!decision.needsQuest) {
      decision.needsQuest = true;
      decision.questType = 'side';
      decision.suggestedDifficulty = 'medium';
      decision.suggestedTheme = 'Test quest generation';
    }

    // Quest Creator
    const quest = await questCreator.generateQuest(decision, character, characterId);

    console.log('Quest Generated:');
    console.log(`  Title: ${quest.title}`);
    console.log(`  Description: ${quest.description}`);
    console.log(`  Objectives:`);
    quest.objectives.forEach((obj, i) => {
      console.log(`    ${i+1}. ${obj.description} (${obj.statReward} +${obj.xpReward} XP)`);
    });
    console.log();

    // Lorekeeper Validation
    const validation = await lorekeeper.validateQuest(quest, character, characterId);

    console.log('Validation Results:');
    console.log(`  Score: ${validation.score}/100`);
    console.log(`  Passed: ${validation.passed}`);
    console.log();

    if (validation.violations && validation.violations.length > 0) {
      console.log('Violations:');
      validation.violations.forEach((v, i) => {
        console.log(`  ${i+1}. [${v.severity.toUpperCase()}] ${v.type}`);
        console.log(`     ${v.description}`);
        console.log(`     Location: ${v.location}`);
      });
      console.log();
    }

    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log('Suggestions:');
      validation.suggestions.forEach((s, i) => {
        console.log(`  ${i+1}. ${s}`);
      });
      console.log();
    }

    if (validation.strengths && validation.strengths.length > 0) {
      console.log('Strengths:');
      validation.strengths.forEach((s, i) => {
        console.log(`  ${i+1}. ${s}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

const characterId = process.argv[2] || 1;
debugQuest(parseInt(characterId));
