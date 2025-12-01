import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';
import useQuestStore from '../stores/questStore';
import { characters, goals as goalsApi, quests as questsApi, dm } from '../services/api';
import JournalPage from '../components/journal/JournalPage';
import CombatMargin from '../components/journal/CombatMargin';
import InlineDiceRoller from '../components/journal/InlineDiceRoller';
import BottomNav from '../components/navigation/BottomNav';

// Tab configuration
const TABS = [
  { id: 'tale', label: 'Tale', icon: '📖' },
  { id: 'hero', label: 'Hero', icon: '⚔️' },
  { id: 'quests', label: 'Quests', icon: '📜' },
  { id: 'rituals', label: 'Rituals', icon: '🎯' },
];

export default function JournalView() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { character, goals, setCharacter, setGoals } = useCharacterStore();
  const { quests, setQuests } = useQuestStore();

  // Active tab
  const [activeTab, setActiveTab] = useState('tale');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // DM/Tale state
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const entriesEndRef = useRef(null);

  // Combat state
  const [combat, setCombat] = useState(null);
  const [healthConditions, setHealthConditions] = useState([]);
  const [pendingRoll, setPendingRoll] = useState(null);

  // Track initialization to prevent double-entry bug
  const initializedRef = useRef(false);

  // Scroll to bottom when entries change
  useEffect(() => {
    entriesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load character
      const charResponse = await characters.getMe();
      if (!charResponse.data) {
        navigate('/character/create');
        return;
      }
      setCharacter(charResponse.data);

      // Load goals
      const goalsResponse = await goalsApi.list();
      const goalsData = goalsResponse.data.goals || goalsResponse.data || [];
      setGoals(goalsData);

      // Load quests
      try {
        const questsResponse = await questsApi.list(charResponse.data.id);
        setQuests(questsResponse.data.quests || questsResponse.data || []);
      } catch {
        setQuests([]);
      }

      // Add welcome narrative on first load only (use ref to prevent double-entry)
      if (!initializedRef.current) {
        initializedRef.current = true;

        // Try to fetch stored narrative from backend
        try {
          const narrativeResponse = await dm.getWelcome(charResponse.data.id);
          if (narrativeResponse.data?.narrative) {
            addEntry('narrative', narrativeResponse.data.narrative);
          } else {
            // Fallback if no stored narrative
            addEntry('narrative', `The journal pages flutter open as you return, ${charResponse.data.name}. Your story continues...`);
          }
        } catch {
          // Fallback on error
          addEntry('narrative', `The journal pages flutter open as you return, ${charResponse.data.name}. Your story continues...`);
        }
      }

    } catch (err) {
      console.error('[Journal] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a narrative entry
  const addEntry = (type, content, metadata = {}) => {
    setEntries(prev => [...prev, {
      id: Date.now(),
      type,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    }]);
  };

  // Handle DM interaction
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

    addEntry('player', playerAction);
    setIsLoading(true);

    try {
      const response = await dm.interact({
        character,
        action: playerAction,
        worldContext: '',
        recentMessages: entries.slice(-10),
        sessionId
      });

      const result = response.data;

      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      if (result.narrative) {
        addEntry('narrative', result.narrative);
      }

      if (result.continuation) {
        addEntry('narrative', result.continuation);
      }

      if (result.pendingRoll) {
        setPendingRoll(result.pendingRoll);
        if (result.pendingRoll.healthConditions) {
          setHealthConditions(result.pendingRoll.healthConditions);
        }
      }

      if (result.combatState) {
        setCombat(result.combatState);
        if (result.combatState.healthConditions) {
          setHealthConditions(result.combatState.healthConditions);
        }
      }

    } catch {
      addEntry('narrative', `${character?.name || 'You'} ${playerAction}. The world responds to your action.`);
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
        addEntry('system', 'Commands:\n/status - View stats\n/quest - New quest\n/clear - Clear journal\n/help - This help');
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
      const response = await dm.quest(character);
      const quest = response.data;
      if (quest.title) {
        addEntry('narrative', `A new thread weaves into your tale: ${quest.title}\n\n${quest.narrativeHook || quest.description}`);
        loadData(); // Refresh quests
      } else {
        addEntry('narrative', 'The threads of fate remain still. Continue your journey...');
      }
    } catch {
      addEntry('narrative', 'The threads of fate are tangled... Perhaps try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollResult = async (rollResult) => {
    if (!pendingRoll) return;
    setIsLoading(true);
    try {
      const resultText = rollResult.success ? 'Success!' : 'Failed.';
      addEntry('roll', `${pendingRoll.skillType || pendingRoll.type}: ${rollResult.total} vs DC ${pendingRoll.dc} - ${resultText}`);
      setPendingRoll(null);
    } catch (error) {
      addEntry('system', `Roll failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const completeGoal = async (goal) => {
    try {
      await goalsApi.complete(goal.id, { value: goal.targetValue || 1 });
      addEntry('system', `Training complete: ${goal.name} (+${goal.xpReward || 25} XP)`);
      loadData();
    } catch (err) {
      console.error('Failed to complete goal:', err);
    }
  };

  const getJournalDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-200/60 font-serif italic">Opening your journal...</p>
        </div>
      </div>
    );
  }

  // Margin content for combat/conditions
  const marginContent = combat ? (
    <CombatMargin combat={combat} healthConditions={healthConditions} />
  ) : healthConditions.length > 0 ? (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider opacity-60">Conditions</div>
      {healthConditions.map((c, i) => (
        <div key={i} className={`health-buff ${c.type === 'debuff' ? 'debuff' : ''}`}>
          <span>{c.icon}</span> <span>{c.name}</span>
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
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-amber-600/80 text-white shadow-md'
                : 'text-amber-200/60 hover:text-amber-200 hover:bg-amber-900/20'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TALE TAB - Full DM Mode */}
      {activeTab === 'tale' && (
        <>
          {/* Character header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed" style={{ borderColor: 'var(--ink-light)' }}>
            <div className="handwritten text-xl">
              {character?.name} the {character?.class}
            </div>
            <div className="text-sm opacity-60">Level {character?.level}</div>
          </div>

          {/* Narrative entries */}
          <div className="space-y-4 min-h-[40vh]">
            {entries.map((entry) => (
              <div key={entry.id} className="animate-fade-in">
                {entry.type === 'narrative' && <p>{entry.content}</p>}
                {entry.type === 'player' && (
                  <p className="italic opacity-80" style={{ color: 'var(--ink-faded)' }}>{entry.content}</p>
                )}
                {entry.type === 'system' && (
                  <div className="my-4 py-2 px-4 rounded bg-amber-100/30 text-sm whitespace-pre-wrap" style={{ borderLeft: '3px solid var(--gold-muted)' }}>
                    {entry.content}
                  </div>
                )}
                {entry.type === 'roll' && (
                  <div className="roll-result inline-block my-2">🎲 {entry.content}</div>
                )}
              </div>
            ))}

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

            {isLoading && !pendingRoll && (
              <p className="italic animate-pulse opacity-60">The quill hovers, waiting...</p>
            )}

            <div ref={entriesEndRef} />
          </div>

          <div className="journal-divider" />

          {/* Input */}
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you do? (or /help)"
                disabled={isLoading || !!pendingRoll}
                className="journal-input flex-1"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !!pendingRoll}
                className="px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{ background: 'var(--gold-bright)', color: 'var(--leather-dark)' }}
              >
                Write
              </button>
            </div>
          </form>
        </>
      )}

      {/* HERO TAB - Character Stats */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">
              {character?.class === 'Fighter' ? '⚔️' : character?.class === 'Mage' ? '🔮' : '🗡️'}
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--gold-bright)' }}>
              {character?.name}
            </h2>
            <p className="opacity-70">Level {character?.level} {character?.class}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { stat: 'STR', label: 'Strength', value: character?.str, color: '#ef4444' },
              { stat: 'DEX', label: 'Dexterity', value: character?.dex, color: '#22c55e' },
              { stat: 'CON', label: 'Constitution', value: character?.con, color: '#eab308' },
              { stat: 'INT', label: 'Intelligence', value: character?.int, color: '#3b82f6' },
              { stat: 'WIS', label: 'Wisdom', value: character?.wis, color: '#a855f7' },
              { stat: 'CHA', label: 'Charisma', value: character?.cha, color: '#ec4899' },
            ].map(({ stat, label, value, color }) => (
              <div key={stat} className="p-4 rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
                <div className="text-xs uppercase tracking-wider opacity-60">{label}</div>
                <div className="text-3xl font-bold" style={{ color }}>{value}</div>
                <div className="text-xs opacity-50">{stat}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--gold-muted)', color: 'var(--ink-black)' }}>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total XP</span>
              <span className="text-xl font-bold">{character?.totalXp || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* QUESTS TAB */}
      {activeTab === 'quests' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--gold-bright)' }}>Active Quests</h2>

          {quests.filter(q => q.status === 'active' || q.status === 'pending').length === 0 ? (
            <div className="text-center py-8 opacity-60">
              <p className="mb-4">No active quests. The world awaits your deeds.</p>
              <button
                onClick={requestQuest}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg"
                style={{ background: 'var(--gold-bright)', color: 'var(--leather-dark)' }}
              >
                Seek a Quest
              </button>
            </div>
          ) : (
            quests.filter(q => q.status === 'active' || q.status === 'pending').map(quest => (
              <div key={quest.id} className="p-4 rounded-lg border" style={{ borderColor: 'var(--gold-muted)', background: 'rgba(0,0,0,0.2)' }}>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--gold-bright)' }}>{quest.title}</h3>
                <p className="text-sm opacity-70 mt-1">{quest.narrativeHook || quest.description}</p>
                {quest.objectives && (
                  <div className="mt-3 space-y-1">
                    {quest.objectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={obj.completed ? 'opacity-50' : ''}>{obj.completed ? '✓' : '○'}</span>
                        <span className={obj.completed ? 'line-through opacity-50' : ''}>{obj.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* RITUALS TAB - Daily Goals */}
      {activeTab === 'rituals' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--gold-bright)' }}>Daily Rituals</h2>

          {goals.length === 0 ? (
            <div className="text-center py-8 opacity-60">
              <p className="mb-4">No training rituals set.</p>
              <button
                onClick={() => navigate('/goals/setup')}
                className="px-4 py-2 rounded-lg"
                style={{ background: 'var(--gold-bright)', color: 'var(--leather-dark)' }}
              >
                Create Ritual
              </button>
            </div>
          ) : (
            goals.map(goal => {
              const statColors = { STR: '#ef4444', DEX: '#22c55e', CON: '#eab308', INT: '#3b82f6', WIS: '#a855f7', CHA: '#ec4899' };
              const color = statColors[goal.statMapping] || '#888';
              const isCompleted = goal.completedToday;

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-lg border transition-all ${isCompleted ? 'opacity-50' : 'hover:border-amber-500/50'}`}
                  style={{ borderColor: `${color}40`, background: 'rgba(0,0,0,0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: `${color}30`, color }}>
                        {goal.statMapping?.[0] || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: isCompleted ? 'inherit' : 'var(--gold-bright)' }}>
                          {goal.name}
                        </h3>
                        <p className="text-xs opacity-60">{goal.goalType} • +{goal.xpReward || 25} XP</p>
                      </div>
                    </div>
                    {!isCompleted && (
                      <button
                        onClick={() => completeGoal(goal)}
                        className="px-3 py-1.5 rounded text-sm font-medium"
                        style={{ background: `${color}30`, color }}
                      >
                        Complete
                      </button>
                    )}
                    {isCompleted && (
                      <span className="text-green-500 text-xl">✓</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom padding for nav */}
      <div className="h-24" />

      <BottomNav />
    </JournalPage>
  );
}
