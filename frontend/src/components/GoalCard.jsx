import { useState } from 'react';

const GOAL_TYPE_INFO = {
  binary: { label: 'Complete/Skip', icon: '✓', color: 'text-blue-600' },
  quantitative: { label: 'Track Progress', icon: '📊', color: 'text-purple-600' },
  streak: { label: 'Daily Streak', icon: '🔥', color: 'text-orange-600' },
};

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// Graduated success tier configuration
const GRADUATED_SUCCESS = {
  gold: { emoji: '🥇', label: 'Gold', color: 'text-amber-500', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50', threshold: 100 },
  silver: { emoji: '🥈', label: 'Silver', color: 'text-gray-400', bgColor: 'bg-gray-400/20', borderColor: 'border-gray-400/50', threshold: 75 },
  bronze: { emoji: '🥉', label: 'Bronze', color: 'text-amber-700', bgColor: 'bg-amber-700/20', borderColor: 'border-amber-700/50', threshold: 50 },
  incomplete: { emoji: '⚠️', label: 'Partial', color: 'text-gray-500', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/50', threshold: 0 },
};

/**
 * Calculate the graduated success level based on completion percentage
 */
function getGraduatedSuccessLevel(value, targetValue) {
  if (!targetValue || targetValue === 0) return 'gold';
  const percentage = (value / targetValue) * 100;

  if (percentage >= 100) return 'gold';
  if (percentage >= 75) return 'silver';
  if (percentage >= 50) return 'bronze';
  return 'incomplete';
}

/**
 * Progress bar with graduated success tier markers
 */
function GraduatedProgressBar({ value, targetValue }) {
  const percentage = Math.min(100, (value / targetValue) * 100);
  const level = getGraduatedSuccessLevel(value, targetValue);
  const tierInfo = GRADUATED_SUCCESS[level];

  return (
    <div className="space-y-1">
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        {/* Tier markers */}
        <div className="absolute top-0 left-[50%] h-full w-0.5 bg-amber-700/40 z-10" title="Bronze (50%)" />
        <div className="absolute top-0 left-[75%] h-full w-0.5 bg-gray-400/40 z-10" title="Silver (75%)" />

        {/* Progress fill */}
        <div
          className={`h-full transition-all duration-300 ${
            level === 'gold' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
            level === 'silver' ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
            level === 'bronze' ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
            'bg-gray-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{value}/{targetValue}</span>
        <span className={`font-medium ${tierInfo.color}`}>
          {tierInfo.emoji} {tierInfo.label} ({percentage.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

/**
 * Streak badge with graduated success level
 */
function StreakBadge({ streak, level = 'bronze' }) {
  if (!streak || streak <= 0) return null;

  // Calculate streak level based on days
  let streakLevel = 'bronze';
  if (streak >= 30) streakLevel = 'gold';
  else if (streak >= 7) streakLevel = 'silver';

  const tierInfo = GRADUATED_SUCCESS[level] || GRADUATED_SUCCESS[streakLevel];

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${tierInfo.bgColor} border ${tierInfo.borderColor}`}>
      <span className="text-orange-500">🔥</span>
      <span className={`text-xs font-medium ${tierInfo.color}`}>{streak} day{streak > 1 ? 's' : ''}</span>
      <span className="text-xs">{tierInfo.emoji}</span>
    </span>
  );
}

/**
 * Completion result display with graduated success feedback
 */
function CompletionResult({ result }) {
  if (!result?.graduatedSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm text-center">
        ✓ Completed today
      </div>
    );
  }

  const { level, percentage } = result.graduatedSuccess;
  const tierInfo = GRADUATED_SUCCESS[level];

  return (
    <div className={`${tierInfo.bgColor} border ${tierInfo.borderColor} px-4 py-3 rounded-lg`}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">{tierInfo.emoji}</span>
        <div className="text-center">
          <div className={`font-bold ${tierInfo.color}`}>
            {tierInfo.label} Completion!
          </div>
          <div className="text-xs text-gray-600">
            {percentage?.toFixed(0)}% • +{result.xpAwarded} XP
          </div>
        </div>
      </div>
      {result.streakBonus && (
        <div className="mt-2 text-center text-xs text-orange-600 font-medium">
          🔥 7-Day Streak Bonus!
        </div>
      )}
    </div>
  );
}

export default function GoalCard({ goal, onComplete, lastCompletionResult }) {
  const [completing, setCompleting] = useState(false);
  const [quantValue, setQuantValue] = useState('');
  const [completionResult, setCompletionResult] = useState(lastCompletionResult);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const payload = {};
      if (goal.goalType === 'quantitative') {
        payload.value = parseInt(quantValue);
      }
      const result = await onComplete(goal.id, payload);
      setCompletionResult(result);
      setQuantValue('');
    } catch (err) {
      console.error('Failed to complete goal:', err);
    } finally {
      setCompleting(false);
    }
  };

  const canComplete =
    goal.goalType !== 'quantitative' || (quantValue && parseInt(quantValue) > 0);

  const typeInfo = GOAL_TYPE_INFO[goal.goalType] || GOAL_TYPE_INFO.binary;

  // Show preview of what tier they'll achieve for quantitative goals
  const previewLevel = goal.goalType === 'quantitative' && quantValue
    ? getGraduatedSuccessLevel(parseInt(quantValue), goal.targetValue)
    : null;
  const previewTier = previewLevel ? GRADUATED_SUCCESS[previewLevel] : null;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{goal.name}</h3>
            <span className={`stat-badge-${goal.statMapping?.toLowerCase()} px-2 py-0.5 rounded text-xs font-medium`}>
              {goal.statMapping}
            </span>
          </div>

          {goal.description && <p className="text-sm text-gray-600 mb-2">{goal.description}</p>}

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className={`${typeInfo.color} font-medium flex items-center gap-1`}>
              <span>{typeInfo.icon}</span>
              <span>{typeInfo.label}</span>
            </span>
            {goal.goalType === 'quantitative' && goal.targetValue && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium">
                  Target: {goal.targetValue.toLocaleString()}
                </span>
              </>
            )}
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 capitalize">{FREQUENCY_LABELS[goal.frequency] || goal.frequency}</span>
            {goal.currentStreak > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <StreakBadge streak={goal.currentStreak} level={goal.streakLevel} />
              </>
            )}
          </div>
        </div>
      </div>

      {goal.completedToday || completionResult ? (
        <CompletionResult result={completionResult} />
      ) : (
        <div className="space-y-3">
          {goal.goalType === 'quantitative' && (
            <div>
              <label htmlFor={`goal-${goal.id}`} className="text-xs text-gray-600 block mb-1">
                Enter value (target: {goal.targetValue})
              </label>
              <input
                type="number"
                id={`goal-${goal.id}`}
                value={quantValue}
                onChange={(e) => setQuantValue(e.target.value)}
                className="input text-sm"
                placeholder="0"
                min="0"
              />

              {/* Preview progress bar */}
              {quantValue && parseInt(quantValue) > 0 && (
                <div className="mt-2">
                  <GraduatedProgressBar value={parseInt(quantValue)} targetValue={goal.targetValue} />
                </div>
              )}

              {/* Tier thresholds hint */}
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>🥉 {Math.ceil(goal.targetValue * 0.5)}+</span>
                <span>🥈 {Math.ceil(goal.targetValue * 0.75)}+</span>
                <span>🥇 {goal.targetValue}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={completing || !canComplete}
            className={`btn w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              previewTier
                ? `${previewTier.bgColor} ${previewTier.color} border ${previewTier.borderColor} hover:opacity-80`
                : 'btn-primary'
            }`}
          >
            {completing ? 'Completing...' : (
              <>
                Complete Goal
                {previewTier && <span className="ml-2">{previewTier.emoji}</span>}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
