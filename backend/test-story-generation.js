/**
 * Story Generation Test
 * Demonstrates the full narrative pipeline
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/agent-lab';

// Create a rich character profile
const character = {
  id: 999,
  name: 'Lyra Nightwhisper',
  class: 'Rogue',
  level: 4,
  str: 11,
  dex: 16,
  con: 12,
  int: 14,
  wis: 13,
  cha: 15
};

const goals = [
  { name: 'Morning Meditation', statMapping: 'WIS', goalType: 'binary' },
  { name: 'Evening Run', statMapping: 'DEX', goalType: 'quantitative' },
  { name: 'Daily Reading', statMapping: 'INT', goalType: 'streak' }
];

async function generateStory() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    THE STORY OF LYRA NIGHTWHISPER                ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nCharacter: ${character.name}, Level ${character.level} ${character.class}`);
  console.log(`Stats: STR ${character.str} | DEX ${character.dex} | CON ${character.con} | INT ${character.int} | WIS ${character.wis} | CHA ${character.cha}`);
  console.log('\n');

  // Step 1: Story Coordinator decides what narrative beat is needed
  console.log('📜 CHAPTER 1: The Call to Adventure');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const coordinatorResponse = await axios.post(`${API_URL}/story-coordinator`, {
    character,
    activeQuestCount: 0
  });

  const decision = coordinatorResponse.data.output;
  console.log(`The Story Coordinator contemplates Lyra's path...\n`);
  console.log(`Decision: ${decision.needsQuest ? 'A new quest awaits!' : 'Rest and reflection...'}`);
  console.log(`Quest Type: ${decision.questType || 'None'}`);
  console.log(`Theme: ${decision.suggestedTheme || 'N/A'}`);
  console.log(`Difficulty: ${decision.suggestedDifficulty || 'N/A'}`);
  console.log(`\nReasoning: ${decision.reasoning}\n`);

  // Step 2: Generate the actual quest
  console.log('📖 CHAPTER 2: The Quest Unfolds');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const questResponse = await axios.post(`${API_URL}/quest-creator`, {
    character,
    decision: {
      questType: decision.questType,
      suggestedTheme: decision.suggestedTheme,
      suggestedDifficulty: decision.suggestedDifficulty
    }
  });

  const quest = questResponse.data.output;

  console.log(`Quest Title: "${quest.title}"\n`);
  console.log(`${quest.description}\n`);

  if (quest.openingScene) {
    console.log('Opening Scene:');
    console.log('─────────────');
    console.log(quest.openingScene);
    console.log('\n');
  }

  if (quest.npcDialogue) {
    console.log(`${quest.npcDialogue.npcName || 'The NPC'} speaks:`);
    console.log(`"${quest.npcDialogue.opening || quest.npcDialogue}"\n`);
  }

  // Step 3: Show the objectives (how real-world goals integrate)
  console.log('📋 CHAPTER 3: The Tasks Ahead');
  console.log('─────────────────────────────────────────────────────────────────\n');

  if (quest.objectives && quest.objectives.length > 0) {
    quest.objectives.forEach((obj, i) => {
      console.log(`Objective ${i + 1}: ${obj.narrativeDescription || obj.description}`);
      console.log(`  → Real-world action: ${obj.mechanicalDescription || obj.goalMapping || 'Complete training'}`);
      console.log(`  → Reward: ${obj.statReward || 'XP'} +${obj.xpReward || 50}\n`);
    });
  } else {
    console.log('The quest objectives are embedded within the narrative...\n');
  }

  // Step 4: Validate the quest with Lorekeeper
  console.log('⚖️ CHAPTER 4: The Lorekeeper\'s Judgment');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const lorekeeperResponse = await axios.post(`${API_URL}/lorekeeper`, {
    character,
    quest: {
      title: quest.title,
      description: quest.description,
      questType: quest.questType || decision.questType,
      difficulty: quest.difficulty || decision.suggestedDifficulty,
      npcInvolved: quest.npcInvolved || quest.npcDialogue?.npcName || 'Unknown',
      objectives: quest.objectives || []
    }
  });

  const validation = lorekeeperResponse.data.output;
  console.log(`Consistency Score: ${validation.score}/100`);
  console.log(`Validation: ${validation.passed ? '✅ APPROVED' : '❌ NEEDS REVISION'}\n`);

  if (validation.violations && validation.violations.length > 0) {
    console.log('Issues found:');
    validation.violations.forEach(v => console.log(`  - ${v}`));
    console.log('\n');
  }

  if (validation.feedback) {
    console.log(`Lorekeeper's Notes: ${validation.feedback}\n`);
  }

  // Step 5: Simulate quest completion and consequences
  console.log('🏆 CHAPTER 5: The Aftermath');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const consequenceResponse = await axios.post(`${API_URL}/consequence-engine`, {
    character,
    quest: {
      title: quest.title,
      description: quest.description,
      questType: quest.questType || decision.questType,
      npcInvolved: quest.npcInvolved || quest.npcDialogue?.npcName || 'Unknown',
      objectives: quest.objectives || []
    },
    recentMemories: []
  });

  const outcome = consequenceResponse.data.output;

  if (outcome.narrativeText) {
    console.log('Narrative Outcome:');
    console.log('─────────────');
    console.log(outcome.narrativeText);
    console.log('\n');
  }

  if (outcome.npcInteractions && outcome.npcInteractions.length > 0) {
    console.log('NPC Reactions:');
    outcome.npcInteractions.forEach(npc => {
      console.log(`  ${npc.npc || npc.name}: ${npc.reaction || npc.dialogue || JSON.stringify(npc)}`);
    });
    console.log('\n');
  }

  if (outcome.worldStateChanges && outcome.worldStateChanges.length > 0) {
    console.log('World Changes:');
    outcome.worldStateChanges.forEach(change => {
      console.log(`  • ${change}`);
    });
    console.log('\n');
  }

  if (outcome.futurePlotHooks && outcome.futurePlotHooks.length > 0) {
    console.log('Future Plot Hooks:');
    outcome.futurePlotHooks.forEach(hook => {
      console.log(`  → ${hook}`);
    });
    console.log('\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         THE END... FOR NOW                      ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Summary stats
  const totalCost =
    (coordinatorResponse.data.output.metadata?.cost || 0) +
    (questResponse.data.metrics?.cost || 0) +
    (lorekeeperResponse.data.metrics?.cost || 0) +
    (consequenceResponse.data.output.metadata?.cost || 0);

  console.log(`Story Generation Stats:`);
  console.log(`  Total AI Cost: $${totalCost.toFixed(4)}`);
  console.log(`  Lorekeeper Score: ${validation.score}/100`);
  console.log(`  Story Coherence: ${validation.passed ? 'HIGH' : 'NEEDS WORK'}`);
}

generateStory().catch(err => {
  console.error('Story generation failed:', err.message);
  if (err.response?.data) {
    console.error('Details:', JSON.stringify(err.response.data, null, 2));
  }
});
