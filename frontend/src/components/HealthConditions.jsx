import { useEffect, useState } from 'react';
import { health } from '../services/api';

const SOURCE_CONFIG = {
  quality_sleep: { icon: '😴', label: 'Quality Sleep' },
  sleep_deprivation: { icon: '🥱', label: 'Sleep Deprivation' },
  insufficient_sleep: { icon: '😵', label: 'Insufficient Sleep' },
  workout_consistency: { icon: '💪', label: 'Workout Consistency' },
  workout_inactivity: { icon: '🛋️', label: 'Inactivity' },
  excessive_training: { icon: '🔥', label: 'Excessive Training' },
  meditation_practice: { icon: '🧘', label: 'Meditation Practice' },
};

const STAT_COLORS = {
  STR: 'red',
  DEX: 'green',
  CON: 'yellow',
  INT: 'blue',
  WIS: 'purple',
  CHA: 'pink',
  all: 'amber',
};

export default function HealthConditions({ autoRefresh = false }) {
  const [conditions, setConditions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConditions = async () => {
    try {
      setError(null);
      const response = await health.getConditions();
      setConditions(response.data);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes('No character')) {
        setConditions({ buffs: [], debuffs: [], statModifiers: {} });
      } else {
        setError(err.response?.data?.error || 'Failed to load conditions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await health.refreshConditions();
      setConditions(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh conditions');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConditions();

    if (autoRefresh) {
      const interval = setInterval(fetchConditions, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
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

  const hasConditions = conditions && (conditions.buffs?.length > 0 || conditions.debuffs?.length > 0);

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-400 text-sm">Active Effects</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`
            text-xs px-3 py-1.5 rounded-lg transition-all
            ${isRefreshing
              ? 'bg-purple-900/20 text-gray-500'
              : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30'
            }
          `}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!hasConditions ? (
        <div className="bg-[#1a0a2e]/30 rounded-xl p-8 border border-dashed border-purple-900/30 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl mx-auto mb-4">
            ⚔️
          </div>
          <h3 className="font-semibold text-gray-400">No Active Conditions</h3>
          <p className="text-sm text-gray-600 mt-2">
            Complete health activities to unlock buffs!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Buffs */}
          {conditions.buffs && conditions.buffs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-400">✨</span>
                <span className="text-sm font-semibold text-green-400">Active Buffs</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {conditions.buffs.length}
                </span>
              </div>
              {conditions.buffs.map((condition) => (
                <ConditionCard key={condition.id} condition={condition} type="buff" />
              ))}
            </div>
          )}

          {/* Debuffs */}
          {conditions.debuffs && conditions.debuffs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-400">💀</span>
                <span className="text-sm font-semibold text-red-400">Active Debuffs</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  {conditions.debuffs.length}
                </span>
              </div>
              {conditions.debuffs.map((condition) => (
                <ConditionCard key={condition.id} condition={condition} type="debuff" />
              ))}
            </div>
          )}

          {/* Total Stat Modifiers Summary */}
          {conditions.statModifiers && Object.keys(conditions.statModifiers).some(stat => conditions.statModifiers[stat] !== 0) && (
            <div className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-purple-900/30">
              <h4 className="text-xs font-semibold text-gray-400 mb-3">Total Stat Modifiers</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(conditions.statModifiers).map(([stat, modifier]) => (
                  modifier !== 0 && (
                    <div
                      key={stat}
                      className={`
                        px-3 py-2 rounded-lg border
                        ${modifier > 0
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                        }
                      `}
                    >
                      <div className="text-xs text-gray-400">{stat}</div>
                      <div className={`text-lg font-bold ${modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {modifier > 0 ? '+' : ''}{modifier}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConditionCard({ condition, type }) {
  const sourceConfig = SOURCE_CONFIG[condition.source] || { icon: '⚡', label: condition.source };
  const isBuff = type === 'buff';

  // Calculate time remaining
  const expiresAt = condition.expires_at ? new Date(condition.expires_at) : null;
  const now = new Date();
  const hoursRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60))) : null;

  return (
    <div className={`
      rounded-xl p-4 border transition-all duration-300 hover:scale-[1.01]
      ${isBuff
        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30'
        : 'bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30'
      }
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`
            w-11 h-11 rounded-xl flex items-center justify-center text-xl
            ${isBuff ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}
          `}>
            {sourceConfig.icon}
          </div>
          <div>
            <h4 className={`font-bold ${isBuff ? 'text-green-300' : 'text-red-300'}`}>
              {condition.condition_name}
            </h4>
            <p className="text-xs text-gray-500">{sourceConfig.label}</p>
          </div>
        </div>
        {hoursRemaining !== null && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Expires in</div>
            <div className={`text-sm font-semibold ${isBuff ? 'text-green-400' : 'text-red-400'}`}>
              {hoursRemaining}h
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 italic mb-3 pl-14">
        "{condition.description}"
      </p>

      {/* Stat Modifiers */}
      {condition.stat_modifiers && (
        <div className="flex flex-wrap gap-1.5 pl-14">
          {Object.entries(condition.stat_modifiers).map(([stat, modifier]) => {
            const color = STAT_COLORS[stat] || 'gray';
            const isPositive = modifier > 0;
            return (
              <span
                key={stat}
                className={`
                  text-xs px-2.5 py-1 rounded-lg font-medium
                  ${isPositive
                    ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                    : `bg-red-500/20 text-red-400 border border-red-500/30`
                  }
                `}
              >
                {stat === 'all' ? 'All Stats' : stat}: {isPositive ? '+' : ''}{modifier}
              </span>
            );
          })}
          {condition.skill_check_modifier !== 0 && (
            <span
              className={`
                text-xs px-2.5 py-1 rounded-lg font-medium
                ${condition.skill_check_modifier > 0
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }
              `}
            >
              Skill Checks: {condition.skill_check_modifier > 0 ? '+' : ''}{condition.skill_check_modifier}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
