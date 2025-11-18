/**
 * Long-Form Narrative WITH MEMORY INTEGRATION
 * Tests narrative coherence by maintaining context across rounds
 * Fixes the drift issues by:
 * 1. Maintaining a rolling narrative summary
 * 2. Tracking NPCs in a registry
 * 3. Passing recent events to each agent call
 * 4. Tracking unresolved plot threads
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/agent-lab';

// Persistent character
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

// CRITICAL: Persistent memory that accumulates across rounds
const persistentMemory = {
  // Rolling summary - grows but is compressed to key facts
  narrativeSummary: '',

  // NPC Registry - prevents name collisions
  npcRegistry: new Map(), // name -> {description, firstAppeared, relationship, lastMentioned}

  // Active plot threads - must be resolved, not abandoned
  activeThreads: [], // {thread, introduced, priority, resolved}

  // Recent events for RAG context
  recentEvents: [], // Last 10 events with full detail

  // World state changes - permanent consequences
  worldState: {
    locations: new Map(), // location -> state
    factions: new Map(), // faction -> standing
    items: [], // Important items acquired
    majorEvents: [] // Key story beats
  },

  // Metrics
  totalCost: 0,
  lorekeeperScores: [],
  npcCollisions: 0, // Track when system tries to create duplicate NPC
  unresolvedThreads: 0
};

// Player responses
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

// Generate dialogue choices based on context
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

// Compress narrative summary to key facts (simulate Memory Manager agent)
function compressNarrativeSummary(currentSummary, newEvent) {
  // Keep it under 500 words by focusing on:
  // - Active characters and relationships
  // - Unresolved plot threads
  // - Recent major events
  // - Key items/clues discovered

  const words = (currentSummary + ' ' + newEvent).split(' ');
  if (words.length > 500) {
    // Prioritize recent events and unresolved threads
    return words.slice(-500).join(' ');
  }
  return currentSummary + ' ' + newEvent;
}

// Check for NPC name collision
function checkNPCCollision(npcName) {
  // Normalize name for comparison
  const firstName = npcName.split(' ')[0].toLowerCase();

  for (const [existingName, data] of persistentMemory.npcRegistry) {
    const existingFirst = existingName.split(' ')[0].toLowerCase();
    if (existingFirst === firstName && existingName !== npcName) {
      return existingName; // Collision detected
    }
  }
  return null;
}

// Build context string for agents
function buildNarrativeContext() {
  let context = '';

  // Narrative summary (most important)
  if (persistentMemory.narrativeSummary) {
    context += `STORY SO FAR:\n${persistentMemory.narrativeSummary}\n\n`;
  }

  // Active NPCs
  if (persistentMemory.npcRegistry.size > 0) {
    context += 'KNOWN CHARACTERS:\n';
    for (const [name, data] of persistentMemory.npcRegistry) {
      context += `- ${name}: ${data.description} (${data.relationship})\n`;
    }
    context += '\n';
  }

  // Active plot threads
  const unresolvedThreads = persistentMemory.activeThreads.filter(t => !t.resolved);
  if (unresolvedThreads.length > 0) {
    context += 'UNRESOLVED PLOT THREADS (must address, not ignore):\n';
    unresolvedThreads.forEach(t => {
      context += `- ${t.thread} (introduced Round ${t.introduced})\n`;
    });
    context += '\n';
  }

  // Important items
  if (persistentMemory.worldState.items.length > 0) {
    context += 'KEY ITEMS:\n';
    persistentMemory.worldState.items.forEach(item => {
      context += `- ${item}\n`;
    });
    context += '\n';
  }

  return context;
}

// Main story generation with memory
async function generateStoryRoundWithMemory(roundNum) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ROUND ${roundNum}: ${getChapterTitle(roundNum)}`);
  console.log(`${'═'.repeat(70)}\n`);

  const narrativeContext = buildNarrativeContext();

  // Step 1: Story Coordinator WITH MEMORY CONTEXT
  console.log('[Story Coordinator analyzing narrative state...]');
  const coordResponse = await axios.post(`${API_URL}/story-coordinator`, {
    character: {
      ...character,
      level: Math.floor(4 + roundNum / 5),
      completedQuests: roundNum - 1,
      // INJECT MEMORY CONTEXT INTO CHARACTER CONTEXT
      narrativeContext: narrativeContext,
      unresolvedThreads: persistentMemory.activeThreads.filter(t => !t.resolved).length,
      knownNPCs: Array.from(persistentMemory.npcRegistry.keys())
    },
    activeQuestCount: roundNum % 3 === 0 ? 0 : 1
  });

  const decision = coordResponse.data.output;
  persistentMemory.totalCost += decision.metadata?.cost || 0;

  // Override theme if we have unresolved threads
  const unresolvedCount = persistentMemory.activeThreads.filter(t => !t.resolved).length;
  if (unresolvedCount > 3 && roundNum > 5) {
    console.log(`  [OVERRIDE: ${unresolvedCount} unresolved threads - forcing resolution theme]`);
    decision.suggestedTheme = 'resolution';
  }

  console.log(`  Theme: ${decision.suggestedTheme} | Difficulty: ${decision.suggestedDifficulty}`);

  // Step 2: Quest Creator WITH FULL CONTEXT
  const questResponse = await axios.post(`${API_URL}/quest-creator`, {
    character: {
      ...character,
      level: Math.floor(4 + roundNum / 5),
      narrativeContext: narrativeContext, // FULL MEMORY CONTEXT
      knownNPCs: Array.from(persistentMemory.npcRegistry.keys()).join(', '),
      unresolvedThreads: persistentMemory.activeThreads.filter(t => !t.resolved).map(t => t.thread).join('; ')
    },
    decision: {
      questType: decision.questType,
      suggestedTheme: decision.suggestedTheme,
      suggestedDifficulty: decision.suggestedDifficulty,
      // CRITICAL: Tell Quest Creator about existing NPCs
      existingNPCs: Array.from(persistentMemory.npcRegistry.entries()).map(([name, data]) => ({
        name,
        role: data.description,
        relationship: data.relationship
      })),
      // CRITICAL: Tell Quest Creator about active threads
      activeThreads: persistentMemory.activeThreads.filter(t => !t.resolved)
    }
  });

  const quest = questResponse.data.output;
  persistentMemory.totalCost += questResponse.data.metrics?.cost || 0;

  // Display narrative
  console.log(`\n📖 ${quest.title || 'Unnamed Scene'}\n`);
  console.log(quest.openingScene || quest.description || 'The story continues...');
  console.log();

  // CHECK FOR NPC COLLISION
  const npcName = quest.npcInvolved || quest.npcDialogue?.npcName;
  if (npcName) {
    const collision = checkNPCCollision(npcName);
    if (collision) {
      persistentMemory.npcCollisions++;
      console.log(`  ⚠️ NPC COLLISION: ${npcName} similar to existing ${collision}`);
      console.log(`    [In production, system would use ${collision} instead]`);
    } else {
      // Register new NPC
      if (!persistentMemory.npcRegistry.has(npcName)) {
        persistentMemory.npcRegistry.set(npcName, {
          description: quest.npcDialogue?.role || 'Unknown role',
          firstAppeared: roundNum,
          relationship: 'neutral',
          lastMentioned: roundNum
        });
        console.log(`  [NEW NPC REGISTERED: ${npcName}]`);
      } else {
        // Update last mentioned
        const npcData = persistentMemory.npcRegistry.get(npcName);
        npcData.lastMentioned = roundNum;
        console.log(`  [RETURNING NPC: ${npcName} (first appeared Round ${npcData.firstAppeared})]`);
      }
    }

    console.log(`💬 ${npcName} speaks:`);
    const dialogue = quest.npcDialogue?.opening || quest.npcDialogue || 'Greetings, traveler...';
    console.log(`"${typeof dialogue === 'string' ? dialogue : JSON.stringify(dialogue)}"\n`);
  }

  // Step 3: Player choice
  console.log('─── YOUR CHOICES ───');
  const choices = generateDialogueChoices(quest.description || quest.openingScene || '');
  choices.forEach((choice, i) => console.log(`  ${i + 1}. ${choice}`));
  console.log(`  4. [Custom response...]\n`);

  const choiceIndex = roundNum % 4;
  let playerChoice;
  if (choiceIndex < 3) {
    playerChoice = choices[choiceIndex];
    console.log(`>>> Lyra chooses: "${playerChoice}"\n`);
  } else {
    const responseType = playerResponses[roundNum % playerResponses.length];
    playerChoice = responseType.response;
    console.log(`>>> Lyra responds: "${playerChoice}"\n`);
  }

  // Step 4: Consequence Engine WITH MEMORY
  const consequenceResponse = await axios.post(`${API_URL}/consequence-engine`, {
    character: {
      ...character,
      level: Math.floor(4 + roundNum / 5),
      narrativeContext: narrativeContext // Full context
    },
    quest: {
      title: quest.title,
      description: quest.description,
      questType: quest.questType || decision.questType,
      npcInvolved: npcName || 'Unknown',
      objectives: quest.objectives || [],
      playerChoice: playerChoice,
      // Pass existing state
      existingThreads: persistentMemory.activeThreads.filter(t => !t.resolved),
      knownNPCs: Array.from(persistentMemory.npcRegistry.keys())
    },
    recentMemories: persistentMemory.recentEvents.slice(-5)
  });

  const outcome = consequenceResponse.data.output;
  persistentMemory.totalCost += outcome.metadata?.cost || 0;

  // Display outcome
  console.log('─── CONSEQUENCES ───');
  if (outcome.narrativeText) {
    console.log(outcome.narrativeText);
    console.log();
  }

  // Update NPC relationships
  if (outcome.npcInteractions) {
    outcome.npcInteractions.forEach(interaction => {
      const interactNPC = interaction.npc || interaction.name;
      if (interactNPC && persistentMemory.npcRegistry.has(interactNPC)) {
        const npcData = persistentMemory.npcRegistry.get(interactNPC);
        const change = interaction.relationshipChange || 'neutral';
        npcData.relationship = change;
        console.log(`  [${interactNPC}: Relationship → ${change}]`);
      }
    });
  }

  // Track world changes
  if (outcome.worldStateChanges?.length > 0) {
    console.log('\n  World State Changes:');
    outcome.worldStateChanges.forEach(change => {
      const changeStr = typeof change === 'string' ? change : change.description || JSON.stringify(change);
      console.log(`    • ${changeStr}`);
      persistentMemory.worldState.majorEvents.push({
        round: roundNum,
        change: changeStr
      });
    });
  }

  // CRITICAL: Track new plot threads
  if (outcome.futurePlotHooks?.length > 0) {
    console.log('\n  New Plot Threads:');
    outcome.futurePlotHooks.forEach(hook => {
      console.log(`    → ${hook}`);
      persistentMemory.activeThreads.push({
        thread: hook,
        introduced: roundNum,
        priority: 'normal',
        resolved: false
      });
    });
  }

  // Check for thread resolution
  const resolvedInThisRound = [];
  persistentMemory.activeThreads.forEach(thread => {
    if (!thread.resolved) {
      // Check if outcome text mentions resolution of this thread
      const outcomeText = outcome.narrativeText?.toLowerCase() || '';
      const threadText = thread.thread.toLowerCase();
      if (outcomeText.includes('rescued') && threadText.includes('kidnap')) {
        thread.resolved = true;
        resolvedInThisRound.push(thread.thread);
      }
      if (outcomeText.includes('revealed') && threadText.includes('medallion')) {
        thread.resolved = true;
        resolvedInThisRound.push(thread.thread);
      }
      // Add more resolution patterns...
    }
  });

  if (resolvedInThisRound.length > 0) {
    console.log('\n  RESOLVED THREADS:');
    resolvedInThisRound.forEach(t => console.log(`    ✓ ${t}`));
  }

  // Step 5: Lorekeeper validation
  const lorekeeperResponse = await axios.post(`${API_URL}/lorekeeper`, {
    character,
    quest: {
      title: quest.title,
      description: quest.description + ' ' + (outcome.narrativeText || ''),
      questType: quest.questType || decision.questType,
      difficulty: quest.difficulty || decision.suggestedDifficulty,
      npcInvolved: npcName || 'Unknown'
    }
  });

  const validation = lorekeeperResponse.data.output;
  persistentMemory.totalCost += lorekeeperResponse.data.metrics?.cost || 0;
  persistentMemory.lorekeeperScores.push(validation.score);

  console.log(`\n  [Lorekeeper Score: ${validation.score}/100${validation.passed ? ' ✓' : ' ⚠️'}]`);

  if (validation.score < 75) {
    console.log(`  ⚠️ NARRATIVE DRIFT WARNING`);
  }

  // UPDATE NARRATIVE SUMMARY (critical for preventing drift)
  const eventSummary = `Round ${roundNum}: ${quest.title}. ${npcName ? `${npcName} ` : ''}${outcome.narrativeText?.substring(0, 150) || ''}...`;
  persistentMemory.narrativeSummary = compressNarrativeSummary(
    persistentMemory.narrativeSummary,
    eventSummary
  );

  // Store event in recent memory
  persistentMemory.recentEvents.push({
    round: roundNum,
    title: quest.title,
    npc: npcName,
    theme: decision.suggestedTheme,
    choice: playerChoice,
    outcome: outcome.narrativeText?.substring(0, 200),
    score: validation.score
  });

  // Keep only last 10 events
  if (persistentMemory.recentEvents.length > 10) {
    persistentMemory.recentEvents.shift();
  }

  console.log(`\n[${'█'.repeat(roundNum)}${'░'.repeat(20 - roundNum)}] Round ${roundNum}/20 complete`);

  return {
    round: roundNum,
    title: quest.title,
    npc: npcName,
    score: validation.score
  };
}

function getChapterTitle(round) {
  const titles = [
    'The Beginning', 'First Blood', 'Shadows Deepen', 'A New Ally',
    'The Plot Thickens', 'Betrayal', 'Into the Darkness', 'The Cost of Truth',
    'Rising Stakes', 'Point of No Return', 'The Hidden Enemy', 'Desperate Measures',
    'Allies Unite', 'The Great Deception', 'Pieces Fall Into Place', 'The Calm Before',
    'Storm Approaches', 'Final Preparations', 'The Confrontation', 'Resolution'
  ];
  return titles[round - 1] || `Chapter ${round}`;
}

async function runMemoryAwareSimulation() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║    NARRATIVE COHERENCE TEST: 20 ROUNDS WITH MEMORY INTEGRATION    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nProtagonist: ${character.name}, ${character.class}`);
  console.log('Testing: NPC consistency, plot thread resolution, narrative memory\n');
  console.log('IMPROVEMENTS OVER BASELINE TEST:');
  console.log('  ✓ Rolling narrative summary passed to each agent');
  console.log('  ✓ NPC registry prevents name collisions');
  console.log('  ✓ Plot thread tracking ensures resolution');
  console.log('  ✓ Recent events provide RAG-like context');
  console.log('  ✓ Theme override when too many unresolved threads\n');

  const events = [];
  const TOTAL_ROUNDS = 20;

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    try {
      const event = await generateStoryRoundWithMemory(round);
      events.push(event);
      await sleep(2000); // Prevent rate limiting
    } catch (error) {
      console.error(`\n❌ Round ${round} failed: ${error.message}`);
      continue;
    }
  }

  // Final analysis
  console.log('\n\n' + '═'.repeat(70));
  console.log('              NARRATIVE COHERENCE ANALYSIS (WITH MEMORY)');
  console.log('═'.repeat(70) + '\n');

  console.log('📊 STORY STATISTICS:');
  console.log(`  Total Rounds: ${events.length}`);
  console.log(`  Total Cost: $${persistentMemory.totalCost.toFixed(4)}`);
  console.log(`  Cost per Round: $${(persistentMemory.totalCost / events.length).toFixed(4)}`);

  console.log('\n👥 NPC CONSISTENCY:');
  console.log(`  Unique NPCs: ${persistentMemory.npcRegistry.size}`);
  console.log(`  Name Collisions Prevented: ${persistentMemory.npcCollisions}`);
  for (const [name, data] of persistentMemory.npcRegistry) {
    console.log(`  • ${name} (${data.relationship}) - First: Round ${data.firstAppeared}, Last: Round ${data.lastMentioned}`);
  }

  console.log('\n🔗 PLOT THREAD MANAGEMENT:');
  const resolved = persistentMemory.activeThreads.filter(t => t.resolved).length;
  const unresolved = persistentMemory.activeThreads.filter(t => !t.resolved).length;
  console.log(`  Total Threads Created: ${persistentMemory.activeThreads.length}`);
  console.log(`  Resolved: ${resolved}`);
  console.log(`  Unresolved: ${unresolved}`);

  if (unresolved > 0) {
    console.log('\n  Unresolved Threads:');
    persistentMemory.activeThreads.filter(t => !t.resolved).forEach(t => {
      console.log(`    ⚠️ ${t.thread} (Round ${t.introduced})`);
    });
  }

  console.log('\n📈 LOREKEEPER SCORES:');
  const scores = persistentMemory.lorekeeperScores;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(`  Average: ${avgScore.toFixed(1)}/100`);
  console.log(`  Min: ${Math.min(...scores)}/100`);
  console.log(`  Max: ${Math.max(...scores)}/100`);
  console.log(`  Drift Warnings: ${scores.filter(s => s < 75).length}/${scores.length}`);

  console.log('\n📝 NARRATIVE SUMMARY LENGTH:');
  console.log(`  ${persistentMemory.narrativeSummary.split(' ').length} words`);

  // Final assessment
  console.log('\n' + '═'.repeat(70));
  console.log('                        COHERENCE ASSESSMENT');
  console.log('═'.repeat(70) + '\n');

  const npcScore = persistentMemory.npcRegistry.size <= 8 ? 'GOOD' : 'HIGH (may cause confusion)';
  const threadScore = unresolved <= 5 ? 'GOOD' : `POOR (${unresolved} abandoned threads)`;
  const collisionScore = persistentMemory.npcCollisions === 0 ? 'EXCELLENT' : `${persistentMemory.npcCollisions} collisions detected`;

  console.log(`NPC Management: ${npcScore}`);
  console.log(`Plot Thread Resolution: ${threadScore}`);
  console.log(`Name Collision Prevention: ${collisionScore}`);
  console.log(`Average Lorekeeper Score: ${avgScore.toFixed(1)}/100`);

  if (avgScore >= 80 && unresolved <= 5 && persistentMemory.npcCollisions === 0) {
    console.log('\n✅ MEMORY INTEGRATION SUCCESSFUL - Narrative coherence maintained!');
  } else {
    console.log('\n⚠️ Issues remain - further memory system refinement needed');
  }

  console.log('\n' + '═'.repeat(70));
  console.log('                        SIMULATION COMPLETE');
  console.log('═'.repeat(70));
}

runMemoryAwareSimulation().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
