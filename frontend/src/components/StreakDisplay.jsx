import { useEffect, useState } from 'react';
import { health } from '../services/api';

const ACTIVITY_EMOJIS = {
  strength: '💪',
  cardio: '🏃',
  flexibility: '🧘',
  yoga: '🧘',
  meditation: '🧠',
  sleep: '😴',
  learning: '📚',
  social: '👥',
  nutrition: '🥗',
};

const LEVEL_COLORS = {
  bronze: 'text-orange-400 border-orange-500',
  silver: 'text-gray-300 border-gray-400',
  gold: 'text-yellow-400 border-yellow-500'
};

const LEVEL_BACKGROUNDS = {
  bronze: 'bg-orange-900/30',
  silver: 'bg-gray-700/30',
  gold: 'bg-yellow-900/30'
};

export default function StreakDisplay({ autoRefresh = false }) {
  const [streaks, setStreaks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStreaks = async () => {
    try {
      setError(null);
      const response = await health.getStreaks();
      setStreaks(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load streaks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreaks();

    if (autoRefresh) {
      const interval = setInterval(fetchStreaks, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">🔥 Activity Streaks</h2>
        <div className="text-gray-400">Loading streaks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">🔥 Activity Streaks</h2>
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (streaks.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">🔥 Activity Streaks</h2>
        <div className="text-gray-400 text-center py-8">
          <p>No streaks yet!</p>
          <p className="text-sm mt-2">Start logging activities to build streaks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">🔥 Activity Streaks</h2>

      <div className="space-y-3">
        {streaks.map((streak) => (
          <StreakCard key={streak.id} streak={streak} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Graduated Success Levels:</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-orange-400">🥉 Bronze</span>
            <span className="text-gray-500">50%+</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-300">🥈 Silver</span>
            <span className="text-gray-500">75%+</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">🥇 Gold</span>
            <span className="text-gray-500">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreakCard({ streak }) {
  const emoji = ACTIVITY_EMOJIS[streak.activity_type] || '📊';
  const levelColor = LEVEL_COLORS[streak.current_level] || 'text-gray-400 border-gray-600';
  const levelBg = LEVEL_BACKGROUNDS[streak.current_level] || 'bg-gray-700/30';

  // Calculate progress percentage
  const targetForLevel = {
    bronze: streak.minimum_frequency,
    silver: streak.target_frequency,
    gold: streak.stretch_frequency
  };

  const target = targetForLevel[streak.current_level] || streak.target_frequency;
  const progressPercent = Math.min(100, (streak.current_streak / target) * 100);

  return (
    <div className={`p-4 rounded-lg border-2 ${levelColor} ${levelBg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="font-bold text-white capitalize">
              {streak.activity_type.replace('_', ' ')}
            </h3>
            <p className="text-xs text-gray-400 capitalize">{streak.category} | {streak.current_level} Level</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{streak.current_streak}</div>
          <div className="text-xs text-gray-400">current</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              streak.current_level === 'gold' ? 'bg-yellow-400' :
              streak.current_level === 'silver' ? 'bg-gray-300' :
              'bg-orange-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {streak.current_streak} / {target} this {streak.category}
        </p>
      </div>

      {/* Best Streak */}
      {streak.best_streak > streak.current_streak && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>🏆 Best: {streak.best_streak}</span>
          {streak.best_streak_at && (
            <span>({new Date(streak.best_streak_at).toLocaleDateString()})</span>
          )}
        </div>
      )}

      {/* Level Up Indicator */}
      {streak.current_level === 'bronze' && streak.current_streak >= streak.minimum_frequency && (
        <div className="mt-2 text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
          💡 Keep going! {streak.target_frequency - streak.current_streak} more for Silver
        </div>
      )}
      {streak.current_level === 'silver' && streak.current_streak >= streak.target_frequency && (
        <div className="mt-2 text-xs text-yellow-300 bg-yellow-900/30 px-2 py-1 rounded">
          💡 Almost there! {streak.stretch_frequency - streak.current_streak} more for Gold
        </div>
      )}
      {streak.current_level === 'gold' && (
        <div className="mt-2 text-xs text-yellow-300 bg-yellow-900/30 px-2 py-1 rounded">
          ⭐ Gold achieved! Keep it up!
        </div>
      )}
    </div>
  );
}
