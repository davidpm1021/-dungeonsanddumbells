import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';
import useQuestStore from '../stores/questStore';
import { characters, goals as goalsApi, quests as questsApi } from '../services/api';
import StatCard from '../components/StatCard';
import GoalCard from '../components/GoalCard';
import QuestCard from '../components/QuestCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { character, goals, setCharacter, setGoals, updateCharacterXP } = useCharacterStore();
  const { quests, setQuests, activeQuest } = useQuestStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [questGeneration, setQuestGeneration] = useState(false);
  const [consequence, setConsequence] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load character
      const charResponse = await characters.getMe();

      if (!charResponse.data) {
        // No character yet, redirect to creation
        navigate('/character/create');
        return;
      }

      setCharacter(charResponse.data);

      // Load goals
      const goalsResponse = await goalsApi.list();
      setGoals(goalsResponse.data.goals || goalsResponse.data || []);

      // Load quests
      try {
        const questsResponse = await questsApi.list(charResponse.data.id);
        setQuests(questsResponse.data.quests || questsResponse.data || []);
      } catch (questErr) {
        console.log('No quests yet or error loading quests:', questErr);
        setQuests([]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoal = async (goalId, payload) => {
    try {
      const response = await goalsApi.complete(goalId, payload);
      const { goal, character: updatedCharacter, xpAwarded, statMapping, streakBonus } = response.data;

      // Update the goal in the store
      setGoals(goals.map((g) => (g.id === goal.id ? goal : g)));

      // Update character stats
      setCharacter(updatedCharacter);

      // Show celebration
      setCelebration({
        goalName: goal.name,
        xpAwarded,
        statMapping,
        streakBonus,
        oldChar: character,
        newChar: updatedCharacter,
      });

      // Auto-hide after 5 seconds
      setTimeout(() => setCelebration(null), 5000);
    } catch (err) {
      console.error('Error completing goal:', err);
      throw err;
    }
  };

  const handleGenerateQuest = async () => {
    setQuestGeneration(true);
    try {
      const response = await questsApi.generate(character.id);
      const newQuest = response.data.quest || response.data;

      setQuests([...quests, newQuest]);

      // Show success message
      alert(`New quest generated: "${newQuest.title}"!`);
    } catch (err) {
      console.error('Failed to generate quest:', err);
      alert('Failed to generate quest. The AI system may not be fully configured yet.');
    } finally {
      setQuestGeneration(false);
    }
  };

  const handleAcceptQuest = async (questId) => {
    try {
      await questsApi.start(questId, character.id);

      // Update quest status in local state
      setQuests(quests.map(q =>
        q.id === questId ? { ...q, status: 'active' } : q
      ));
    } catch (err) {
      console.error('Failed to accept quest:', err);
      alert('Failed to accept quest. Please try again.');
    }
  };

  const handleCompleteObjective = async (questId, objectiveId) => {
    try {
      const response = await questsApi.completeObjective(questId, objectiveId, character.id);
      const { success, rewards, progress, questCompleted } = response.data;

      if (!success) {
        throw new Error('Failed to complete objective');
      }

      // Update the quest in local state with new objectives
      setQuests(quests.map(q => {
        if (q.id === questId) {
          // Parse objectives and mark the completed one
          let objectives = [];
          try {
            if (typeof q.objectives === 'string') {
              objectives = JSON.parse(q.objectives);
            } else if (Array.isArray(q.objectives)) {
              objectives = q.objectives;
            } else if (q.objectivesJson) {
              objectives = typeof q.objectivesJson === 'string'
                ? JSON.parse(q.objectivesJson)
                : q.objectivesJson;
            }
          } catch (e) {
            console.error('Failed to parse objectives:', e);
          }

          // Mark the objective as completed
          const updatedObjectives = objectives.map(obj =>
            obj.id === objectiveId ? { ...obj, completed: true } : obj
          );

          return {
            ...q,
            objectives: updatedObjectives,
            objectivesJson: updatedObjectives,
            status: questCompleted ? 'completed' : q.status
          };
        }
        return q;
      }));

      // Update character with new rewards
      setCharacter({
        ...character,
        [rewards.stat.toLowerCase()]: character[rewards.stat.toLowerCase()] + 1,
        xp: character.xp + rewards.xp
      });

      // Show small notification
      if (questCompleted) {
        alert(`Quest completed! Earned ${rewards.xp} XP and +1 ${rewards.stat}!`);
      }

    } catch (err) {
      console.error('Failed to complete objective:', err);
      alert('Failed to complete objective. Please try again.');
    }
  };

  const handleCompleteQuest = async (questId) => {
    try {
      const response = await questsApi.complete(questId, { outcome: 'success' });
      const { quest: updatedQuest, consequence: questConsequence, character: updatedCharacter } = response.data;

      // Update quest in store
      setQuests(quests.map(q => q.id === questId ? updatedQuest : q));

      // Update character
      if (updatedCharacter) {
        setCharacter(updatedCharacter);
      }

      // Show consequence modal
      if (questConsequence) {
        setConsequence({
          questTitle: updatedQuest.title,
          narrative: questConsequence.narrativeText || questConsequence.description,
          rewards: questConsequence.rewards || {},
        });

        // Auto-hide after 8 seconds
        setTimeout(() => setConsequence(null), 8000);
      }
    } catch (err) {
      console.error('Failed to complete quest:', err);
      alert('Failed to complete quest. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={loadDashboardData} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return null; // Will redirect to character creation
  }

  const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-display font-bold text-primary">
                Dumbbells & Dragons
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user?.username}</span>!
              </span>
              <button onClick={handleLogout} className="btn btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Character Header */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-display font-bold text-gray-900">
                {character.name}
              </h2>
              <p className="text-gray-600">Level {character.level}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total XP</p>
              <p className="text-2xl font-bold text-primary">{character.totalXp}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-display font-bold mb-4">Your Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <StatCard
                key={stat}
                stat={stat}
                value={character[stat]}
                xp={character[`${stat}Xp`]}
                xpNeeded={character[`${stat}XpNeeded`]}
              />
            ))}
          </div>
        </div>

        {/* Goals Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-bold">Daily Goals</h3>
            <button
              onClick={() => navigate('/goals/setup')}
              className="btn btn-secondary text-sm"
            >
              + Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-600 mb-4">
                You haven't set any goals yet. Add your first wellness goal to start earning XP!
              </p>
              <button
                onClick={() => navigate('/goals/setup')}
                className="btn btn-primary"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onComplete={handleCompleteGoal} />
              ))}
            </div>
          )}
        </div>

        {/* Quest Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-bold">Your Adventure</h3>
            <button
              onClick={handleGenerateQuest}
              disabled={questGeneration}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {questGeneration ? '✨ Generating...' : '✨ Generate Quest'}
            </button>
          </div>

          {quests.length === 0 ? (
            <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📖</div>
                <h4 className="font-display font-bold text-xl text-gray-900 mb-2">
                  Begin Your Adventure!
                </h4>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Generate your first AI-powered narrative quest and watch your wellness journey
                  transform into an epic adventure through the Kingdom of Vitalia.
                </p>
                <button
                  onClick={handleGenerateQuest}
                  disabled={questGeneration}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {questGeneration ? '✨ Generating Your Quest...' : '✨ Generate First Quest'}
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  Note: AI quest generation requires Claude API configuration
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {quests
                .filter(q => q.status !== 'completed')
                .map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onAccept={handleAcceptQuest}
                    onComplete={handleCompleteQuest}
                    onCompleteObjective={handleCompleteObjective}
                  />
                ))}
              {quests.filter(q => q.status === 'completed').length > 0 && (
                <details className="card bg-gray-50 border border-gray-200">
                  <summary className="font-display font-bold cursor-pointer">
                    Completed Quests ({quests.filter(q => q.status === 'completed').length})
                  </summary>
                  <div className="space-y-4 mt-4">
                    {quests
                      .filter(q => q.status === 'completed')
                      .map((quest) => (
                        <QuestCard key={quest.id} quest={quest} />
                      ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Celebration Modal */}
        {celebration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-bounce-in">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-display font-bold text-primary mb-2">
                Quest Complete!
              </h2>
              <p className="text-xl text-gray-700 mb-4">
                "{celebration.goalName}"
              </p>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-3xl">✨</span>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      +{celebration.xpAwarded} XP
                    </p>
                    <p className="text-sm text-gray-600">
                      {celebration.statMapping} Experience
                    </p>
                  </div>
                  <span className="text-3xl">✨</span>
                </div>
                {celebration.streakBonus && (
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <p className="text-orange-600 font-bold">
                      🔥 7-Day Streak Bonus! +100 XP
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-6">
                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => {
                  const oldXP = celebration.oldChar[`${stat}Xp`] || 0;
                  const newXP = celebration.newChar[`${stat}Xp`] || 0;
                  const gained = newXP - oldXP;

                  if (gained > 0) {
                    return (
                      <div key={stat} className="flex items-center justify-between text-sm bg-gray-50 px-4 py-2 rounded-lg">
                        <span className={`stat-badge-${stat} px-2 py-1 rounded font-medium`}>
                          {stat.toUpperCase()}
                        </span>
                        <span className="text-gray-600">
                          {oldXP} → <span className="font-bold text-green-600">{newXP}</span>
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCelebration(null)}
                className="btn btn-primary w-full"
              >
                Continue Adventure
              </button>
            </div>
          </div>
        )}

        {/* Quest Consequence Modal */}
        {consequence && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-bounce-in">
              <div className="text-6xl mb-4">📜</div>
              <h2 className="text-3xl font-display font-bold text-purple-600 mb-4">
                Quest Complete!
              </h2>
              <p className="text-xl text-gray-700 font-medium mb-4">
                "{consequence.questTitle}"
              </p>

              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6 text-left">
                <p className="text-gray-700 leading-relaxed italic">
                  {consequence.narrative || 'Your actions have shaped the world around you...'}
                </p>
              </div>

              {consequence.rewards && Object.keys(consequence.rewards).length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-yellow-800 mb-2">Rewards Earned:</h3>
                  <div className="flex justify-center gap-4 text-sm">
                    {consequence.rewards.xp && (
                      <div className="flex items-center gap-1">
                        <span className="text-2xl">⚡</span>
                        <span className="font-bold text-yellow-700">+{consequence.rewards.xp} XP</span>
                      </div>
                    )}
                    {consequence.rewards.gold && (
                      <div className="flex items-center gap-1">
                        <span className="text-2xl">💰</span>
                        <span className="font-bold text-yellow-700">{consequence.rewards.gold} Gold</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => setConsequence(null)}
                className="btn btn-primary w-full"
              >
                Continue Your Journey
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
