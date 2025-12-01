import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wearables } from '../../services/api';

/**
 * WearableDataDisplay - Shows aggregated health data from connected wearables
 * Displays daily metrics, game conditions, and data source attribution
 */
export default function WearableDataDisplay({ onDataUpdate }) {
  const navigate = useNavigate();
  const [connectedWearables, setConnectedWearables] = useState([]);
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load connected wearables and daily data in parallel
      const [wearablesRes, dailyRes, weeklyRes] = await Promise.all([
        wearables.getConnected(),
        wearables.getDaily(selectedDate),
        wearables.getWeekly()
      ]);

      setConnectedWearables(wearablesRes.data.wearables || []);
      setDailyData(dailyRes.data);
      setWeeklyData(weeklyRes.data);
    } catch (err) {
      console.error('Failed to load wearable data:', err);
      if (err.response?.status !== 404) {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (platform) => {
    setSyncing(true);
    try {
      await wearables.sync(platform);
      await loadData();
      if (onDataUpdate) onDataUpdate();
    } catch (err) {
      setError('Sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const formatNumber = (val) => {
    if (val === null || val === undefined) return '--';
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  const formatTime = (minutes) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm mt-4">Loading wearable data...</p>
      </div>
    );
  }

  // No connected wearables
  if (connectedWearables.length === 0) {
    return (
      <div className="bg-[#1a0a2e]/40 rounded-xl p-6 border border-purple-900/30 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⌚</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Wearables Connected</h3>
        <p className="text-gray-400 text-sm mb-4">
          Connect a fitness device to automatically track your health data and power up your character!
        </p>
        <button
          onClick={() => navigate('/settings')}
          className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
        >
          Connect a Wearable
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Connected Devices Quick View */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {connectedWearables.map((w) => (
          <button
            key={w.platform}
            onClick={() => handleSync(w.platform)}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300 hover:bg-green-500/20 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>{w.platform}</span>
            {syncing && <span className="animate-spin">⟳</span>}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-[#1a0a2e]/40 rounded-lg p-3 border border-purple-900/30">
        <button
          onClick={() => {
            const date = new Date(selectedDate);
            date.setDate(date.getDate() - 1);
            setSelectedDate(date.toISOString().split('T')[0]);
          }}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-white font-medium">
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' :
             new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-500">{selectedDate}</p>
        </div>
        <button
          onClick={() => {
            const date = new Date(selectedDate);
            date.setDate(date.getDate() + 1);
            if (date <= new Date()) {
              setSelectedDate(date.toISOString().split('T')[0]);
            }
          }}
          disabled={selectedDate === new Date().toISOString().split('T')[0]}
          className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>

      {/* Daily Data Display */}
      {dailyData?.data ? (
        <div className="space-y-4">
          {/* Sleep Section */}
          <DataSection
            title="Sleep"
            icon="😴"
            color="purple"
            items={[
              { label: 'Duration', value: formatTime(dailyData.data.sleep_duration_minutes) },
              { label: 'Quality', value: dailyData.data.sleep_quality_score ? `${Math.round(dailyData.data.sleep_quality_score * 100)}%` : '--', className: getScoreColor(dailyData.data.sleep_quality_score) },
              { label: 'Deep', value: formatTime(dailyData.data.sleep_deep_minutes) },
              { label: 'REM', value: formatTime(dailyData.data.sleep_rem_minutes) },
            ]}
          />

          {/* Activity Section */}
          <DataSection
            title="Activity"
            icon="🏃"
            color="green"
            items={[
              { label: 'Steps', value: formatNumber(dailyData.data.steps) },
              { label: 'Active', value: formatTime(dailyData.data.active_minutes) },
              { label: 'Calories', value: dailyData.data.calories_burned ? `${formatNumber(dailyData.data.calories_burned)} kcal` : '--' },
            ]}
          />

          {/* Heart Section */}
          <DataSection
            title="Heart"
            icon="❤️"
            color="red"
            items={[
              { label: 'Resting HR', value: dailyData.data.resting_heart_rate ? `${dailyData.data.resting_heart_rate} bpm` : '--' },
              { label: 'Avg HR', value: dailyData.data.avg_heart_rate ? `${dailyData.data.avg_heart_rate} bpm` : '--' },
              { label: 'HRV', value: dailyData.data.hrv_avg ? `${Math.round(dailyData.data.hrv_avg)} ms` : '--' },
            ]}
          />

          {/* Recovery Section (if available) */}
          {(dailyData.data.recovery_score !== null || dailyData.data.readiness_score !== null) && (
            <DataSection
              title="Recovery"
              icon="✨"
              color="amber"
              items={[
                { label: 'Recovery', value: dailyData.data.recovery_score ? `${Math.round(dailyData.data.recovery_score * 100)}%` : '--', className: getScoreColor(dailyData.data.recovery_score) },
                { label: 'Readiness', value: dailyData.data.readiness_score ? `${Math.round(dailyData.data.readiness_score * 100)}%` : '--', className: getScoreColor(dailyData.data.readiness_score) },
                { label: 'Stress', value: dailyData.data.stress_score !== null ? `${Math.round(dailyData.data.stress_score * 100)}%` : '--' },
              ]}
            />
          )}

          {/* Game Conditions */}
          {dailyData.gameConditions && dailyData.gameConditions.length > 0 && (
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/30">
              <h4 className="text-sm font-medium text-amber-200 mb-3 flex items-center gap-2">
                <span>🎮</span>
                <span>Active Game Effects</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {dailyData.gameConditions.map((condition, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      condition.type === 'buff'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {condition.name}: {condition.effect}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data Sources */}
          {dailyData.sources && dailyData.sources.length > 0 && (
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <span>Data from:</span>
              {dailyData.sources.map((src, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-800/50 rounded">{src}</span>
              ))}
              {dailyData.confidence && (
                <span className="ml-auto">Confidence: {Math.round(dailyData.confidence * 100)}%</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#1a0a2e]/40 rounded-xl p-6 border border-purple-900/30 text-center">
          <span className="text-4xl mb-3 block">📊</span>
          <p className="text-gray-400">No data for this date</p>
          <p className="text-xs text-gray-600 mt-2">Try syncing your wearable or check another date</p>
        </div>
      )}

      {/* Weekly Averages */}
      {weeklyData?.averages && (
        <div className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-purple-900/30">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <span>📈</span>
            <span>Weekly Averages ({weeklyData.averages.daysTracked || 0} days tracked)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <MiniStat icon="😴" label="Sleep" value={formatTime(weeklyData.averages.sleepMinutes)} />
            <MiniStat icon="👟" label="Steps" value={formatNumber(weeklyData.averages.steps)} />
            <MiniStat icon="❤️" label="RHR" value={weeklyData.averages.restingHeartRate ? `${weeklyData.averages.restingHeartRate}` : '--'} />
            <MiniStat icon="🏋️" label="Workouts" value={weeklyData.averages.totalWorkouts || 0} />
          </div>
        </div>
      )}

      {/* Settings Link */}
      <div className="text-center pt-2">
        <button
          onClick={() => navigate('/settings')}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Manage Wearable Connections →
        </button>
      </div>
    </div>
  );
}

/**
 * Data section component
 */
function DataSection({ title, icon, color, items }) {
  const colorClasses = {
    purple: 'from-purple-500/10 to-purple-700/10 border-purple-500/30',
    green: 'from-green-500/10 to-green-700/10 border-green-500/30',
    red: 'from-red-500/10 to-red-700/10 border-red-500/30',
    amber: 'from-amber-500/10 to-amber-700/10 border-amber-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border`}>
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div className={`text-lg font-bold ${item.className || 'text-white'}`}>{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Mini stat for weekly averages
 */
function MiniStat({ icon, label, value }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-2">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-white font-semibold text-sm">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
