/**
 * Interactive DM Experience
 * Type prompts as a player and receive narrative responses from the AI DM
 */

const readline = require('readline');
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Session state
let character = {
  id: 999,
  name: 'Adventurer',
  class: 'Fighter',
  level: 1,
  str: 12,
  dex: 12,
  con: 12,
  int: 12,
  wis: 12,
  cha: 12
};

let currentQuest = null;
let narrativeHistory = [];
let qualities = {
  journey_begun: false,
  total_quests_completed: 0
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printDivider() {
  console.log('\n' + '─'.repeat(60) + '\n');
}

function printDM(text) {
  console.log('\x1b[33m[DM]\x1b[0m ' + text);
}

function printSystem(text) {
  console.log('\x1b[36m[System]\x1b[0m ' + text);
}

function printNarrative(text) {
  // Word wrap for better readability
  const words = text.split(' ');
  let line = '';
  const maxWidth = 70;

  console.log('\x1b[32m');
  for (const word of words) {
    if ((line + word).length > maxWidth) {
      console.log('  ' + line.trim());
      line = word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.trim()) {
    console.log('  ' + line.trim());
  }
  console.log('\x1b[0m');
}

async function setupCharacter() {
  return new Promise((resolve) => {
    console.log('\n🎲 DUNGEONS & DRAGONS - Interactive DM Experience 🎲');
    printDivider();

    rl.question('Enter your character name: ', (name) => {
      character.name = name || 'Adventurer';

      rl.question('Choose your class (Fighter/Mage/Rogue): ', (cls) => {
        const validClasses = ['Fighter', 'Mage', 'Rogue'];
        const chosenClass = validClasses.find(c =>
          c.toLowerCase() === (cls || '').toLowerCase()
        ) || 'Fighter';

        character.class = chosenClass;

        // Set stats based on class
        if (chosenClass === 'Fighter') {
          character.str = 16; character.con = 14; character.dex = 12;
        } else if (chosenClass === 'Mage') {
          character.int = 16; character.wis = 14; character.cha = 12;
        } else if (chosenClass === 'Rogue') {
          character.dex = 16; character.cha = 14; character.int = 12;
        }

        printDivider();
        printDM(`Welcome, ${character.name} the ${character.class}!`);
        printDM('You find yourself at the crossroads of destiny, where your choices will shape the world around you.');
        printDM('Your journey begins now...');
        printDivider();

        resolve();
      });
    });
  });
}

async function generateNarrativeResponse(playerAction) {
  try {
    // Use the Consequence Engine to generate narrative response
    const response = await axios.post(`${API_URL}/agent-lab/consequence-engine`, {
      character: character,
      quest: currentQuest || {
        id: 0,
        title: 'Free Exploration',
        description: 'Exploring the realm',
        questType: 'side',
        difficulty: 'easy'
      },
      completedObjective: {
        narrativeDescription: playerAction,
        mechanicalDescription: 'Player action',
        statReward: 'WIS',
        xpReward: 10
      }
    });

    return response.data.output;
  } catch (error) {
    // Fallback to a simpler narrative generation
    return generateFallbackNarrative(playerAction);
  }
}

function generateFallbackNarrative(playerAction) {
  const actionLower = playerAction.toLowerCase();

  // Simple keyword-based responses
  if (actionLower.includes('look') || actionLower.includes('examine')) {
    return {
      immediateOutcome: `You carefully observe your surroundings. The details come into focus as you take in the scene.`,
      worldStateChanges: ['gained_insight'],
      narrativeContinuation: `What catches your attention most?`
    };
  }

  if (actionLower.includes('attack') || actionLower.includes('fight')) {
    return {
      immediateOutcome: `Your ${character.class === 'Fighter' ? 'weapon gleams' : character.class === 'Mage' ? 'magic crackles' : 'blade whispers'} as you prepare for combat!`,
      worldStateChanges: ['entered_combat'],
      narrativeContinuation: `Roll for initiative! What's your strategy?`
    };
  }

  if (actionLower.includes('talk') || actionLower.includes('speak') || actionLower.includes('ask')) {
    return {
      immediateOutcome: `You step forward to engage in conversation, your words carrying the weight of your intentions.`,
      worldStateChanges: ['initiated_dialogue'],
      narrativeContinuation: `The listener's attention turns to you. What do you say?`
    };
  }

  if (actionLower.includes('rest') || actionLower.includes('sleep')) {
    return {
      immediateOutcome: `You find a moment of respite, allowing your body and mind to recover.`,
      worldStateChanges: ['rested'],
      narrativeContinuation: `As you rest, you reflect on your journey so far...`
    };
  }

  // Default response
  return {
    immediateOutcome: `${character.name} ${playerAction}. The world responds to your action.`,
    worldStateChanges: ['action_taken'],
    narrativeContinuation: `What do you do next?`
  };
}

async function requestNewQuest() {
  try {
    printSystem('Consulting the Story Coordinator...');

    const coordResponse = await axios.post(`${API_URL}/agent-lab/story-coordinator`, {
      character: character,
      activeQuestCount: currentQuest ? 1 : 0
    });

    const coord = coordResponse.data.output;

    if (coord.needsQuest) {
      printSystem('Generating a new quest...');

      const questResponse = await axios.post(`${API_URL}/agent-lab/quest-creator`, {
        character: character,
        questType: coord.questType,
        theme: coord.suggestedTheme,
        difficulty: coord.suggestedDifficulty
      });

      currentQuest = questResponse.data.output;

      printDivider();
      printDM(`📜 NEW QUEST: ${currentQuest.title}`);
      printNarrative(currentQuest.narrativeHook || currentQuest.description);

      if (currentQuest.objectives) {
        printDM('Objectives:');
        currentQuest.objectives.forEach((obj, i) => {
          console.log(`  ${i + 1}. ${obj.narrativeDescription || obj.description}`);
        });
      }
      printDivider();
    } else {
      printDM('No new quests available at this time. Continue your current adventure!');
    }
  } catch (error) {
    printSystem(`Quest generation unavailable: ${error.message}`);
    printDM('The threads of fate are tangled... perhaps try again later.');
  }
}

async function showStatus() {
  printDivider();
  printSystem(`Character: ${character.name} the ${character.class} (Level ${character.level})`);
  printSystem(`Stats: STR ${character.str} | DEX ${character.dex} | CON ${character.con} | INT ${character.int} | WIS ${character.wis} | CHA ${character.cha}`);

  if (currentQuest) {
    printSystem(`Current Quest: ${currentQuest.title}`);
  } else {
    printSystem('Current Quest: None');
  }

  printSystem(`Actions taken: ${narrativeHistory.length}`);
  printDivider();
}

function showHelp() {
  printDivider();
  console.log('🎮 COMMANDS:');
  console.log('  /quest     - Request a new quest from the DM');
  console.log('  /status    - View your character status');
  console.log('  /history   - View recent narrative history');
  console.log('  /clear     - Clear the screen');
  console.log('  /help      - Show this help message');
  console.log('  /quit      - End the session');
  console.log('');
  console.log('💡 GAMEPLAY:');
  console.log('  Just type what your character does! Examples:');
  console.log('  - "I look around the tavern"');
  console.log('  - "I approach the mysterious stranger"');
  console.log('  - "I draw my sword and prepare to fight"');
  console.log('  - "I examine the ancient runes on the wall"');
  printDivider();
}

function showHistory() {
  printDivider();
  printSystem('Recent Narrative History:');

  const recent = narrativeHistory.slice(-5);
  if (recent.length === 0) {
    console.log('  No history yet. Start your adventure!');
  } else {
    recent.forEach((entry, i) => {
      console.log(`\n  [${i + 1}] You: "${entry.action}"`);
      console.log(`      DM: ${entry.response.substring(0, 100)}...`);
    });
  }
  printDivider();
}

async function handlePlayerInput(input) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return;
  }

  // Handle commands
  if (trimmedInput.startsWith('/')) {
    const command = trimmedInput.toLowerCase();

    switch (command) {
      case '/quest':
        await requestNewQuest();
        break;
      case '/status':
        await showStatus();
        break;
      case '/history':
        showHistory();
        break;
      case '/clear':
        console.clear();
        printDM('Screen cleared. Your adventure continues...');
        break;
      case '/help':
        showHelp();
        break;
      case '/quit':
      case '/exit':
        printDM('Your journey pauses here, but the story never truly ends...');
        printSystem('Thanks for playing! Farewell, brave adventurer.');
        rl.close();
        process.exit(0);
        break;
      default:
        printSystem(`Unknown command: ${command}. Type /help for available commands.`);
    }
    return;
  }

  // Handle narrative input
  printSystem('The DM considers your action...');

  try {
    const response = await generateNarrativeResponse(trimmedInput);

    printDivider();
    printNarrative(response.immediateOutcome || response.narrative || 'The world shifts around you...');

    if (response.narrativeContinuation) {
      printDM(response.narrativeContinuation);
    }

    // Track history
    narrativeHistory.push({
      action: trimmedInput,
      response: response.immediateOutcome || response.narrative || '',
      timestamp: new Date().toISOString()
    });

    // Update qualities
    if (!qualities.journey_begun) {
      qualities.journey_begun = true;
      printSystem('🌟 Achievement: Journey Begun!');
    }

  } catch (error) {
    printSystem(`Error: ${error.message}`);
    printDM('The mystical energies waver... Please try again.');
  }
}

async function gameLoop() {
  const prompt = () => {
    rl.question('\n\x1b[35m[You]\x1b[0m ', async (input) => {
      await handlePlayerInput(input);
      prompt();
    });
  };

  prompt();
}

async function main() {
  try {
    // Check if server is running
    try {
      await axios.get(`${API_URL.replace('/api', '')}/health`);
      printSystem('Connected to game server');
    } catch {
      printSystem('⚠️  Game server not detected. Running in offline mode.');
      printSystem('Start the backend server for full AI DM experience.');
    }

    await setupCharacter();
    showHelp();

    printDM('The adventure awaits! What do you do?');
    printSystem('(Type your action or /help for commands)');

    await gameLoop();

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
rl.on('close', () => {
  console.log('\nSession ended.');
  process.exit(0);
});

main();
