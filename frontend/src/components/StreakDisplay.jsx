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

const LEVEL_CONFIG = {
  bronze: {
    color: 'orange',
    icon: '🥉',
    label: 'Bronze',
    bgClass: 'from-orange-500/20 to-orange-700/10',
    borderClass: 'border-orange-500/40',
    textClass: 'text-orange-400',
    progressClass: 'bg-gradient-to-r from-orange-500 to-orange-600',
  },
  silver: {
    color: 'gray',
    icon: '🥈',
    label: 'Silver',
    bgClass: 'from-gray-400/20 to-gray-500/10',
    borderClass: 'border-gray-400/40',
    textClass: 'text-gray-300',
    progressClass: 'bg-gradient-to-r from-gray-300 to-gray-400',
  },
  gold: {
    color: 'yellow',
    icon: '🥇',
    label: 'Gold',
    bgClass: 'from-yellow-500/20 to-amber-600/10',
    borderClass: 'border-yellow-500/40',
    textClass: 'text-yellow-400',
    progressClass: 'bg-gradient-to-r from-yellow-400 to-amber-500',
  }
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
      const interval = setInterval(fetchStreaks, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-purple-900/30 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-900/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-purple-900/20 rounded w-1/3" />
                <div className="h-3 bg-purple-900/20 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl">
        {error}
      </div>
    );
  }

  if (streaks.length === 0) {
    return (
      <div className="bg-[#1a0a2e]/30 rounded-xl p-8 border border-dashed border-purple-900/30 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl mx-auto mb-4">
          🔥
        </div>
        <h3 className="font-semibold text-gray-400">No Streaks Yet</h3>
        <p className="text-sm text-gray-600 mt-2">
          Start logging activities regularly to build streaks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Streak Cards */}
      <div className="space-y-3">
        {streaks.map((streak) => (
          <StreakCard key={streak.id} streak={streak} />
        ))}
      </div>

      {/* Legend */}
      <div className="bg-[#1a0a2e]/30 rounded-xl p-4 border border-purple-900/20">
        <p className="text-xs text-gray-500 mb-3 font-medium">Graduated Success Levels:</p>
        <div className="flex items-center justify-between gap-2">
          {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
            <div key={level} className="flex items-center gap-2 text-xs">
              <span>{config.icon}</span>
              <span className={config.textClass}>{config.label}</span>
              <span className="text-gray-600">
                {level === 'bronze' ? '50%+' : level === 'silver' ? '75%+' : '100%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakCard({ streak }) {
  const emoji = ACTIVITY_EMOJIS[streak.activity_type] || '📊';
  const levelConfig = LEVEL_CONFIG[streak.current_level] || LEVEL_CONFIG.bronze;

  // Calculate progress percentage
  const targetForLevel = {
    bronze: streak.minimum_frequency,
    silver: streak.target_frequency,
    gold: streak.stretch_frequency
  };

  const target = targetForLevel[streak.current_level] || streak.target_frequency;
  const progressPercent = Math.min(100, (streak.current_streak / target) * 100);

  // Calculate next level requirements
  const nextLevelInfo = getNextLevelInfo(streak);

  return (
    <div className={`
      bg-gradient-to-br ${levelConfig.bgClass}
      rounded-xl p-4 border ${levelConfig.borderClass}
      transition-all duration-300 hover:scale-[1.01]
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center text-2xl
            bg-${levelConfig.color}-500/20 border border-${levelConfig.color}-500/30
          `}>
            {emoji}
          </div>
          <div>
            <h3 className="font-bold text-white capitalize text-lg">
              {streak.activity_type.replace('_', ' ')}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={levelConfig.textClass}>{levelConfig.icon} {levelConfig.label}</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500 capitalize">{streak.category}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${levelConfig.textClass}`}>{streak.current_streak}</div>
          <div className="text-xs text-gray-500">current</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${levelConfig.progressClass}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          <span className="text-gray-500">
            {streak.current_streak} / {target} this {streak.category}
          </span>
          <span className={levelConfig.textClass}>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Best Streak */}
      {streak.best_streak > streak.current_streak && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="text-amber-500">🏆</span>
          <span>Personal best: {streak.best_streak}</span>
          {streak.best_streak_at && (
            <span className="text-gray-600">
              ({new Date(streak.best_streak_at).toLocaleDateString()})
            </span>
          )}
        </div>
      )}

      {/* Level Progress Hint */}
      {nextLevelInfo && (
        <div className={`
          mt-2 px-3 py-2 rounded-lg text-xs
          ${nextLevelInfo.isClose
            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            : 'bg-purple-500/10 border border-purple-500/20 text-gray-400'
          }
        `}>
          {nextLevelInfo.message}
        </div>
      )}

      {/* Gold Achievement */}
      {streak.current_level === 'gold' && streak.current_streak >= streak.stretch_frequency && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-300 text-xs flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span>Gold achieved! Maximum rewards unlocked!</span>
        </div>
      )}
    </div>
  );
}

function getNextLevelInfo(streak) {
  const { current_level, current_streak, minimum_frequency, target_frequency, stretch_frequency } = streak;

  if (current_level === 'bronze') {
    const remaining = target_frequency - current_streak;
    if (remaining <= 0) return null;
    return {
      message: `${remaining} more for Silver level`,
      isClose: remaining <= 2
    };
  }

  if (current_level === 'silver') {
    const remaining = stretch_frequency - current_streak;
    if (remaining <= 0) return null;
    return {
      message: `${remaining} more for Gold level!`,
      isClose: remaining <= 2
    };
  }

  return null;
}
