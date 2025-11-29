import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';
import useQuestStore from '../stores/questStore';
import useNarrativeStore from '../stores/narrativeStore';
import { characters, goals as goalsApi, quests as questsApi, narrative as narrativeApi } from '../services/api';
import QuestCard from '../components/QuestCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { character, goals, setCharacter, setGoals } = useCharacterStore();
  const { quests, setQuests } = useQuestStore();
  const { narrativeSummary, setNarrativeSummary } = useNarrativeStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [questGeneration, setQuestGeneration] = useState(false);
  const [consequence, setConsequence] = useState(null);
  const [characterQualities, setCharacterQualities] = useState({});
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const charResponse = await characters.getMe();

      if (!charResponse.data) {
        navigate('/character/create');
        return;
      }

      setCharacter(charResponse.data);

      const goalsResponse = await goalsApi.list();
      setGoals(goalsResponse.data.goals || goalsResponse.data || []);

      try {
        const questsResponse = await questsApi.list(charResponse.data.id);
        console.log('[Dashboard] Quests response:', questsResponse.data);
        const questsData = questsResponse.data.quests || questsResponse.data || [];
        console.log('[Dashboard] Quests data:', questsData);
        setQuests(questsData);
      } catch (questErr) {
        console.log('[Dashboard] No quests yet:', questErr);
        setQuests([]);
      }

      // Fetch narrative summary
      try {
        const summaryResponse = await narrativeApi.getSummary(charResponse.data.id);
        setNarrativeSummary(summaryResponse.data.summary || null);
        console.log('[Dashboard] Narrative summary loaded');
      } catch (summaryErr) {
        console.log('[Dashboard] No narrative summary yet:', summaryErr);
        setNarrativeSummary(null);
      }

      // Fetch character qualities
      try {
        const qualitiesResponse = await characters.getQualities(charResponse.data.id);
        setCharacterQualities(qualitiesResponse.data.qualities || {});
        console.log('[Dashboard] Character qualities loaded:', qualitiesResponse.data.qualities);
      } catch (qualitiesErr) {
        console.log('[Dashboard] No qualities yet:', qualitiesErr);
        setCharacterQualities({});
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuest = async () => {
    setQuestGeneration(true);
    try {
      console.log('[Dashboard] Starting quest generation for character:', character.id);
      const response = await questsApi.generate(character.id);
      console.log('[Dashboard] Quest generation response:', response.data);

      if (response.data.success === false) {
        console.log('[Dashboard] Quest generation declined:', response.data.message);
        showNotification(response.data.message || 'No quest generated at this time.', 'info');
      } else {
        console.log('[Dashboard] Quest generated successfully, reloading data...');
        await loadDashboardData();
        console.log('[Dashboard] Dashboard data reloaded');
        showNotification('Quest generated successfully!', 'success');
      }
    } catch (err) {
      console.error('[Dashboard] Error generating quest:', err);
      console.error('[Dashboard] Error details:', err.response?.data);
      showNotification('Failed to generate quest. Please try again in a moment.', 'error');
    } finally {
      setQuestGeneration(false);
    }
  };

  const handleCompleteObjective = async (questId, objectiveId) => {
    try {
      const response = await questsApi.completeObjective(questId, objectiveId, character.id);
      const { success, rewards, questCompleted } = response.data;

      if (!success) throw new Error('Failed to complete objective');

      await loadDashboardData();

      if (questCompleted) {
        setConsequence({
          questTitle: 'Quest Complete!',
          narrative: `You earned ${rewards.xp} XP and gained +1 ${rewards.stat}!`,
          rewards
        });
      }
    } catch (err) {
      console.error('Failed to complete objective:', err);
      showNotification('Failed to complete objective. Please try again.', 'error');
    }
  };

  const handleAbandonQuest = async (questId) => {
    try {
      await questsApi.abandon(questId, character.id);
      await loadDashboardData();
      showNotification('Quest abandoned', 'info');
    } catch (err) {
      console.error('Failed to abandon quest:', err);
      showNotification('Failed to abandon quest. Please try again.', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-violet-900/20"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-t-amber-400 border-r-purple-400 border-b-blue-400 border-l-pink-400 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-t-blue-400 border-r-pink-400 border-b-amber-400 border-l-purple-400 rounded-full animate-spin animation-delay-150" style={{animationDirection: 'reverse'}}></div>
          </div>
          <p className="text-amber-200 text-xl font-light tracking-wide animate-pulse">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center px-4">
        <div className="glass-card max-w-md w-full p-8 text-center border border-red-500/30">
          <p className="text-red-300 mb-4">{error}</p>
          <button onClick={loadDashboardData} className="modern-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!character) return null;

  const activeQuests = quests.filter(q => q.status === 'active' || q.status === 'pending' || q.status === 'available');
  const completedQuests = quests.filter(q => q.status === 'completed');

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated Mesh Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-violet-900/10"></div>
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] animate-float-slow"></div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-amber-400/30 rounded-full animate-float-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Header */}
      <nav className="glass-nav sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Dumbbells & Dragons
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass-chip">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-300 font-medium">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dm')}
                className="glass-button text-sm bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 hover:border-purple-500/50"
              >
                🎲 DM Mode
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className="glass-button text-sm"
              >
                {showStats ? '✕' : '📊'} Stats
              </button>
              <button onClick={handleLogout} className="glass-button text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">

        {/* Hero Section - Character Card */}
        <div className="mb-12 hero-card group">
          <div className="glass-card p-8 md:p-10 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/50">
                    ⚔️
                  </div>
                  <div>
                    <div className="text-xs text-amber-400 mb-1 tracking-wider uppercase font-semibold">Your Journey</div>
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-amber-100 to-amber-200 bg-clip-text text-transparent">
                      {character.name}
                    </h2>
                  </div>
                </div>
                <p className="text-lg text-gray-300 font-light">
                  Level {character.level} <span className="text-purple-400">{character.characterClass}</span>
                </p>
              </div>
              <div className="stat-glow">
                <div className="text-xs text-amber-400 mb-1 tracking-wider uppercase font-semibold">Experience</div>
                <div className="text-5xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  {character.totalXp}
                </div>
              </div>
            </div>

            {/* Story Summary with Animation */}
            <div className="mt-6 pt-6 border-t border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">📖 Your Story</span>
                {characterQualities.first_quest_done === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    ✓ First Quest Complete
                  </span>
                )}
                {characterQualities.tutorial_complete === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ✓ Tutorial Done
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-amber-500/50 to-transparent rounded-full"></div>
                <p className="text-gray-200 leading-relaxed text-lg font-light italic">
                  {narrativeSummary || (activeQuests.length > 0
                    ? `You have ${activeQuests.length} ${activeQuests.length === 1 ? 'quest' : 'quests'} calling for your attention. Your journey of growth continues...`
                    : `Your journey is about to begin. Through dedication and discipline, you will unlock your true potential. Every step forward builds your strength...`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Training Rituals Section */}
        {goals.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-white">
                🏋️ Training Rituals
              </h3>
              <button
                onClick={() => navigate('/goals/setup')}
                className="glass-button text-sm"
              >
                + Add Goal
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => {
                const statColors = {
                  STR: 'from-red-500 to-orange-500',
                  DEX: 'from-green-500 to-emerald-500',
                  CON: 'from-yellow-500 to-amber-500',
                  INT: 'from-blue-500 to-cyan-500',
                  WIS: 'from-purple-500 to-violet-500',
                  CHA: 'from-pink-500 to-rose-500'
                };

                const statBg = {
                  STR: 'bg-red-500/20 border-red-500/30',
                  DEX: 'bg-green-500/20 border-green-500/30',
                  CON: 'bg-yellow-500/20 border-yellow-500/30',
                  INT: 'bg-blue-500/20 border-blue-500/30',
                  WIS: 'bg-purple-500/20 border-purple-500/30',
                  CHA: 'bg-pink-500/20 border-pink-500/30'
                };

                const isCompleted = goal.completedToday;
                const streakText = goal.currentStreak > 0 ? `🔥 ${goal.currentStreak} day streak` : '';

                return (
                  <div key={goal.id} className={`glass-card p-6 border hover:border-opacity-60 transition-all duration-300 ${statBg[goal.statMapping]} ${isCompleted ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xl font-bold text-white">{goal.name}</h4>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${statColors[goal.statMapping]} text-white shadow-lg`}>
                            {goal.statMapping}
                          </span>
                          {isCompleted && (
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/80 text-white">
                              ✓ Done
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-300 mb-3">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="capitalize">{goal.goalType}</span>
                          <span>•</span>
                          <span className="capitalize">{goal.frequency || 'daily'}</span>
                          {goal.targetValue && (
                            <>
                              <span>•</span>
                              <span>Target: {goal.targetValue}</span>
                            </>
                          )}
                          {streakText && (
                            <>
                              <span>•</span>
                              <span className="text-orange-400 font-semibold">{streakText}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const response = await goalsApi.complete(goal.id, { value: goal.targetValue || 1 });
                          await loadDashboardData();

                          // Check if this triggered any quest updates
                          const questUpdates = response.data.questUpdates || [];
                          if (questUpdates.length > 0) {
                            showNotification(`✨ Training complete! You gained ${response.data.xpAwarded} XP in ${goal.statMapping}! ${questUpdates.length} quest(s) updated!`, 'success');
                          } else {
                            showNotification(`✨ Training complete! You gained ${response.data.xpAwarded} XP in ${goal.statMapping}!`, 'success');
                          }
                        } catch (err) {
                          console.error('Failed to complete goal:', err);
                          const errorMsg = err.response?.data?.error || 'Failed to complete training. Please try again.';
                          showNotification(errorMsg, 'error');
                        }
                      }}
                      disabled={isCompleted}
                      className={`w-full modern-button group ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="text-xl group-hover:scale-110 transition-transform">
                          {isCompleted ? '✓' : '⚡'}
                        </span>
                        <span>{isCompleted ? 'Completed Today' : 'Complete Training'}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Quests Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-3xl font-bold text-white">
              {activeQuests.length > 0 ? '⚔️ Active Quests' : '📜 Begin Your Adventure'}
            </h3>
            {goals.length > 0 && (
              <button
                onClick={handleGenerateQuest}
                disabled={questGeneration}
                className="modern-button group"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl group-hover:rotate-12 transition-transform duration-300">✨</span>
                  <span>{questGeneration ? 'Generating...' : 'New Quest'}</span>
                </span>
              </button>
            )}
          </div>

          {goals.length === 0 ? (
            <div className="glass-card p-12 text-center border border-orange-500/30 hover:border-orange-500/50 transition-all duration-500">
              <div className="text-8xl mb-6 animate-bounce-slow">⚔️</div>
              <h4 className="text-3xl font-bold text-white mb-4">
                Set Your Training Goals
              </h4>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto font-light">
                Before you can begin your adventure, you must commit to your training goals.
                Set your wellness goals—these will become your quest objectives.
              </p>
              <button
                onClick={() => navigate('/goals/setup')}
                className="modern-button-large"
              >
                Set Your Goals
              </button>
            </div>
          ) : activeQuests.length === 0 ? (
            <div className="glass-card p-12 text-center border border-purple-500/30 hover:border-purple-500/50 transition-all duration-500">
              <div className="relative inline-block mb-6">
                <div className="text-8xl animate-float">📜</div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full animate-ping"></div>
              </div>
              <h4 className="text-3xl font-bold text-white mb-4">
                Generate Your First Quest
              </h4>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto font-light">
                Your adventure awaits. Generate your first quest to begin your journey through the narrative.
              </p>
              <button
                onClick={handleGenerateQuest}
                disabled={questGeneration}
                className="modern-button-large group"
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">✨</span>
                  <span>{questGeneration ? 'Summoning Your Quest...' : 'Begin Your Journey'}</span>
                </span>
              </button>
              {questGeneration && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                  <p className="text-sm text-purple-300">
                    The AI is weaving your unique story...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {activeQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onCompleteObjective={handleCompleteObjective}
                  onAbandon={handleAbandonQuest}
                  character={character}
                />
              ))}
            </div>
          )}

          {/* Quest Log Access */}
          {activeQuests.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/quest-log')}
                className="glass-button-secondary group"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <span>View Quest Log & Available Quests</span>
                  <span className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Completed Quests Summary */}
        {completedQuests.length > 0 && (
          <div className="mb-12 glass-card p-6 border border-green-500/30 hover:border-green-500/50 transition-all duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl shadow-lg shadow-green-500/50">
                ✓
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-green-200 mb-1">
                  Your Accomplishments
                </h4>
                <p className="text-green-300/80">
                  You've completed <strong className="text-green-200">{completedQuests.length}</strong> {completedQuests.length === 1 ? 'quest' : 'quests'}.
                  Your choices have shaped your story.
                </p>
              </div>
              <button
                onClick={() => navigate('/quest-log')}
                className="glass-button text-sm"
              >
                View →
              </button>
            </div>
          </div>
        )}

        {/* Stats Panel - Collapsible */}
        {showStats && (
          <div className="glass-card p-8 border border-gray-700/30 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Character Details</h3>
              <button
                onClick={() => setShowStats(false)}
                className="glass-button text-sm"
              >
                Hide ▲
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => {
                const statUpper = stat.toUpperCase();
                const value = character[stat];
                const xp = character[`${stat}Xp`];
                const xpNeeded = character[`${stat}XpNeeded`];
                const progress = xpNeeded > 0 ? (xp / xpNeeded) * 100 : 0;

                const statColors = {
                  str: 'from-red-500 to-orange-500',
                  dex: 'from-green-500 to-emerald-500',
                  con: 'from-yellow-500 to-amber-500',
                  int: 'from-blue-500 to-cyan-500',
                  wis: 'from-purple-500 to-violet-500',
                  cha: 'from-pink-500 to-rose-500'
                };

                return (
                  <div key={stat} className="stat-card group">
                    <div className="glass-card p-4 border border-gray-700/30 hover:border-amber-500/30 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r ${statColors[stat]} text-white shadow-lg`}>
                          {statUpper}
                        </span>
                        <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform duration-300">{value}</span>
                      </div>
                      <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${statColors[stat]} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${progress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        {xp}/{xpNeeded} XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Goals Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-200">Training Regimen</h4>
                <button
                  onClick={() => setShowGoals(!showGoals)}
                  className="glass-button text-xs"
                >
                  {showGoals ? 'Hide' : 'Show'} ({goals.length})
                </button>
              </div>

              {showGoals && (
                <div className="space-y-3 animate-fade-in">
                  {goals.map((goal) => (
                    <div key={goal.id} className="glass-card p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-200 font-medium">{goal.name}</span>
                        <span className={`text-xs px-3 py-1 rounded-full stat-badge-${goal.statMapping.toLowerCase()}`}>
                          {goal.statMapping}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">{goal.description}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/goals/setup')}
                    className="glass-button text-sm w-full"
                  >
                    + Add More Goals
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quest Consequence Modal */}
      {consequence && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card max-w-lg w-full p-10 text-center border border-amber-500/50 animate-scale-in">
            <div className="text-7xl mb-6 animate-bounce-slow">📜</div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-4">
              Quest Complete!
            </h2>
            <p className="text-2xl text-amber-200 font-medium mb-6">
              "{consequence.questTitle}"
            </p>

            <div className="glass-card p-6 mb-6 border border-amber-500/30">
              <p className="text-gray-200 leading-relaxed italic text-lg">
                {consequence.narrative || 'Your actions have shaped the world around you...'}
              </p>
            </div>

            {consequence.rewards && Object.keys(consequence.rewards).length > 0 && (
              <div className="glass-card p-6 mb-6 border border-amber-500/30">
                <h3 className="font-bold text-amber-300 mb-3 text-lg">Rewards Earned:</h3>
                <div className="flex justify-center gap-6">
                  {consequence.rewards.xp && (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">⚡</span>
                      <span className="font-bold text-amber-200 text-xl">+{consequence.rewards.xp} XP</span>
                    </div>
                  )}
                  {consequence.rewards.gold && (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">💰</span>
                      <span className="font-bold text-amber-200 text-xl">{consequence.rewards.gold} Gold</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setConsequence(null)}
              className="modern-button-large w-full"
            >
              Continue Your Journey
            </button>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className={`glass-card p-4 border-2 max-w-md shadow-2xl ${
            notification.type === 'success' ? 'border-green-500/50 bg-green-50/90' :
            notification.type === 'error' ? 'border-red-500/50 bg-red-50/90' :
            'border-blue-500/50 bg-blue-50/90'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {notification.type === 'success' ? '✓' : notification.type === 'error' ? '⚠' : 'ℹ'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
