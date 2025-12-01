import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { health } from '../../services/api';

/**
 * AutoTrackedData - Displays auto-tracked health data from wearables
 * Shows in Journal view when wearable data is synced
 */
export default function AutoTrackedData({ characterId, date = new Date() }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadAutoTrackedData();
  }, [characterId, date]);

  const loadAutoTrackedData = async () => {
    setLoading(true);
    try {
      // For now, we'll use the health stats endpoint
      // In Sprint 7 Week 2, this will connect to actual wearable data
      const response = await health.getStats('day');
      setData(response.data?.activitySummary || null);
    } catch (err) {
      console.log('[AutoTracked] No data available');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // If no wearable connected or no data, show connection prompt
  if (!loading && !data) {
    return <WearablePrompt />;
  }

  if (loading) {
    return (
      <div className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-cyan-900/30 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-900/30" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-cyan-900/20 rounded w-1/3" />
            <div className="h-3 bg-cyan-900/20 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const hasActivity = data && (data.totalActivities > 0 || data.totalMinutes > 0);

  if (!hasActivity) {
    return <WearablePrompt />;
  }

  return (
    <div className="bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40 rounded-xl border border-cyan-900/30 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/20 flex items-center justify-center text-xl border border-cyan-500/30">
            ⌚
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white">Auto-Tracked</h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                Today
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {data.totalActivities} activities • {data.totalMinutes} min • {data.totalXP} XP
            </p>
          </div>
          <span className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="pt-3 border-t border-cyan-900/30">
            {/* Activity breakdown */}
            {data.activities && data.activities.length > 0 ? (
              <div className="space-y-2">
                {data.activities.map((activity, idx) => (
                  <ActivityRow key={idx} activity={activity} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-2">
                Activity details loading...
              </p>
            )}

            {/* Sync status */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
              <span>Last synced: Just now</span>
              <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual activity row
 */
function ActivityRow({ activity }) {
  const statColors = {
    STR: 'red',
    DEX: 'green',
    CON: 'yellow',
    INT: 'blue',
    WIS: 'purple',
    CHA: 'pink',
  };

  const stat = activity.primary_stat || 'CON';
  const color = statColors[stat] || 'gray';

  return (
    <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg">
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center text-sm
        bg-${color}-500/20 border border-${color}-500/30
      `}>
        {stat.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {activity.activity_type || 'Activity'}
        </p>
        <p className="text-xs text-gray-500">
          {activity.count_by_type || 1} time{activity.count_by_type !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold text-${color}-400`}>
          +{activity.total_xp || 0} XP
        </p>
      </div>
    </div>
  );
}

/**
 * Prompt to connect wearable when no data available
 */
function WearablePrompt() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#1a0a2e]/30 rounded-xl p-4 border border-dashed border-cyan-900/30">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-xl">
          ⌚
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-400 text-sm">Connect a Wearable</h4>
          <p className="text-xs text-gray-600 mt-1">
            Auto-track sleep, steps, and workouts from your fitness device.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => navigate('/settings')}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Connect Device
            </button>
            <div className="flex gap-1">
              {['💍', '🍎', '⌚', '🤖', '📱'].map((icon, i) => (
                <span key={i} className="text-sm opacity-60">{icon}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
