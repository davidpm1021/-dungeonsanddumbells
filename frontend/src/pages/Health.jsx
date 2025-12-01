import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HealthActivityLogger from '../components/HealthActivityLogger';
import StreakDisplay from '../components/StreakDisplay';
import HealthConditions from '../components/HealthConditions';
import WearableDataDisplay from '../components/health/WearableDataDisplay';
import AchievementToast from '../components/achievements/AchievementToast';
import BottomNav from '../components/navigation/BottomNav';
import { health } from '../services/api';
import { useTutorial } from '../hooks/useTutorial';

/**
 * Health Page - Track real-world wellness activities
 * Updated to match the dark parchment Journal aesthetic
 */
export default function Health() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('week');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('log');

  // Achievement toast queue
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [currentAchievement, setCurrentAchievement] = useState(null);

  // Trigger tutorial tips for this page
  useTutorial('health', { delay: 800 });

  const fetchStats = async () => {
    try {
      const response = await health.getStats(period);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch health stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, refreshKey]);

  // Process achievement queue - show one at a time
  useEffect(() => {
    if (!currentAchievement && achievementQueue.length > 0) {
      const [next, ...rest] = achievementQueue;
      setCurrentAchievement(next);
      setAchievementQueue(rest);
    }
  }, [currentAchievement, achievementQueue]);

  const handleAchievementDismiss = () => {
    setCurrentAchievement(null);
  };

  const handleActivityLogged = (data) => {
    setRefreshKey(prev => prev + 1);

    // Queue any newly unlocked achievements
    if (data?.newlyUnlockedAchievements?.length > 0) {
      setAchievementQueue(prev => [...prev, ...data.newlyUnlockedAchievements]);
    }
  };

  // Stat mapping info
  const statMappings = [
    { stat: 'STR', name: 'Might', activity: 'Resistance training, weightlifting', color: 'red', icon: '💪' },
    { stat: 'DEX', name: 'Grace', activity: 'Yoga, flexibility, coordination', color: 'green', icon: '🏃' },
    { stat: 'CON', name: 'Endurance', activity: 'Cardio, sleep, nutrition', color: 'yellow', icon: '🔥' },
    { stat: 'INT', name: 'Clarity', activity: 'Learning, reading, skills', color: 'blue', icon: '📚' },
    { stat: 'WIS', name: 'Serenity', activity: 'Meditation, journaling', color: 'purple', icon: '🧘' },
    { stat: 'CHA', name: 'Radiance', activity: 'Social, community', color: 'pink', icon: '✨' },
  ];

  const tabs = [
    { id: 'log', label: 'Log Activity', icon: '➕' },
    { id: 'wearables', label: 'Wearables', icon: '⌚' },
    { id: 'buffs', label: 'Active Buffs', icon: '✨' },
    { id: 'streaks', label: 'Streaks', icon: '🔥' },
    { id: 'learn', label: 'How It Works', icon: '📖' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20">
      {/* Achievement Toast */}
      <AchievementToast
        achievement={currentAchievement}
        onDismiss={handleAchievementDismiss}
      />

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
              <h1 className="text-lg font-bold text-white">Health & Wellness</h1>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-[#1a0a2e] text-white text-sm rounded-lg px-3 py-1.5 border border-amber-900/30 focus:outline-none focus:border-amber-500/50"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-[#1a0a2e]/80 to-[#0d0520]/60 rounded-2xl p-5 border border-amber-900/30 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.3),transparent_70%)]" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30">
              💪
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Real Health = Real Power</h2>
              <p className="text-sm text-gray-400 mt-1">
                Your activities directly power up your character
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatBox
              value={stats.activitySummary?.totalActivities || 0}
              label="Activities"
              icon="📊"
              color="amber"
            />
            <StatBox
              value={stats.activitySummary?.totalXP || 0}
              label="XP Earned"
              icon="⭐"
              color="green"
            />
            <StatBox
              value={stats.activitySummary?.totalMinutes || 0}
              label="Minutes"
              icon="⏱️"
              color="blue"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1.5 bg-[#1a0a2e]/40 rounded-xl border border-purple-900/30 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-2.5 px-3 rounded-lg font-medium text-sm
                transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'log' && (
            <section>
              <HealthActivityLogger onActivityLogged={handleActivityLogged} key={`logger-${refreshKey}`} />
            </section>
          )}

          {activeTab === 'wearables' && (
            <section>
              <WearableDataDisplay onDataUpdate={() => setRefreshKey(prev => prev + 1)} />
            </section>
          )}

          {activeTab === 'buffs' && (
            <section>
              <HealthConditions autoRefresh={false} key={`conditions-${refreshKey}`} />
            </section>
          )}

          {activeTab === 'streaks' && (
            <section>
              <StreakDisplay autoRefresh={false} key={`streaks-${refreshKey}`} />
            </section>
          )}

          {activeTab === 'learn' && (
            <section className="space-y-6">
              {/* Stat Mapping */}
              <div className="bg-[#1a0a2e]/40 rounded-xl p-5 border border-purple-900/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>📊</span>
                  <span>Stat-to-Activity Mapping</span>
                </h3>
                <div className="space-y-3">
                  {statMappings.map(({ stat, name, activity, color, icon }) => (
                    <div key={stat} className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center text-xl
                        bg-gradient-to-br from-${color}-500/30 to-${color}-700/20
                        border border-${color}-500/30
                      `}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-${color}-400`}>{stat}</span>
                          <span className="text-sm text-gray-500">({name})</span>
                        </div>
                        <p className="text-sm text-gray-400">{activity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combat Benefits */}
              <div className="bg-[#1a0a2e]/40 rounded-xl p-5 border border-amber-900/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>⚔️</span>
                  <span>Combat Benefits</span>
                </h3>
                <div className="space-y-3">
                  <BuffCard
                    icon="✨"
                    name="Well-Rested"
                    description="7+ hours sleep → +2 to all stats for 24h"
                    type="buff"
                  />
                  <BuffCard
                    icon="💪"
                    name="Battle-Ready"
                    description="3+ workouts/week → +1 STR/CON"
                    type="buff"
                  />
                  <BuffCard
                    icon="⭐"
                    name="Unstoppable"
                    description="5+ workouts/week → +1 all stats"
                    type="buff"
                  />
                  <BuffCard
                    icon="😴"
                    name="Fatigued"
                    description="<6 hours sleep → -2 physical stats"
                    type="debuff"
                  />
                </div>
              </div>

              {/* Anti-Exploit */}
              <div className="bg-[#1a0a2e]/40 rounded-xl p-5 border border-gray-800/50">
                <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                  <span>🛡️</span>
                  <span>Healthy Limits (Anti-Exploit)</span>
                </h3>
                <p className="text-sm text-gray-500">
                  To encourage healthy habits over grinding: 1st activity = 100% XP,
                  2nd = 50%, 3rd = 10%, 4th+ = 0%. Consistency beats marathon sessions!
                </p>
              </div>
            </section>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * Stat display box
 */
function StatBox({ value, label, icon, color }) {
  const colorClasses = {
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
  };

  return (
    <div className={`
      bg-gradient-to-br ${colorClasses[color]}
      rounded-xl p-4 border text-center
    `}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ').pop()}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

/**
 * Buff/debuff card
 */
function BuffCard({ icon, name, description, type }) {
  const isDebuff = type === 'debuff';

  return (
    <div className={`
      rounded-lg p-3 border
      ${isDebuff
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-green-500/10 border-green-500/30'
      }
    `}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className={`font-semibold ${isDebuff ? 'text-red-300' : 'text-green-300'}`}>
          {name}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-1 ml-8">{description}</p>
    </div>
  );
}
