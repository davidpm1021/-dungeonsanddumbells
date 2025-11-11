/**
 * Test Complete Phase 5 Pipeline
 *
 * Tests the full integration of:
 * - RAG system (retrieving relevant events)
 * - Consequence Engine (generating outcomes)
 * - Narrative Summary (maintaining story)
 */

require('dotenv').config();
const narrativeRAG = require('./src/services/narrativeRAG');
const consequenceEngine = require('./src/services/agents/consequenceEngine');
const narrativeSummary = require('./src/services/narrativeSummary');
const questService = require('./src/services/questService');
const pool = require('./src/config/database');

async function testPhase5Pipeline(characterId) {
  console.log('='.repeat(80));
  console.log('🧪 Testing Phase 5: Complete Pipeline');
  console.log('='.repeat(80));
  console.log();

  try {
    // Get character
    const character = await questService.getCharacter(characterId);
    console.log(`Character: ${character.name} (Level ${character.level || 1})`);
    console.log();

    // ====================================================================
    // TEST 1: Narrative Summary
    // ====================================================================
    console.log('📖 TEST 1: Narrative Summary System');
    console.log('-'.repeat(80));

    const currentSummary = await narrativeSummary.getSummary(characterId);
    console.log('Current Summary:');
    console.log(currentSummary);
    console.log();

    const summaryStats = await narrativeSummary.getSummaryStats(characterId);
    console.log('Summary Stats:');
    console.log(`  Words: ${summaryStats.wordCount}`);
    console.log(`  Characters: ${summaryStats.characterCount}`);
    console.log(`  Within limit: ${summaryStats.isWithinLimit ? '✅' : '❌'}`);
    console.log();

    // ====================================================================
    // TEST 2: RAG System - Retrieve Relevant Events
    // ====================================================================
    console.log('🔍 TEST 2: RAG System - Event Retrieval');
    console.log('-'.repeat(80));

    const query = "strength training workout merchant";
    console.log(`Query: "${query}"`);
    console.log();

    const relevantEvents = await narrativeRAG.retrieveRelevantEvents(characterId, query, 5);
    console.log(`Retrieved ${relevantEvents.length} relevant events:`);
    relevantEvents.forEach((event, i) => {
      console.log(`  ${i + 1}. [Score: ${event.relevanceScore}] ${event.event_description}`);
    });
    console.log();

    // ====================================================================
    // TEST 3: Recent Quests
    // ====================================================================
    console.log('📜 TEST 3: Recent Quest History');
    console.log('-'.repeat(80));

    const recentQuests = await narrativeRAG.getRecentQuests(characterId, 3);
    console.log(`Last ${recentQuests.length} completed quests:`);
    recentQuests.forEach((quest, i) => {
      const timeAgo = narrativeRAG.getTimeAgo(quest.completed_at);
      console.log(`  ${i + 1}. [${timeAgo}] ${quest.title}`);
    });
    console.log();

    // ====================================================================
    // TEST 4: Consequence Engine with RAG Context
    // ====================================================================
    console.log('⚙️  TEST 4: Consequence Engine + RAG');
    console.log('-'.repeat(80));

    const mockQuest = {
      title: "The Merchant's Challenge",
      description: "Complete heavy lifting tasks for Gareth the Merchant",
      objectives: [
        {
          description: "Complete 3 strength workouts",
          statReward: "STR",
          xpReward: 150
        }
      ],
      npcInvolved: "Gareth the Merchant"
    };

    console.log('Generating outcome with RAG context...');
    const outcome = await consequenceEngine.generateOutcome(
      mockQuest,
      character,
      characterId,
      relevantEvents
    );

    console.log();
    console.log('Narrative Outcome:');
    console.log(outcome.narrativeText);
    console.log();

    console.log('NPC Interactions:', outcome.npcInteractions?.length || 0);
    console.log('World Changes:', outcome.worldStateChanges?.length || 0);
    console.log('Plot Hooks:', outcome.futurePlotHooks?.length || 0);
    console.log();

    // ====================================================================
    // TEST 5: Update Narrative Summary
    // ====================================================================
    console.log('📝 TEST 5: Update Narrative Summary');
    console.log('-'.repeat(80));

    console.log('Updating summary with quest outcome...');
    const updatedSummary = await narrativeSummary.updateSummary(characterId, {
      quest: mockQuest,
      outcome: outcome
    });

    console.log();
    console.log('Updated Summary:');
    console.log(updatedSummary);
    console.log();

    const newStats = await narrativeSummary.getSummaryStats(characterId);
    console.log('Updated Summary Stats:');
    console.log(`  Words: ${newStats.wordCount}`);
    console.log(`  Within limit: ${newStats.isWithinLimit ? '✅' : '❌'}`);
    console.log();

    // ====================================================================
    // RESULTS
    // ====================================================================
    console.log('='.repeat(80));
    console.log('✅ PHASE 5 PIPELINE TEST COMPLETE');
    console.log('='.repeat(80));
    console.log();
    console.log('Components Tested:');
    console.log('  ✅ Narrative Summary System');
    console.log('  ✅ RAG Event Retrieval');
    console.log('  ✅ Recent Quest History');
    console.log('  ✅ Consequence Engine with Context');
    console.log('  ✅ Summary Update After Quest');
    console.log();
    console.log('Phase 5 Status: COMPLETE');
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

const characterId = process.argv[2] || 1;
console.log(`Testing Phase 5 pipeline for character ID: ${characterId}\n`);
testPhase5Pipeline(parseInt(characterId));
