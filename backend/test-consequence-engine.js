/**
 * Test Consequence Engine
 *
 * Generates a narrative outcome for a completed quest.
 */

require('dotenv').config();
const consequenceEngine = require('./src/services/agents/consequenceEngine');
const questService = require('./src/services/questService');
const pool = require('./src/config/database');

async function testConsequenceEngine(characterId) {
  try {
    // Get character
    const character = await questService.getCharacter(characterId);
    if (!character) {
      console.error('❌ Character not found');
      return;
    }

    console.log(`Testing Consequence Engine for: ${character.name}\n`);

    // Get recent narrative events for context
    const recentMemories = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [characterId]
    );

    // Create a mock quest
    const mockQuest = {
      title: "The Merchant's Heavy Cargo",
      description: "A traveling merchant needs help unloading heavy supplies at the market square.",
      objectives: [
        {
          description: "Complete 3 strength training workouts this week",
          goalMapping: "strength training",
          statReward: "STR",
          xpReward: 150
        }
      ],
      npcInvolved: "Gareth the Merchant",
      estimatedDuration: "1 week",
      difficulty: "medium"
    };

    console.log('Quest:', mockQuest.title);
    console.log('NPC:', mockQuest.npcInvolved);
    console.log('Recent memories:', recentMemories.rows.length);
    console.log();

    // Generate outcome
    console.log('Generating narrative outcome...\n');
    const outcome = await consequenceEngine.generateOutcome(
      mockQuest,
      character,
      characterId,
      recentMemories.rows
    );

    // Display outcome
    console.log('='.repeat(80));
    console.log('NARRATIVE OUTCOME');
    console.log('='.repeat(80));
    console.log();
    console.log(outcome.narrativeText);
    console.log();

    if (outcome.npcInteractions && outcome.npcInteractions.length > 0) {
      console.log('NPC Interactions:');
      outcome.npcInteractions.forEach(interaction => {
        console.log(`  - ${interaction.npc}: ${interaction.relationshipChange}`);
        console.log(`    ${interaction.note}`);
      });
      console.log();
    }

    if (outcome.worldStateChanges && outcome.worldStateChanges.length > 0) {
      console.log('World State Changes:');
      outcome.worldStateChanges.forEach(change => {
        console.log(`  - ${change.change}: ${change.description}`);
      });
      console.log();
    }

    if (outcome.futurePlotHooks && outcome.futurePlotHooks.length > 0) {
      console.log('Future Plot Hooks:');
      outcome.futurePlotHooks.forEach((hook, i) => {
        console.log(`  ${i + 1}. ${hook}`);
      });
      console.log();
    }

    console.log('Metadata:');
    console.log(`  Model: ${outcome.metadata.model}`);
    console.log(`  Latency: ${outcome.metadata.latency}ms`);
    console.log(`  Cost: $${outcome.metadata.cost.toFixed(4)}`);
    console.log(`  Fallback: ${outcome.metadata.fallback ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

const characterId = process.argv[2] || 1;
testConsequenceEngine(parseInt(characterId));
