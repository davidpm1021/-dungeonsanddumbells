import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import CombatUI from '../components/CombatUI';

export default function DungeonMaster() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [character, setCharacter] = useState({
    name: 'Adventurer',
    class: 'Fighter',
    level: 1,
    str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12
  });
  const [setupStep, setSetupStep] = useState('world'); // 'world', 'character', 'ready'
  const [setupName, setSetupName] = useState('');
  const [setupClass, setSetupClass] = useState('Fighter');
  const [worldContext, setWorldContext] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [customWorld, setCustomWorld] = useState('');
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  // Combat state
  const [combat, setCombat] = useState(null);
  const [combatConditions, setCombatConditions] = useState([]);

  const GENRE_PRESETS = {
    dark_fantasy: {
      name: 'Dark Fantasy',
      icon: '🌑',
      description: 'Grim world of cursed lands and forgotten magic',
      sample: 'The kingdom of Blackmoor has fallen to shadow. Ancient evils stir in the ruins of once-great cities, and the few survivors huddle in fortified towns. You are among the last who dare to venture into the darkness, seeking treasure, glory, or perhaps redemption.'
    },
    heroic_fantasy: {
      name: 'Heroic Fantasy',
      icon: '⚔️',
      description: 'Classic adventure with noble quests and legendary heroes',
      sample: 'The Five Kingdoms stand united against the rising threat of the Orcish Horde. King Aldric has sent out a call for adventurers brave enough to defend the realm. You have answered that call, joining the ranks of heroes who will write their names into legend.'
    },
    eastern_mysticism: {
      name: 'Wuxia Adventure',
      icon: '🏯',
      description: 'Martial arts, ancient secrets, and clan warfare',
      sample: 'The Jade Empire is in turmoil. The great martial sects vie for control of the legendary Dragon Scroll, said to grant its bearer unimaginable power. You are a wandering warrior, caught between rival clans, seeking your own path through a world of honor and betrayal.'
    },
    steampunk: {
      name: 'Steampunk',
      icon: '⚙️',
      description: 'Victorian-era technology and clockwork magic',
      sample: 'The city of New Ironhaven runs on steam and gears. Airships patrol the skies while automatons walk the cobblestone streets. You are an inventor, a rogue, or perhaps a detective—drawn into a conspiracy that threatens to bring the entire mechanical city crashing down.'
    },
    cosmic_horror: {
      name: 'Cosmic Horror',
      icon: '👁️',
      description: 'Lovecraftian mystery and eldritch terrors',
      sample: 'Something is wrong in the coastal town of Innsmouth. Fishermen speak of strange lights beneath the waves, and the old families guard secrets that predate humanity itself. You have come seeking answers, but what you find may shatter your understanding of reality.'
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  
  // Check for active combat
  const checkActiveCombat = async () => {
    if (!character.id) return;
    try {
      const response = await api.get(`/dm/combat/active?characterId=${character.id}`);
      if (response.data) {
        setCombat(response.data);
        if (response.data.activeConditions) {
          setCombatConditions(response.data.activeConditions);
        }
      } else {
        setCombat(null);
        setCombatConditions([]);
      }
    } catch (error) {
      // No active combat
      setCombat(null);
    }
  };

  // Check for combat periodically when adventure is active
  useEffect(() => {
    if (setupStep === 'ready' && character.id) {
      checkActiveCombat();
      const interval = setInterval(checkActiveCombat, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [setupStep, character.id]);

  const addMessage = (type, content, metadata = {}) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    }]);
  };

  const handleWorldSetup = () => {
    const world = customWorld.trim() || (selectedGenre ? GENRE_PRESETS[selectedGenre].sample : '');
    if (!world) {
      return; // Need world context
    }
    setWorldContext(world);
    setSetupStep('character');
  };

  const handleGenerateWorld = async () => {
    if (!selectedGenre) return;

    setIsGeneratingWorld(true);
    try {
      const response = await api.post('/agent-lab/world-generator', {
        genre: selectedGenre,
        characterClass: 'Fighter' // Default for now
      });

      if (response.data.output?.worldDescription) {
        setCustomWorld(response.data.output.worldDescription);
      } else {
        setCustomWorld(GENRE_PRESETS[selectedGenre].sample);
      }
    } catch (error) {
      // Fallback to preset
      setCustomWorld(GENRE_PRESETS[selectedGenre].sample);
    } finally {
      setIsGeneratingWorld(false);
    }
  };

  const handleCharacterSetup = () => {
    const name = setupName.trim() || 'Adventurer';
    const newChar = {
      ...character,
      name,
      class: setupClass
    };

    // Adjust stats based on class
    if (setupClass === 'Fighter') {
      newChar.str = 16; newChar.con = 14; newChar.dex = 12;
    } else if (setupClass === 'Mage') {
      newChar.int = 16; newChar.wis = 14; newChar.cha = 12;
    } else if (setupClass === 'Rogue') {
      newChar.dex = 16; newChar.cha = 14; newChar.int = 12;
    }

    setCharacter(newChar);
    setSetupStep('ready');

    // Create opening narrative based on world context
    addMessage('dm', worldContext);
    addMessage('dm', `You are ${name} the ${setupClass}. Your journey in this world begins now...`, { isPrompt: true });
    addMessage('system', 'Type your actions in the box below. Examples: "I look around" or "I approach the nearest person"');
  };

  
  const handleCombatAction = async (action) => {
    if (!combat) return;
    setIsLoading(true);
    addMessage('player', action);

    try {
      const response = await api.post('/dm/combat/action', {
        encounterId: combat.encounter?.id || combat.id,
        action
      });

      const result = response.data;

      if (result.description) {
        addMessage('dm', result.description);
      }

      if (result.combatEnded) {
        addMessage('system', result.victoryMessage || 'Combat ended');
        setCombat(null);
      } else {
        // Update combat state
        setCombat(result);
        if (result.activeConditions) {
          setCombatConditions(result.activeConditions);
        }
      }
    } catch (error) {
      addMessage('system', 'Combat action failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const playerAction = input.trim();
    setInput('');

    // Handle commands
    if (playerAction.startsWith('/')) {
      handleCommand(playerAction);
      return;
    }

    addMessage('player', playerAction);

    // Check if action triggers combat
    const actionLower = playerAction.toLowerCase();
    if (actionLower.includes('attack') || actionLower.includes('fight') || actionLower.includes('combat')) {
      // Check if there's already active combat
      await checkActiveCombat();
    }
    setIsLoading(true);

    try {
      const response = await api.post('/dm/interact', {
        character,
        action: playerAction,
        worldContext: worldContext,
        recentMessages: messages.slice(-10), // Send last 10 messages for context
        sessionId: sessionId // Track session for memory consistency
      });

      const result = response.data;

      // Store session ID for memory continuity
      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      if (result.narrative) {
        addMessage('dm', result.narrative);
      }

      if (result.continuation) {
        addMessage('dm', result.continuation, { isPrompt: true });
      }

      // Show orchestration metadata if available
      if (result.metadata?.validation) {
        const { score, violations } = result.metadata.validation;
        if (score < 85) {
          console.warn(`[DM] Lorekeeper validation score: ${score}, violations: ${violations}`);
        }
      }

      if (result.metadata?.questTriggered) {
        addMessage('system', `Quest Opportunity Detected: ${result.metadata.questSuggestion}`);
      }

      if (result.achievement) {
        addMessage('system', `Achievement Unlocked: ${result.achievement}`);
      }

      // Check if DM response initiated combat
      if (result.combat || result.combatInitiated) {
        setCombat(result.combat);
        if (result.combat?.activeConditions) {
          setCombatConditions(result.combat.activeConditions);
        }
      }

    } catch (error) {
      // Fallback response if API fails
      const fallback = generateFallbackResponse(playerAction);
      addMessage('dm', fallback.narrative);
      if (fallback.continuation) {
        addMessage('dm', fallback.continuation, { isPrompt: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommand = (cmd) => {
    const command = cmd.toLowerCase();
    addMessage('player', cmd);

    switch (command) {
      case '/status':
        addMessage('system', `${character.name} the ${character.class} (Level ${character.level})\nSTR: ${character.str} | DEX: ${character.dex} | CON: ${character.con}\nINT: ${character.int} | WIS: ${character.wis} | CHA: ${character.cha}`);
        break;
      case '/quest':
        requestQuest();
        break;
      case '/help':
        addMessage('system', 'Commands:\n/status - View character stats\n/quest - Request a new quest\n/clear - Clear chat history\n/help - Show this help');
        break;
      case '/clear':
        setMessages([]);
        addMessage('dm', 'The mists clear... Your adventure continues.');
        break;
      default:
        addMessage('system', `Unknown command: ${command}`);
    }
  };

  const requestQuest = async () => {
    setIsLoading(true);
    addMessage('system', 'Consulting the Story Coordinator...');

    try {
      const response = await api.post('/dm/quest', { character });
      const quest = response.data;

      if (quest.title) {
        addMessage('dm', `NEW QUEST: ${quest.title}\n\n${quest.narrativeHook || quest.description}`);
        if (quest.objectives?.length) {
          const objList = quest.objectives.map((o, i) => `${i + 1}. ${o.narrativeDescription || o.description}`).join('\n');
          addMessage('system', `Objectives:\n${objList}`);
        }
      } else {
        addMessage('dm', 'No new quests available at this time. Continue exploring...');
      }
    } catch (error) {
      addMessage('dm', 'The threads of fate are tangled... Perhaps try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (action) => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('look') || actionLower.includes('examine')) {
      return {
        narrative: 'You carefully observe your surroundings. The details come into focus as you take in the scene before you.',
        continuation: 'What catches your attention most?'
      };
    }

    if (actionLower.includes('attack') || actionLower.includes('fight')) {
      return {
        narrative: `Your ${character.class === 'Fighter' ? 'weapon gleams' : character.class === 'Mage' ? 'magic crackles' : 'blade whispers'} as you prepare for combat!`,
        continuation: 'Roll for initiative! What is your strategy?'
      };
    }

    if (actionLower.includes('talk') || actionLower.includes('speak') || actionLower.includes('ask')) {
      return {
        narrative: 'You step forward to engage in conversation, your words carrying the weight of your intentions.',
        continuation: 'The listener turns their attention to you. What do you say?'
      };
    }

    return {
      narrative: `${character.name} ${action}. The world responds to your action, and new possibilities unfold before you.`,
      continuation: 'What do you do next?'
    };
  };

  // World Setup Step
  if (setupStep === 'world') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2 text-center">
            Dungeon Master
          </h1>
          <p className="text-gray-300 mb-6 text-center">
            First, let's establish your world
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-3 font-semibold">Choose a Genre</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(GENRE_PRESETS).map(([key, genre]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedGenre(key)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedGenre === key
                        ? 'border-yellow-400 bg-yellow-900/30'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{genre.icon}</span>
                      <span className="font-bold text-white">{genre.name}</span>
                    </div>
                    <p className="text-sm text-gray-300">{genre.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedGenre && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-300 font-semibold">World Description</label>
                  <button
                    onClick={handleGenerateWorld}
                    disabled={isGeneratingWorld}
                    className="text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
                  >
                    {isGeneratingWorld ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
                <textarea
                  value={customWorld || GENRE_PRESETS[selectedGenre].sample}
                  onChange={(e) => setCustomWorld(e.target.value)}
                  placeholder="Describe your world..."
                  rows={6}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
                <p className="text-xs text-gray-400">
                  Edit the text above to customize your world, or use the AI generator to create something unique.
                </p>
              </div>
            )}

            <button
              onClick={handleWorldSetup}
              disabled={!selectedGenre && !customWorld.trim()}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-gray-900 font-bold py-3 rounded transition-colors"
            >
              Next: Create Character
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Character Setup Step
  if (setupStep === 'character') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2 text-center">
            Dungeon Master
          </h1>
          <p className="text-gray-300 mb-6 text-center">
            Create your character to begin the adventure
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Character Name</label>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Class</label>
              <select
                value={setupClass}
                onChange={(e) => setSetupClass(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="Fighter">Fighter (Strength & Constitution)</option>
                <option value="Mage">Mage (Intelligence & Wisdom)</option>
                <option value="Rogue">Rogue (Dexterity & Charisma)</option>
              </select>
            </div>

            <button
              onClick={handleCharacterSetup}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded transition-colors"
            >
              Begin Adventure
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-400">Dungeon Master</h1>
          <div className="text-gray-300 text-sm">
            {character.name} the {character.class} | Level {character.level}
          </div>
        </div>
      </div>


          {/* Combat UI */}
          {combat && (
            <CombatUI
              combat={combat}
              onAction={handleCombatAction}
              isLoading={isLoading}
            />
          )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${
                msg.type === 'player'
                  ? 'ml-12 bg-blue-900/50'
                  : msg.type === 'dm'
                  ? 'mr-12 bg-yellow-900/30'
                  : 'mx-auto max-w-lg bg-gray-700/50'
              } rounded-lg p-4`}
            >
              <div className="text-xs text-gray-400 mb-1">
                {msg.type === 'player' ? 'You' : msg.type === 'dm' ? 'DM' : 'System'}
              </div>
              <div
                className={`${
                  msg.type === 'player'
                    ? 'text-blue-200'
                    : msg.type === 'dm'
                    ? msg.isPrompt
                      ? 'text-yellow-300 italic'
                      : 'text-yellow-100'
                    : 'text-gray-300'
                } whitespace-pre-wrap`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mr-12 bg-yellow-900/30 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">DM</div>
              <div className="text-yellow-300">
                <span className="animate-pulse">The DM considers your action...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you do? (or type /help for commands)"
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-gray-900 font-bold px-6 py-3 rounded transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
