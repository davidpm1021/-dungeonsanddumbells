import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HealthActivityLogger from '../components/HealthActivityLogger';
import StreakDisplay from '../components/StreakDisplay';
import HealthConditions from '../components/HealthConditions';
import { health } from '../services/api';

export default function Health() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('week');
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleActivityLogged = () => {
    // Refresh all components
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-yellow-400">💪 Health & Wellness</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Info Banner */}
        <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-300 mb-1">Real Health = Real Power</h2>
          <p className="text-sm text-blue-200">
            Your character's stats are directly influenced by your real-world health activities.
            Complete workouts, get quality sleep, and build streaks to unlock buffs that make your character stronger in combat!
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-yellow-400">📊 Your Progress</h2>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-gray-700 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/50 rounded p-4">
                <div className="text-3xl font-bold text-yellow-400">{stats.activitySummary?.totalActivities || 0}</div>
                <div className="text-sm text-gray-300">Activities Logged</div>
              </div>
              <div className="bg-gray-700/50 rounded p-4">
                <div className="text-3xl font-bold text-green-400">{stats.activitySummary?.totalXP || 0}</div>
                <div className="text-sm text-gray-300">Total XP Earned</div>
              </div>
              <div className="bg-gray-700/50 rounded p-4">
                <div className="text-3xl font-bold text-blue-400">{stats.activitySummary?.totalMinutes || 0}</div>
                <div className="text-sm text-gray-300">Minutes Invested</div>
              </div>
            </div>

            {/* Activity Breakdown */}
            {stats.activitySummary?.activities && stats.activitySummary.activities.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">XP by Stat:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {stats.activitySummary.activities.map((activity, idx) => (
                    <div key={idx} className="bg-gray-700/50 rounded p-2 text-center">
                      <div className="text-xs text-gray-400">{activity.primary_stat}</div>
                      <div className="text-lg font-bold text-yellow-400">{activity.total_xp || 0}</div>
                      <div className="text-xs text-gray-500">{activity.count_by_type} activities</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column: Activity Logger & Conditions */}
          <div className="space-y-6">
            <HealthActivityLogger onActivityLogged={handleActivityLogged} key={`logger-${refreshKey}`} />
            <HealthConditions autoRefresh={false} key={`conditions-${refreshKey}`} />
          </div>

          {/* Right Column: Streaks */}
          <div>
            <StreakDisplay autoRefresh={false} key={`streaks-${refreshKey}`} />
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">How Health Integration Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stat Mapping */}
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-3">📊 Stat-to-Activity Mapping</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">STR (Might)</span>
                  <span className="text-gray-300">→ Resistance training, weightlifting</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">DEX (Grace)</span>
                  <span className="text-gray-300">→ Yoga, flexibility, coordination</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">CON (Endurance)</span>
                  <span className="text-gray-300">→ Cardio, sleep, nutrition</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">INT (Clarity)</span>
                  <span className="text-gray-300">→ Learning, reading, skill development</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">WIS (Serenity)</span>
                  <span className="text-gray-300">→ Meditation, journaling, reflection</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-400 font-bold">CHA (Radiance)</span>
                  <span className="text-gray-300">→ Social activities, community engagement</span>
                </div>
              </div>
            </div>

            {/* Combat Benefits */}
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-3">⚔️ Combat Benefits</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-green-900/30 border border-green-500 rounded p-2">
                  <div className="font-semibold text-green-300">✨ Well-Rested</div>
                  <div className="text-gray-300">7+ hours sleep → +2 to all stats for 24h</div>
                </div>
                <div className="bg-green-900/30 border border-green-500 rounded p-2">
                  <div className="font-semibold text-green-300">💪 Battle-Ready</div>
                  <div className="text-gray-300">3+ workouts/week → +1 STR/CON</div>
                </div>
                <div className="bg-green-900/30 border border-green-500 rounded p-2">
                  <div className="font-semibold text-green-300">⭐ Unstoppable</div>
                  <div className="text-gray-300">5+ workouts/week → +1 all stats</div>
                </div>
                <div className="bg-red-900/30 border border-red-500 rounded p-2">
                  <div className="font-semibold text-red-300">😴 Fatigued</div>
                  <div className="text-gray-300">&lt;6 hours sleep → -2 physical stats</div>
                </div>
              </div>
            </div>
          </div>

          {/* Anti-Exploit */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">🛡️ Healthy Limits (Anti-Exploit)</h3>
            <p className="text-xs text-gray-400">
              To prevent unhealthy grinding, we use diminishing returns:
              1st activity of the day = 100% XP, 2nd = 50%, 3rd = 10%, 4th+ = 0%.
              This encourages consistent daily habits over marathon sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
