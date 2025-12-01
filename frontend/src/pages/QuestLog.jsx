import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quests as questsApi, characters } from '../services/api';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';
import BottomNav from '../components/navigation/BottomNav';
import QuestTabs from '../components/quest/QuestTabs';
import QuestCard from '../components/QuestCard';
import { useTutorial } from '../hooks/useTutorial';

/**
 * Quest Log Page - MMO-Style Quest Management
 * Dark parchment theme matching the Journal aesthetic
 */
export default function QuestLog() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { character, setCharacter } = useCharacterStore();

  // Trigger tutorial tips for this page
  useTutorial('quests', { delay: 800 });

  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [error, setError] = useState(null);
  const [expandedQuestId, setExpandedQuestId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get character if not loaded
      let char = character;
      if (!char) {
        const charResponse = await characters.getMe();
        char = charResponse.data.character || charResponse.data;
        setCharacter(char);
      }

      // Get quests
      const questsResponse = await questsApi.list(char.id);
      setQuests(questsResponse.data.quests || []);

    } catch (err) {
      console.error('Error loading quest log:', err);
      setError('Failed to load quest log');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuest = async (questId) => {
    try {
      await questsApi.start(questId, character.id);

      setQuests(quests.map(q =>
        q.id === questId ? { ...q, status: 'active', startedAt: new Date().toISOString() } : q
      ));

      setActiveTab('active');
    } catch (err) {
      console.error('Failed to accept quest:', err);
    }
  };

  const handleCompleteObjective = async (questId, objectiveId) => {
    try {
      const response = await questsApi.completeObjective(questId, objectiveId, character.id);
      const { success, rewards, questCompleted } = response.data;

      if (success) {
        setQuests(quests.map(q => {
          if (q.id === questId) {
            let objectives = [];
            try {
              objectives = typeof q.objectives === 'string' ? JSON.parse(q.objectives) : q.objectives;
            } catch (e) {
              objectives = q.objectives || [];
            }

            const updatedObjectives = objectives.map(obj =>
              obj.id === objectiveId ? { ...obj, completed: true } : obj
            );

            return {
              ...q,
              objectives: updatedObjectives,
              status: questCompleted ? 'completed' : q.status
            };
          }
          return q;
        }));

        if (rewards) {
          setCharacter({
            ...character,
            [rewards.stat.toLowerCase()]: character[rewards.stat.toLowerCase()] + 1,
            xp: character.xp + rewards.xp
          });
        }
      }
    } catch (err) {
      console.error('Failed to complete objective:', err);
    }
  };

  const handleMakeChoice = async (questId, choiceId, optionId) => {
    try {
      const response = await questsApi.makeChoice(questId, choiceId, character.id, optionId);
      if (response.data.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to make choice:', err);
    }
  };

  const handleAbandonQuest = async (questId) => {
    try {
      await questsApi.abandon(questId, character.id);
      setQuests(quests.map(q =>
        q.id === questId ? { ...q, status: 'available' } : q
      ));
    } catch (err) {
      console.error('Failed to abandon quest:', err);
    }
  };

  // Filter quests by tab
  const filteredQuests = quests.filter(q => {
    if (activeTab === 'available') return q.status === 'available';
    if (activeTab === 'active') return q.status === 'active';
    if (activeTab === 'completed') return q.status === 'completed';
    return false;
  });

  // Quest counts
  const counts = {
    available: quests.filter(q => q.status === 'available').length,
    active: quests.filter(q => q.status === 'active').length,
    completed: quests.filter(q => q.status === 'completed').length
  };

  // Group quests by type
  const groupedQuests = filteredQuests.reduce((acc, quest) => {
    const type = quest.questType || quest.quest_type || 'side_story';
    if (!acc[type]) acc[type] = [];
    acc[type].push(quest);
    return acc;
  }, {});

  const questTypeConfig = {
    main_story: { title: 'Main Story', icon: '⚔️', priority: 1 },
    character_arc: { title: 'Your Path', icon: '🌟', priority: 2 },
    world_event: { title: 'World Events', icon: '🔥', priority: 3 },
    side_story: { title: 'Side Quests', icon: '📖', priority: 4 },
    exploration: { title: 'Exploration', icon: '🗺️', priority: 5 },
    corrective: { title: 'Balance', icon: '⚖️', priority: 6 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-200/60 font-serif italic">Consulting the quest archives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center px-4">
        <div className="bg-[#1a0a2e]/80 rounded-lg p-8 max-w-md text-center border border-red-500/30">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20">
      {/* Background texture */}
      <div className="fixed inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-purple-900/10 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0520]/95 backdrop-blur-xl border-b border-amber-900/20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/journal')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ←
              </button>
              <h1 className="text-lg font-bold text-white">Quest Log</h1>
            </div>
            <div className="text-sm text-gray-500">
              {character?.name}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="mb-6">
          <QuestTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>

        {/* Quest List */}
        {filteredQuests.length === 0 ? (
          <EmptyState tab={activeTab} onNavigate={() => setActiveTab('available')} />
        ) : (
          <div className="space-y-6">
            {Object.entries(questTypeConfig)
              .sort((a, b) => a[1].priority - b[1].priority)
              .map(([type, config]) => {
                const typeQuests = groupedQuests[type];
                if (!typeQuests || typeQuests.length === 0) return null;

                return (
                  <section key={type}>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.title}</span>
                      <span className="text-gray-600">({typeQuests.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {typeQuests.map(quest => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          isExpanded={expandedQuestId === quest.id}
                          onToggle={() => setExpandedQuestId(
                            expandedQuestId === quest.id ? null : quest.id
                          )}
                          onAccept={() => handleAcceptQuest(quest.id)}
                          onCompleteObjective={(objId) => handleCompleteObjective(quest.id, objId)}
                          onMakeChoice={(choiceId, optionId) => handleMakeChoice(quest.id, choiceId, optionId)}
                          onAbandon={() => handleAbandonQuest(quest.id)}
                          character={character}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * Empty state for quest tabs
 */
function EmptyState({ tab, onNavigate }) {
  const messages = {
    active: {
      icon: '⚔️',
      title: 'No Active Quests',
      description: 'Accept some quests to begin your adventure!',
      action: 'Browse Available',
      showAction: true
    },
    available: {
      icon: '📋',
      title: 'No Available Quests',
      description: 'Check back later for new adventures, or complete some goals to unlock new quests.',
      showAction: false
    },
    completed: {
      icon: '📜',
      title: 'No Completed Quests',
      description: 'Your legend is just beginning. Complete quests to build your story!',
      showAction: false
    }
  };

  const msg = messages[tab] || messages.active;

  return (
    <div className="bg-[#1a0a2e]/40 rounded-xl p-8 text-center border border-purple-900/30">
      <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl opacity-60">{msg.icon}</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{msg.title}</h3>
      <p className="text-gray-400 mb-6 max-w-sm mx-auto font-serif italic">
        {msg.description}
      </p>
      {msg.showAction && (
        <button
          onClick={onNavigate}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg"
        >
          {msg.action}
        </button>
      )}
    </div>
  );
}
