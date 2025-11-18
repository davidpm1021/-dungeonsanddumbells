/**
 * Comprehensive Orchestration System Tests
 * Tests all research-backed agent systems for quality validation
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/agent-lab';

const testCharacter = {
  id: 999,
  name: 'Kira Stormbreaker',
  class: 'Fighter',
  level: 3,
  str: 15,
  dex: 12,
  con: 14,
  int: 10,
  wis: 11,
  cha: 13
};

const testQuest = {
  id: 1,
  title: 'The Shadow Forge',
  description: 'Ancient blacksmith spirits haunt an abandoned forge',
  questType: 'main',
  difficulty: 'medium',
  npcInvolved: 'Master Ironbrand',
  objectives: [
    {
      id: 1,
      narrativeDescription: 'Investigate the forge ruins',
      mechanicalDescription: 'Complete morning workout',
      statReward: 'STR',
      xpReward: 50
    }
  ]
};

const testQualities = {
  journey_begun: true,
  first_challenge_overcome: true,
  inner_doubt_faced: false,
  mentor_found: true,
  total_quests_completed: 5
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(name, testFn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms)`);
    return { name, passed: true, duration, result };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ FAILED: ${error.message}`);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return { name, passed: false, duration, error: error.message };
  }
}

// TEST 1: Validation Pipeline - Defense-in-depth
async function testValidationPipeline() {
  console.log('Testing 3-tier validation (pre, generation, post)...');

  const response = await axios.post(`${API_URL}/validation-pipeline`, {
    character: testCharacter,
    quest: testQuest,
    tier: 'all'
  });

  const { preGeneration, generation, postGeneration } = response.data.output;

  // Verify all tiers executed
  if (!preGeneration || !generation || !postGeneration) {
    throw new Error('Not all validation tiers executed');
  }

  console.log(`  Pre-generation: ${preGeneration.valid ? 'VALID' : 'INVALID'} (score: ${preGeneration.score})`);
  console.log(`  Generation: ${generation.valid ? 'VALID' : 'INVALID'} (score: ${generation.score})`);
  console.log(`  Post-generation: ${postGeneration.valid ? 'VALID' : 'INVALID'} (score: ${postGeneration.score})`);

  // Check scores are reasonable (0-1 range)
  const scores = [preGeneration.score, generation.score, postGeneration.score];
  for (const score of scores) {
    if (score < 0 || score > 1) {
      throw new Error(`Invalid score range: ${score}`);
    }
  }

  return response.data;
}

// TEST 2: Storylet System - Prerequisites & Progression
async function testStoryletSystem() {
  console.log('Testing storylet prerequisites and progression...');

  // Test getting available storylets
  const availableResponse = await axios.post(`${API_URL}/storylet-system`, {
    character: testCharacter,
    qualities: testQualities,
    action: 'get_available'
  });

  const { availableStorylets, progressionStage } = availableResponse.data.output;
  console.log(`  Available storylets: ${availableStorylets?.length || 0}`);
  console.log(`  Progression stage: ${progressionStage}`);

  // Test prerequisite checking
  const prereqResponse = await axios.post(`${API_URL}/storylet-system`, {
    character: testCharacter,
    qualities: testQualities,
    action: 'check_prerequisites'
  });

  const prereqResult = prereqResponse.data.output;
  console.log(`  Prerequisite met: ${prereqResult.met}`);
  console.log(`  Tested qualities: ${Object.keys(prereqResult.qualities).length}`);

  // Test progression simulation
  const progressResponse = await axios.post(`${API_URL}/storylet-system`, {
    character: testCharacter,
    qualities: testQualities,
    action: 'simulate_progression'
  });

  const { stages } = progressResponse.data.output;
  console.log(`  Simulated stages: ${stages?.length || 0}`);

  // Verify progression stage is a number (0-4 mapping to acts)
  if (typeof progressionStage !== 'number') {
    throw new Error(`Invalid progression stage type: ${typeof progressionStage}`);
  }

  return progressResponse.data;
}

// TEST 3: Knowledge Graph - Entity Extraction
async function testKnowledgeGraph() {
  console.log('Testing entity extraction and relationship tracking...');

  // Test entity extraction
  const extractResponse = await axios.post(`${API_URL}/knowledge-graph`, {
    character: testCharacter,
    quest: testQuest,
    action: 'extract'
  });

  const { extractedEntities, extractedRelationships, entityCount, relationshipCount } = extractResponse.data.output;
  console.log(`  Extracted entities: ${entityCount}`);
  console.log(`  NPCs found: ${extractedEntities.filter(e => e.type === 'npc').length}`);
  console.log(`  Locations found: ${extractedEntities.filter(e => e.type === 'location').length}`);
  console.log(`  Relationships: ${relationshipCount}`);

  // Verify entity extraction
  if (entityCount === 0) {
    throw new Error('No entities extracted from quest');
  }

  // Should find the NPC
  const hasNPC = extractedEntities.some(e => e.type === 'npc');
  if (!hasNPC) {
    throw new Error('Failed to extract NPC from quest');
  }

  // Test graph query
  const graphResponse = await axios.post(`${API_URL}/knowledge-graph`, {
    character: testCharacter,
    quest: testQuest,
    action: 'get_graph'
  });

  const graphOutput = graphResponse.data.output;
  console.log(`  Graph entities: ${graphOutput.summary?.totalEntities || Object.keys(graphOutput.entities || {}).length}`);
  console.log(`  Graph relationships: ${graphOutput.summary?.totalRelationships || Object.keys(graphOutput.relationships || {}).length}`);

  return extractResponse.data;
}

// TEST 4: Self-Consistency - Variation Checking
async function testSelfConsistency() {
  console.log('Testing self-consistency via variation generation...');

  const response = await axios.post(`${API_URL}/self-consistency`, {
    character: testCharacter,
    quest: testQuest,
    variations: 3
  });

  const { quickCheck, fullCheck } = response.data.output;

  console.log(`  Quick check passed: ${quickCheck?.valid !== false}`);
  console.log(`  Full consistency: ${fullCheck?.consistent ? 'CONSISTENT' : 'INCONSISTENT'}`);
  console.log(`  Consistency score: ${((fullCheck?.score || 0) * 100).toFixed(1)}%`);
  console.log(`  Variance: ${((fullCheck?.variance || 0) * 100).toFixed(2)}%`);

  // Verify consistency metrics
  if (fullCheck?.score !== undefined && (fullCheck.score < 0 || fullCheck.score > 1)) {
    throw new Error(`Invalid consistency score: ${fullCheck.score}`);
  }

  // High variance indicates potential hallucination
  if (fullCheck?.variance > 0.3) {
    console.log('  ⚠️ WARNING: High variance detected - potential inconsistency');
  }

  return response.data;
}

// TEST 5: Story Coordinator - Individual Agent Quality
async function testStoryCoordinator() {
  console.log('Testing Story Coordinator decision quality...');

  const response = await axios.post(`${API_URL}/story-coordinator`, {
    character: testCharacter,
    activeQuestCount: 1
  });

  const { output } = response.data;

  console.log(`  Needs quest: ${output.needsQuest}`);
  console.log(`  Quest type: ${output.questType || 'N/A'}`);
  console.log(`  Suggested theme: ${output.suggestedTheme || 'N/A'}`);
  console.log(`  Difficulty: ${output.suggestedDifficulty || 'N/A'}`);
  console.log(`  Reasoning: ${output.reasoning?.substring(0, 100)}...`);
  console.log(`  Model: ${output.metadata?.model}`);
  console.log(`  Cost: $${output.metadata?.cost?.toFixed(4)}`);
  console.log(`  Latency: ${output.metadata?.latency}ms`);

  // Verify decision structure
  if (typeof output.needsQuest !== 'boolean') {
    throw new Error('Invalid needsQuest decision');
  }

  if (output.needsQuest) {
    if (!output.questType || !output.suggestedTheme || !output.suggestedDifficulty) {
      throw new Error('Missing quest recommendation details');
    }
  }

  // Verify cost is within bounds ($0.01 - $0.05 expected)
  if (output.metadata?.cost > 0.10) {
    console.log('  ⚠️ WARNING: High cost detected');
  }

  return response.data;
}

async function main() {
  console.log('🚀 Starting Comprehensive Orchestration System Tests');
  console.log(`Target: ${API_URL}`);
  console.log(`Character: ${testCharacter.name} (${testCharacter.class})`);

  const results = [];

  // Run tests with delays between to avoid rate limiting
  results.push(await runTest('1. Validation Pipeline (Defense-in-Depth)', testValidationPipeline));
  await sleep(1000);

  results.push(await runTest('2. Storylet System (Prerequisites & Progression)', testStoryletSystem));
  await sleep(1000);

  results.push(await runTest('3. Knowledge Graph (Entity Extraction)', testKnowledgeGraph));
  await sleep(1000);

  results.push(await runTest('4. Self-Consistency (Variation Checking)', testSelfConsistency));
  await sleep(1000);

  results.push(await runTest('5. Story Coordinator (Agent Quality)', testStoryCoordinator));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name} (${r.duration}ms)`);
  });

  console.log(`\nTotal: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed. Review errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Orchestration systems are working correctly.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
