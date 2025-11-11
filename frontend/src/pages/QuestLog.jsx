import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quests as questsApi } from '../services/api';
import useAuthStore from '../stores/authStore';
import QuestSection from '../components/QuestSection';

/**
 * Quest Log Page - MMO-Style Quest Management
 * Displays quests organized by type with tabs for Available/Active/Completed
 */
export default function QuestLog() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [character, setCharacter] = useState(null);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'active', 'completed'
  const [error, setError] = useState(null);

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

      // Get character
      const { characters } = await import('../services/api');
      const charResponse = await characters.getMe();
      const char = charResponse.data.character;
      setCharacter(char);

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

      // Update local state
      setQuests(quests.map(q =>
        q.id === questId ? { ...q, status: 'active', startedAt: new Date().toISOString() } : q
      ));

      // Auto-switch to active tab
      setActiveTab('active');
    } catch (err) {
      console.error('Failed to accept quest:', err);
      alert('Failed to accept quest. Please try again.');
    }
  };

  const handleCompleteObjective = async (questId, objectiveId) => {
    try {
      const response = await questsApi.completeObjective(questId, objectiveId, character.id);
      const { success, rewards, progress, questCompleted } = response.data;

      if (success) {
        // Update quest in local state
        setQuests(quests.map(q => {
          if (q.id === questId) {
            // Parse objectives
            let objectives = [];
            try {
              objectives = typeof q.objectives === 'string' ? JSON.parse(q.objectives) : q.objectives;
            } catch (e) {
              objectives = q.objectives || [];
            }

            // Mark objective as complete
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

        // Update character state
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
      alert('Failed to complete objective. Please try again.');
    }
  };

  const handleMakeChoice = async (questId, choiceId, optionId) => {
    try {
      const response = await questsApi.makeChoice(questId, choiceId, character.id, optionId);

      if (response.data.success) {
        // Reload quests to get updated quest state and potentially new quests
        await loadData();

        // Show consequence notification if available
        const consequences = response.data.choice.consequences;
        if (consequences) {
          let message = 'Choice made! ';
          if (consequences.relationshipChanges && consequences.relationshipChanges.length > 0) {
            message += `Relationships affected: ${consequences.relationshipChanges.map(r => r.npc).join(', ')}. `;
          }
          if (consequences.branchActivated) {
            message += `New story branch activated: ${consequences.branchActivated}`;
          }
          alert(message);
        }
      }
    } catch (err) {
      console.error('Failed to make choice:', err);
      alert(err.response?.data?.error || 'Failed to make choice. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-gray-600">Loading Quest Log...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="card border-2 border-red-200 bg-red-50">
            <div className="text-red-800 font-bold mb-2">Error</div>
            <div className="text-red-700">{error}</div>
            <button onClick={loadData} className="btn btn-primary mt-4">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter quests by tab
  const filteredQuests = quests.filter(q => {
    if (activeTab === 'available') return q.status === 'available';
    if (activeTab === 'active') return q.status === 'active';
    if (activeTab === 'completed') return q.status === 'completed';
    return false;
  });

  // Group quests by type
  const groupedQuests = filteredQuests.reduce((acc, quest) => {
    const type = quest.questType || quest.quest_type || 'side_story';
    if (!acc[type]) acc[type] = [];
    acc[type].push(quest);
    return acc;
  }, {});

  // Count quests by status
  const availableCount = quests.filter(q => q.status === 'available').length;
  const activeCount = quests.filter(q => q.status === 'active').length;
  const completedCount = quests.filter(q => q.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Quest Log</h1>
              <p className="text-gray-600">
                {character?.name} • Level {character?.level || 1}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border-2 border-purple-200">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'available'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📋</span>
                <span>Available</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  activeTab === 'available' ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  {availableCount}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>⚔️</span>
                <span>Active</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  activeTab === 'active' ? 'bg-green-600' : 'bg-gray-200'
                }`}>
                  {activeCount}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'completed'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Completed</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  activeTab === 'completed' ? 'bg-purple-600' : 'bg-gray-200'
                }`}>
                  {completedCount}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Quest Sections */}
        {filteredQuests.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📜</div>
            <div className="text-xl font-bold text-gray-900 mb-2">
              {activeTab === 'available' && 'No Available Quests'}
              {activeTab === 'active' && 'No Active Quests'}
              {activeTab === 'completed' && 'No Completed Quests Yet'}
            </div>
            <div className="text-gray-600 mb-6">
              {activeTab === 'available' && 'Check back later for new adventures!'}
              {activeTab === 'active' && 'Accept some quests from the Available tab to get started!'}
              {activeTab === 'completed' && 'Complete some quests to build your legend!'}
            </div>
            {activeTab === 'available' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Story Section */}
            {groupedQuests.main_story && (
              <QuestSection
                title="Main Story"
                icon="⚔️"
                quests={groupedQuests.main_story}
                questStatus={activeTab}
                onAccept={handleAcceptQuest}
                onCompleteObjective={handleCompleteObjective}
                onMakeChoice={handleMakeChoice}
                character={character}
              />
            )}

            {/* Character Arcs Section */}
            {groupedQuests.character_arc && (
              <QuestSection
                title="Your Path"
                icon="🌟"
                quests={groupedQuests.character_arc}
                questStatus={activeTab}
                onAccept={handleAcceptQuest}
                onCompleteObjective={handleCompleteObjective}
                onMakeChoice={handleMakeChoice}
                character={character}
              />
            )}

            {/* World Events Section */}
            {groupedQuests.world_event && (
              <QuestSection
                title="World Events"
                icon="🔥"
                quests={groupedQuests.world_event}
                questStatus={activeTab}
                onAccept={handleAcceptQuest}
                onCompleteObjective={handleCompleteObjective}
                onMakeChoice={handleMakeChoice}
                character={character}
                urgent={true}
              />
            )}

            {/* Side Stories Section */}
            {groupedQuests.side_story && (
              <QuestSection
                title="Side Quests"
                icon="📖"
                quests={groupedQuests.side_story}
                questStatus={activeTab}
                onAccept={handleAcceptQuest}
                onCompleteObjective={handleCompleteObjective}
                onMakeChoice={handleMakeChoice}
                character={character}
              />
            )}

            {/* Exploration Section */}
            {groupedQuests.exploration && (
              <QuestSection
                title="Exploration"
                icon="🗺️"
                quests={groupedQuests.exploration}
                questStatus={activeTab}
                onAccept={handleAcceptQuest}
                onCompleteObjective={handleCompleteObjective}
                onMakeChoice={handleMakeChoice}
                character={character}
                collapsible={true}
              />
            )}

            {/* Corrective/Balance Section */}
            {groupedQuests.corrective && (
              <QuestSection
                title="Balance Quests"
                icon="⚖️"
                quests={groupedQuests.corrective}
                questStatus={activeTab}
                onAccept={handleAcceptQuest}
                onCompleteObjective={handleCompleteObjective}
                onMakeChoice={handleMakeChoice}
                character={character}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
