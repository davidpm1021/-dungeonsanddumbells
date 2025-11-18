import { useEffect, useState } from 'react';
import { health } from '../services/api';

const CONDITION_EMOJIS = {
  buff: '✨',
  debuff: '💀',
  neutral: '⚡'
};

const SOURCE_ICONS = {
  quality_sleep: '😴',
  sleep_deprivation: '🥱',
  insufficient_sleep: '😵',
  workout_consistency: '💪',
  workout_inactivity: '🛋️',
  excessive_training: '🔥'
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
      // If no character, don't show error
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
      const interval = setInterval(fetchConditions, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚔️ Active Conditions</h2>
        <div className="text-gray-400">Loading conditions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚔️ Active Conditions</h2>
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const hasConditions = conditions && (conditions.buffs?.length > 0 || conditions.debuffs?.length > 0);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-yellow-400">⚔️ Active Conditions</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-1 rounded transition-colors"
        >
          {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {!hasConditions ? (
        <div className="text-gray-400 text-center py-8">
          <p>No active conditions</p>
          <p className="text-sm mt-2">Complete health activities to unlock buffs!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Buffs */}
          {conditions.buffs && conditions.buffs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">✨ Buffs</h3>
              <div className="space-y-2">
                {conditions.buffs.map((condition) => (
                  <ConditionCard key={condition.id} condition={condition} type="buff" />
                ))}
              </div>
            </div>
          )}

          {/* Debuffs */}
          {conditions.debuffs && conditions.debuffs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">💀 Debuffs</h3>
              <div className="space-y-2">
                {conditions.debuffs.map((condition) => (
                  <ConditionCard key={condition.id} condition={condition} type="debuff" />
                ))}
              </div>
            </div>
          )}

          {/* Total Stat Modifiers */}
          {conditions.statModifiers && Object.keys(conditions.statModifiers).some(stat => conditions.statModifiers[stat] !== 0) && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Total Stat Modifiers:</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(conditions.statModifiers).map(([stat, modifier]) => (
                  modifier !== 0 && (
                    <div key={stat} className={`px-3 py-2 rounded ${modifier > 0 ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
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

      {/* Info Box */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded border border-gray-600 text-xs text-gray-300">
        <p className="font-semibold mb-1">How Conditions Work:</p>
        <ul className="space-y-1 text-gray-400">
          <li>• Sleep 7+ hours → <span className="text-green-400">Well-Rested</span> (+2 all stats)</li>
          <li>• Sleep &lt;6 hours → <span className="text-red-400">Fatigued</span> (-2 physical stats)</li>
          <li>• 3+ workouts/week → <span className="text-green-400">Battle-Ready</span> (+1 STR/CON)</li>
          <li>• 5+ workouts/week → <span className="text-green-400">Unstoppable</span> (+1 all stats)</li>
        </ul>
      </div>
    </div>
  );
}

function ConditionCard({ condition, type }) {
  const sourceIcon = SOURCE_ICONS[condition.source] || '⚡';
  const typeColor = type === 'buff' ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20';

  // Calculate time remaining
  const expiresAt = condition.expires_at ? new Date(condition.expires_at) : null;
  const now = new Date();
  const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60))) : null;

  return (
    <div className={`p-3 rounded border-2 ${typeColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{sourceIcon}</span>
          <div>
            <h4 className="font-bold text-white">{condition.condition_name}</h4>
            <p className="text-xs text-gray-400 capitalize">{condition.source.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {timeRemaining !== null && (
          <div className="text-right">
            <div className="text-xs text-gray-400">Expires in</div>
            <div className="text-sm font-semibold text-gray-300">{timeRemaining}h</div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-300 mb-2 italic">"{condition.description}"</p>

      {/* Stat Modifiers */}
      {condition.stat_modifiers && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(condition.stat_modifiers).map(([stat, modifier]) => (
            <span
              key={stat}
              className={`text-xs px-2 py-1 rounded ${
                modifier > 0 ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'
              }`}
            >
              {stat === 'all' ? 'All Stats' : stat}: {modifier > 0 ? '+' : ''}{modifier}
            </span>
          ))}
          {condition.skill_check_modifier !== 0 && (
            <span
              className={`text-xs px-2 py-1 rounded ${
                condition.skill_check_modifier > 0 ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'
              }`}
            >
              Skill Checks: {condition.skill_check_modifier > 0 ? '+' : ''}{condition.skill_check_modifier}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
