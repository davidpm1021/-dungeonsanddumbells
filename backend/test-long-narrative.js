/**
 * Long-Form Narrative Simulation
 * Tests for narrative drift across 20+ story beats
 * Includes player agency via dialogue choices and open responses
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/agent-lab';

// Persistent character that evolves
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

// Story memory - tracks everything for consistency checking
const storyMemory = {
  npcsEncountered: [],
  locationsVisited: [],
  plotThreads: [],
  playerChoices: [],
  questsCompleted: [],
  worldStateChanges: [],
  characterDevelopment: [],
  relationships: {},
  totalCost: 0,
  round: 0
};

// Player response simulator - varied responses to test system
const playerResponses = [
  { type: 'cautious', response: 'I approach carefully, checking for traps and hidden threats.' },
  { type: 'aggressive', response: 'I confront them directly, demanding answers.' },
  { type: 'diplomatic', response: 'I try to negotiate and find common ground.' },
  { type: 'investigative', response: 'I search for more clues before making my move.' },
  { type: 'deceptive', response: 'I use a disguise and false story to infiltrate.' },
  { type: 'compassionate', response: 'I offer to help, even though it might cost me.' },
  { type: 'opportunistic', response: 'I look for ways to profit from this situation.' },
  { type: 'loyal', response: 'I stand by my allies, regardless of the risk.' },
  { type: 'questioning', response: 'Wait, what about the evidence we found earlier? Doesn\'t that change things?' },
  { type: 'creative', response: 'What if we approached this from a different angle entirely?' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate a dialogue choice based on context
function generateDialogueChoices(context) {
  const choices = [];

  if (context.includes('danger') || context.includes('threat')) {
    choices.push('Fight: Stand your ground and face the threat');
    choices.push('Flight: Retreat and regroup');
    choices.push('Negotiate: Try to talk your way out');
  } else if (context.includes('information') || context.includes('clue')) {
    choices.push('Investigate further: Dig deeper into this lead');
    choices.push('Share with allies: Bring others into your confidence');
    choices.push('Keep secret: This information is too valuable to share');
  } else if (context.includes('npc') || context.includes('meet')) {
    choices.push('Trust: Open up to this person');
    choices.push('Suspicious: Keep your guard up');
    choices.push('Manipulate: Use them for your own ends');
  } else {
    choices.push('Take action: Move forward decisively');
    choices.push('Wait and observe: Patience might reveal more');
    choices.push('Seek help: Find someone with more knowledge');
  }

  return choices;
}

// Main story generation round
async function generateStoryRound(roundNum, previousEvents) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ROUND ${roundNum}: ${getChapterTitle(roundNum)}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Step 1: Get story coordinator's assessment
  const coordResponse = await axios.post(`${API_URL}/story-coordinator`, {
    character: {
      ...character,
      level: Math.floor(4 + roundNum / 5), // Level up every 5 rounds
      completedQuests: roundNum - 1
    },
    activeQuestCount: roundNum % 3 === 0 ? 0 : 1 // Sometimes no active quest
  });

  const decision = coordResponse.data.output;
  storyMemory.totalCost += decision.metadata?.cost || 0;

  console.log(`[Story Coordinator thinks: ${decision.reasoning?.substring(0, 200)}...]\n`);

  // Step 2: Generate quest/scene
  const questResponse = await axios.post(`${API_URL}/quest-creator`, {
    character: {
      ...character,
      level: Math.floor(4 + roundNum / 5)
    },
    decision: {
      questType: decision.questType,
      suggestedTheme: decision.suggestedTheme,
      suggestedDifficulty: decision.suggestedDifficulty
    }
  });

  const quest = questResponse.data.output;
  storyMemory.totalCost += questResponse.data.metrics?.cost || 0;

  // Display the narrative
  console.log(`📖 ${quest.title || 'Unnamed Scene'}\n`);
  console.log(quest.openingScene || quest.description || 'The story continues...');
  console.log();

  // Track NPCs
  if (quest.npcInvolved || quest.npcDialogue?.npcName) {
    const npcName = quest.npcInvolved || quest.npcDialogue?.npcName;
    if (!storyMemory.npcsEncountered.includes(npcName)) {
      storyMemory.npcsEncountered.push(npcName);
      storyMemory.relationships[npcName] = 'neutral';
    }
    console.log(`💬 ${npcName} speaks:`);
    const dialogue = quest.npcDialogue?.opening || quest.npcDialogue || 'Greetings, traveler...';
    console.log(`"${typeof dialogue === 'string' ? dialogue : JSON.stringify(dialogue)}"\n`);
  }

  // Step 3: Present player choices
  console.log('─── YOUR CHOICES ───');
  const choices = generateDialogueChoices(quest.description || quest.openingScene || '');
  choices.forEach((choice, i) => {
    console.log(`  ${i + 1}. ${choice}`);
  });
  console.log(`  4. [Custom response...]\n`);

  // Simulate player choice
  const choiceIndex = roundNum % 4; // Rotate through choices
  let playerChoice;

  if (choiceIndex < 3) {
    playerChoice = choices[choiceIndex];
    console.log(`>>> Lyra chooses: "${playerChoice}"\n`);
  } else {
    // Open-ended response
    const responseType = playerResponses[roundNum % playerResponses.length];
    playerChoice = responseType.response;
    console.log(`>>> Lyra responds: "${playerChoice}"\n`);
  }

  storyMemory.playerChoices.push({
    round: roundNum,
    quest: quest.title,
    choice: playerChoice
  });

  // Step 4: Generate consequences based on choice
  const consequenceResponse = await axios.post(`${API_URL}/consequence-engine`, {
    character: {
      ...character,
      level: Math.floor(4 + roundNum / 5)
    },
    quest: {
      title: quest.title,
      description: quest.description,
      questType: quest.questType || decision.questType,
      npcInvolved: quest.npcInvolved || quest.npcDialogue?.npcName || 'Unknown',
      objectives: quest.objectives || [],
      playerChoice: playerChoice
    },
    recentMemories: previousEvents.slice(-5) // Last 5 events for context
  });

  const outcome = consequenceResponse.data.output;
  storyMemory.totalCost += outcome.metadata?.cost || 0;

  // Display outcome
  console.log('─── CONSEQUENCES ───');
  if (outcome.narrativeText) {
    console.log(outcome.narrativeText);
    console.log();
  }

  // Track NPC relationships
  if (outcome.npcInteractions) {
    outcome.npcInteractions.forEach(interaction => {
      const npcName = interaction.npc || interaction.name;
      if (npcName) {
        const change = interaction.relationshipChange || 'neutral';
        storyMemory.relationships[npcName] = change;
        console.log(`  [${npcName}: Relationship ${change}]`);
      }
    });
  }

  // Track world changes
  if (outcome.worldStateChanges && outcome.worldStateChanges.length > 0) {
    console.log('\n  World State Changes:');
    outcome.worldStateChanges.forEach(change => {
      const changeStr = typeof change === 'string' ? change : change.description || JSON.stringify(change);
      console.log(`    • ${changeStr}`);
      storyMemory.worldStateChanges.push({
        round: roundNum,
        change: changeStr
      });
    });
  }

  // Track plot hooks
  if (outcome.futurePlotHooks && outcome.futurePlotHooks.length > 0) {
    console.log('\n  Plot Threads:');
    outcome.futurePlotHooks.forEach(hook => {
      console.log(`    → ${hook}`);
      storyMemory.plotThreads.push({
        round: roundNum,
        hook: hook
      });
    });
  }

  // Step 5: Validate consistency with Lorekeeper
  const lorekeeperResponse = await axios.post(`${API_URL}/lorekeeper`, {
    character,
    quest: {
      title: quest.title,
      description: quest.description + ' ' + (outcome.narrativeText || ''),
      questType: quest.questType || decision.questType,
      difficulty: quest.difficulty || decision.suggestedDifficulty,
      npcInvolved: quest.npcInvolved || quest.npcDialogue?.npcName || 'Unknown'
    }
  });

  const validation = lorekeeperResponse.data.output;
  storyMemory.totalCost += lorekeeperResponse.data.metrics?.cost || 0;

  console.log(`\n  [Lorekeeper Score: ${validation.score}/100${validation.passed ? ' ✓' : ' ⚠️'}]`);

  if (validation.score < 75) {
    console.log(`  ⚠️ POTENTIAL NARRATIVE DRIFT DETECTED`);
    if (validation.violations && validation.violations.length > 0) {
      console.log(`  Issues: ${validation.violations.slice(0, 2).join(', ')}`);
    }
  }

  // Store this event for memory
  const eventSummary = {
    round: roundNum,
    title: quest.title,
    theme: decision.suggestedTheme,
    playerChoice: playerChoice,
    npc: quest.npcInvolved || quest.npcDialogue?.npcName,
    outcome: outcome.narrativeText?.substring(0, 200),
    lorekeeperScore: validation.score,
    timestamp: new Date().toISOString()
  };

  storyMemory.questsCompleted.push(eventSummary);

  return eventSummary;
}

function getChapterTitle(round) {
  const titles = [
    'The Beginning',
    'First Blood',
    'Shadows Deepen',
    'A New Ally',
    'The Plot Thickens',
    'Betrayal',
    'Into the Darkness',
    'The Cost of Truth',
    'Rising Stakes',
    'Point of No Return',
    'The Hidden Enemy',
    'Desperate Measures',
    'Allies Unite',
    'The Great Deception',
    'Pieces Fall Into Place',
    'The Calm Before',
    'Storm Approaches',
    'Final Preparations',
    'The Confrontation',
    'Resolution',
    'New Horizons',
    'Loose Ends',
    'The Price Paid',
    'Echoes of the Past',
    'Future Uncertain'
  ];
  return titles[round - 1] || `Chapter ${round}`;
}

async function runFullSimulation() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           NARRATIVE DRIFT TEST: 20-ROUND STORY SIMULATION          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nProtagonist: ${character.name}, ${character.class}`);
  console.log('Testing for: Narrative coherence, NPC consistency, plot thread tracking\n');

  const events = [];
  const TOTAL_ROUNDS = 20;

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    try {
      const event = await generateStoryRound(round, events);
      events.push(event);

      // Brief pause to avoid rate limiting
      await sleep(2000);

      // Progress indicator
      console.log(`\n[${'█'.repeat(round)}${'░'.repeat(TOTAL_ROUNDS - round)}] Round ${round}/${TOTAL_ROUNDS} complete`);
    } catch (error) {
      console.error(`\n❌ Round ${round} failed: ${error.message}`);
      if (error.response?.data) {
        console.error('Details:', JSON.stringify(error.response.data, null, 2));
      }
      // Continue with next round
      continue;
    }
  }

  // Final analysis
  console.log('\n\n' + '═'.repeat(70));
  console.log('                      NARRATIVE DRIFT ANALYSIS');
  console.log('═'.repeat(70) + '\n');

  console.log('📊 STORY STATISTICS:');
  console.log(`  Total Rounds: ${events.length}`);
  console.log(`  Total Cost: $${storyMemory.totalCost.toFixed(4)}`);
  console.log(`  Cost per Round: $${(storyMemory.totalCost / events.length).toFixed(4)}`);
  console.log(`  Projected Cost per User/Day (20 interactions): $${(storyMemory.totalCost).toFixed(4)}\n`);

  console.log('👥 NPCs ENCOUNTERED:');
  storyMemory.npcsEncountered.forEach(npc => {
    console.log(`  • ${npc} (${storyMemory.relationships[npc] || 'unknown'})`);
  });
  console.log(`  Total: ${storyMemory.npcsEncountered.length} unique NPCs\n`);

  console.log('🌍 WORLD STATE CHANGES:');
  const recentChanges = storyMemory.worldStateChanges.slice(-10);
  recentChanges.forEach(change => {
    console.log(`  [Round ${change.round}] ${change.change.substring(0, 80)}...`);
  });
  console.log(`  Total: ${storyMemory.worldStateChanges.length} changes\n`);

  console.log('🔗 ACTIVE PLOT THREADS:');
  const recentThreads = storyMemory.plotThreads.slice(-10);
  recentThreads.forEach(thread => {
    console.log(`  [Round ${thread.round}] ${thread.hook}`);
  });
  console.log(`  Total: ${storyMemory.plotThreads.length} threads\n`);

  console.log('📈 CONSISTENCY SCORES:');
  const scores = events.map(e => e.lorekeeperScore);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const drifts = scores.filter(s => s < 75).length;

  console.log(`  Average: ${avgScore.toFixed(1)}/100`);
  console.log(`  Min: ${minScore}/100`);
  console.log(`  Max: ${maxScore}/100`);
  console.log(`  Drift Warnings: ${drifts}/${events.length} rounds\n`);

  console.log('🎭 PLAYER CHOICE VARIETY:');
  const choiceTypes = {};
  storyMemory.playerChoices.forEach(c => {
    const type = c.choice.substring(0, 30);
    choiceTypes[type] = (choiceTypes[type] || 0) + 1;
  });
  Object.entries(choiceTypes).forEach(([choice, count]) => {
    console.log(`  "${choice}..." (${count}x)`);
  });

  // Drift analysis
  console.log('\n' + '═'.repeat(70));
  console.log('                         DRIFT ASSESSMENT');
  console.log('═'.repeat(70) + '\n');

  if (avgScore >= 85 && drifts === 0) {
    console.log('✅ EXCELLENT: No narrative drift detected. Story maintains strong coherence.');
  } else if (avgScore >= 75 && drifts <= 2) {
    console.log('✅ GOOD: Minor inconsistencies but story remains coherent.');
  } else if (avgScore >= 65 && drifts <= 5) {
    console.log('⚠️ MODERATE: Some drift detected. Memory systems need strengthening.');
  } else {
    console.log('❌ SIGNIFICANT DRIFT: Story coherence breaking down. Systems need revision.');
  }

  // Check for specific drift patterns
  console.log('\nDrift Patterns to Watch:');

  // Check NPC consistency
  if (storyMemory.npcsEncountered.length > 15) {
    console.log('  ⚠️ High NPC count - potential for character confusion');
  } else {
    console.log('  ✓ NPC count manageable');
  }

  // Check plot thread accumulation
  if (storyMemory.plotThreads.length > 30) {
    console.log('  ⚠️ Many unresolved plot threads - narrative may feel scattered');
  } else {
    console.log('  ✓ Plot thread count reasonable');
  }

  // Check theme variety
  const themes = events.map(e => e.theme);
  const uniqueThemes = [...new Set(themes)];
  if (uniqueThemes.length < 5) {
    console.log('  ⚠️ Low theme variety - story may feel repetitive');
  } else {
    console.log(`  ✓ Good theme variety (${uniqueThemes.length} unique themes)`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('                         SIMULATION COMPLETE');
  console.log('═'.repeat(70));
}

runFullSimulation().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
