import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { dm } from '../services/api';
import { characters } from '../services/api';
import useAuthStore from '../stores/authStore';
import JournalPage from '../components/journal/JournalPage';
import CombatMargin from '../components/journal/CombatMargin';
import InlineDiceRoller from '../components/journal/InlineDiceRoller';
import { useTutorial } from '../hooks/useTutorial';

export default function DungeonMaster() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Trigger tutorial tips for this page
  useTutorial('dm', { delay: 1500 });

  // Narrative entries (continuous prose, not chat bubbles)
  const [entries, setEntries] = useState([]);
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
  const entriesEndRef = useRef(null);

  // Combat state
  const [combat, setCombat] = useState(null);
  const [healthConditions, setHealthConditions] = useState([]);

  // Pending roll state (skill checks, initiative, attacks)
  const [pendingRoll, setPendingRoll] = useState(null);

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
    entriesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [entries]);

  // Check for active combat
  const checkActiveCombat = async () => {
    if (!character.id) return;
    try {
      const response = await api.get(`/dm/combat/active?characterId=${character.id}`);
      if (response.data) {
        setCombat(response.data);
        if (response.data.healthConditions) {
          setHealthConditions(response.data.healthConditions);
        }
      } else {
        setCombat(null);
      }
    } catch {
      setCombat(null);
    }
  };

  // Check for combat periodically when adventure is active
  useEffect(() => {
    if (setupStep === 'ready' && character.id) {
      checkActiveCombat();
      const interval = setInterval(checkActiveCombat, 5000);
      return () => clearInterval(interval);
    }
  }, [setupStep, character.id]);

  // Add a narrative entry
  const addEntry = (type, content, metadata = {}) => {
    setEntries(prev => [...prev, {
      id: Date.now(),
      type, // 'narrative', 'player', 'system', 'roll'
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    }]);
  };

  // Load user's character if logged in
  useEffect(() => {
    const loadCharacter = async () => {
      if (user) {
        try {
          const response = await characters.getMe();
          if (response.data) {
            setCharacter(response.data);
            setSetupStep('ready');
            addEntry('narrative', `The journal pages flutter as you return to your adventure. ${response.data.name}, your story continues...`);
          }
        } catch {
          console.log('No character found, using setup flow');
        }
      }
    };
    loadCharacter();
  }, [user]);

  const handleWorldSetup = () => {
    const world = customWorld.trim() || (selectedGenre ? GENRE_PRESETS[selectedGenre].sample : '');
    if (!world) return;
    setWorldContext(world);
    setSetupStep('character');
  };

  const handleGenerateWorld = async () => {
    if (!selectedGenre) return;
    setIsGeneratingWorld(true);
    try {
      const response = await api.post('/agent-lab/world-generator', {
        genre: selectedGenre,
        characterClass: 'Fighter'
      });
      if (response.data.output?.worldDescription) {
        setCustomWorld(response.data.output.worldDescription);
      } else {
        setCustomWorld(GENRE_PRESETS[selectedGenre].sample);
      }
    } catch {
      setCustomWorld(GENRE_PRESETS[selectedGenre].sample);
    } finally {
      setIsGeneratingWorld(false);
    }
  };

  const handleCharacterSetup = () => {
    const name = setupName.trim() || 'Adventurer';
    const newChar = { ...character, name, class: setupClass };

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

    // Opening narrative entry
    addEntry('narrative', worldContext);
    addEntry('narrative', `You are ${name} the ${setupClass}. The pages of your story lie blank before you, waiting to be written.`);
  };

  // Handle skill check roll from InlineDiceRoller
  const handleRollResult = async (rollResult) => {
    if (!pendingRoll) return;

    setIsLoading(true);
    try {
      // Submit the roll to backend for resolution
      const response = await api.post('/dm/resolve-roll', {
        characterId: character.id,
        rollType: pendingRoll.type,
        roll: rollResult.roll,
        skillType: pendingRoll.skillType,
        dc: pendingRoll.dc,
        encounterId: pendingRoll.encounterId
      });

      const result = response.data;

      // Add roll result to narrative
      const resultText = rollResult.success
        ? 'Your efforts succeed!'
        : 'Your attempt falls short.';

      addEntry('roll', `${pendingRoll.skillType || pendingRoll.type}: ${rollResult.total} vs DC ${pendingRoll.dc} - ${resultText}`);

      // Add narrative response
      if (result.narrative) {
        addEntry('narrative', result.narrative);
      }

      // Update combat state if relevant
      if (result.combatState) {
        setCombat(result.combatState);
      }

      setPendingRoll(null);
    } catch (error) {
      addEntry('system', `Roll failed: ${error.message}`);
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

    // Add player action as an italicized entry
    addEntry('player', playerAction);

    setIsLoading(true);

    try {
      const response = await api.post('/dm/interact', {
        character,
        action: playerAction,
        worldContext,
        recentMessages: entries.slice(-10),
        sessionId
      });

      const result = response.data;

      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      // Add DM narrative response
      if (result.narrative) {
        addEntry('narrative', result.narrative);
      }

      if (result.continuation) {
        addEntry('narrative', result.continuation);
      }

      // Check for pending roll (skill check with player agency)
      if (result.pendingRoll) {
        setPendingRoll(result.pendingRoll);
        // Health conditions come with the pending roll
        if (result.pendingRoll.healthConditions) {
          setHealthConditions(result.pendingRoll.healthConditions);
        }
      }

      // Combat initiated
      if (result.combatState) {
        setCombat(result.combatState);
        if (result.combatState.healthConditions) {
          setHealthConditions(result.combatState.healthConditions);
        }
      }

      // Quest triggered
      if (result.metadata?.questTriggered) {
        addEntry('system', `A new thread appears in your story: ${result.metadata.questSuggestion}`);
      }

    } catch {
      const fallback = generateFallbackResponse(playerAction);
      addEntry('narrative', fallback.narrative);
      if (fallback.continuation) {
        addEntry('narrative', fallback.continuation);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommand = (cmd) => {
    const command = cmd.toLowerCase();
    addEntry('player', cmd);

    switch (command) {
      case '/status':
        addEntry('system', `${character.name} the ${character.class} (Level ${character.level})\nSTR: ${character.str} | DEX: ${character.dex} | CON: ${character.con}\nINT: ${character.int} | WIS: ${character.wis} | CHA: ${character.cha}`);
        break;
      case '/quest':
        requestQuest();
        break;
      case '/help':
        addEntry('system', 'Commands:\n/status - View character stats\n/quest - Request a new quest\n/clear - Clear journal\n/help - Show this help');
        break;
      case '/clear':
        setEntries([]);
        addEntry('narrative', 'The mists clear... A new page begins.');
        break;
      default:
        addEntry('system', `Unknown command: ${command}`);
    }
  };

  const requestQuest = async () => {
    setIsLoading(true);
    addEntry('system', 'Consulting the fates...');

    try {
      const response = await api.post('/dm/quest', { character });
      const quest = response.data;

      if (quest.title) {
        addEntry('narrative', `A new thread weaves into your tale: ${quest.title}\n\n${quest.narrativeHook || quest.description}`);
      } else {
        addEntry('narrative', 'The threads of fate remain still. Continue your journey...');
      }
    } catch {
      addEntry('narrative', 'The threads of fate are tangled... Perhaps try again later.');
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
        continuation: 'Roll for initiative!'
      };
    }

    return {
      narrative: `${character.name} ${action}. The world responds to your action, and new possibilities unfold.`,
      continuation: null
    };
  };

  // Get today's date in journal format
  const getJournalDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // World Setup Step
  if (setupStep === 'world') {
    return (
      <JournalPage pageStyle="compact">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--gold-bright)' }}>
            Begin Your Tale
          </h1>
          <p className="text-lg opacity-70">First, establish the world of your adventure</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block mb-3 font-semibold">Choose a Setting</label>
            <div className="grid gap-3">
              {Object.entries(GENRE_PRESETS).map(([key, genre]) => (
                <button
                  key={key}
                  onClick={() => setSelectedGenre(key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedGenre === key
                      ? 'border-amber-600 bg-amber-50/50'
                      : 'border-gray-300/50 hover:border-amber-400/50'
                  }`}
                  style={{ fontFamily: 'var(--font-narrative)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{genre.icon}</span>
                    <span className="font-semibold">{genre.name}</span>
                  </div>
                  <p className="text-sm opacity-70">{genre.description}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedGenre && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold">World Description</label>
                <button
                  onClick={handleGenerateWorld}
                  disabled={isGeneratingWorld}
                  className="text-sm px-3 py-1 rounded"
                  style={{
                    background: 'var(--gold-muted)',
                    color: 'var(--ink-black)'
                  }}
                >
                  {isGeneratingWorld ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea
                value={customWorld || GENRE_PRESETS[selectedGenre].sample}
                onChange={(e) => setCustomWorld(e.target.value)}
                placeholder="Describe your world..."
                rows={5}
                className="journal-input w-full resize-none"
              />
            </div>
          )}

          <button
            onClick={handleWorldSetup}
            disabled={!selectedGenre && !customWorld.trim()}
            className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            style={{
              background: 'var(--gold-bright)',
              color: 'var(--leather-dark)'
            }}
          >
            Next: Create Your Hero
          </button>
        </div>
      </JournalPage>
    );
  }

  // Character Setup Step
  if (setupStep === 'character') {
    return (
      <JournalPage pageStyle="compact">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--gold-bright)' }}>
            Create Your Hero
          </h1>
          <p className="text-lg opacity-70">Who will write their name in this tale?</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold">Your Name</label>
            <input
              type="text"
              value={setupName}
              onChange={(e) => setSetupName(e.target.value)}
              placeholder="Enter your name..."
              className="journal-input w-full"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Your Calling</label>
            <select
              value={setupClass}
              onChange={(e) => setSetupClass(e.target.value)}
              className="journal-input w-full"
            >
              <option value="Fighter">Fighter - Master of Strength & Steel</option>
              <option value="Mage">Mage - Wielder of Arcane Power</option>
              <option value="Rogue">Rogue - Shadow and Cunning</option>
            </select>
          </div>

          <button
            onClick={handleCharacterSetup}
            className="w-full py-3 rounded-lg font-semibold"
            style={{
              background: 'var(--gold-bright)',
              color: 'var(--leather-dark)'
            }}
          >
            Begin Your Story
          </button>
        </div>
      </JournalPage>
    );
  }

  // Main Journal View
  const marginContent = combat ? (
    <CombatMargin
      combat={combat}
      healthConditions={healthConditions}
    />
  ) : healthConditions.length > 0 ? (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider opacity-60">Your Conditions</div>
      {healthConditions.map((condition, i) => (
        <div
          key={i}
          className={`health-buff ${condition.type === 'debuff' ? 'debuff' : ''}`}
        >
          <span>{condition.icon}</span>
          <span>{condition.name}</span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <JournalPage
      hasMargin={!!combat || healthConditions.length > 0}
      marginContent={marginContent}
      showHeader={true}
      headerContent={getJournalDate()}
    >
      {/* Character header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed" style={{ borderColor: 'var(--ink-light)' }}>
        <div className="handwritten text-xl">
          {character.name} the {character.class}
        </div>
        <div className="text-sm opacity-60">
          Level {character.level}
        </div>
      </div>

      {/* Narrative entries - continuous prose */}
      <div className="space-y-4 min-h-[50vh]">
        {entries.map((entry, index) => (
          <div key={entry.id} className="animate-fade-in">
            {entry.type === 'narrative' && (
              <p className={index === 0 ? '' : ''}>
                {entry.content}
              </p>
            )}

            {entry.type === 'player' && (
              <p className="italic opacity-80" style={{ color: 'var(--ink-faded)' }}>
                {entry.content}
              </p>
            )}

            {entry.type === 'system' && (
              <div className="my-4 py-2 px-4 rounded bg-amber-100/30 text-sm" style={{ borderLeft: '3px solid var(--gold-muted)' }}>
                {entry.content}
              </div>
            )}

            {entry.type === 'roll' && (
              <div className="roll-result inline-block my-2">
                🎲 {entry.content}
              </div>
            )}
          </div>
        ))}

        {/* Pending roll - inline dice roller */}
        {pendingRoll && (
          <InlineDiceRoller
            rollType={pendingRoll.type}
            skillName={pendingRoll.skillType}
            modifier={pendingRoll.totalModifier}
            dc={pendingRoll.dc}
            advantage={pendingRoll.advantage}
            disadvantage={pendingRoll.disadvantage}
            healthConditions={pendingRoll.healthConditions}
            onRoll={handleRollResult}
            isLoading={isLoading}
          />
        )}

        {/* Loading state */}
        {isLoading && !pendingRoll && (
          <p className="italic animate-pulse opacity-60">
            The quill hovers, waiting...
          </p>
        )}

        <div ref={entriesEndRef} />
      </div>

      {/* Divider */}
      <div className="journal-divider" />

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you do next? (or /help for commands)"
            disabled={isLoading || !!pendingRoll}
            className="journal-input flex-1"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !!pendingRoll}
            className="px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'var(--gold-bright)',
              color: 'var(--leather-dark)'
            }}
          >
            Write
          </button>
        </div>
      </form>

      {/* Bottom padding for navigation */}
      <div className="h-20" />
    </JournalPage>
  );
}
