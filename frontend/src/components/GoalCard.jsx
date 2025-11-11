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

export default function GoalCard({ goal, onComplete }) {
  const [completing, setCompleting] = useState(false);
  const [quantValue, setQuantValue] = useState('');

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const payload = {};
      if (goal.goalType === 'quantitative') {
        payload.value = parseInt(quantValue);
      }
      await onComplete(goal.id, payload);
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
                <span className="text-orange-600 font-medium flex items-center gap-1">
                  <span>🔥</span>
                  <span>{goal.currentStreak} day streak</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {goal.completedToday ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm text-center">
          ✓ Completed today
        </div>
      ) : (
        <div className="space-y-2">
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
            </div>
          )}
          <button
            onClick={handleComplete}
            disabled={completing || !canComplete}
            className="btn btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completing ? 'Completing...' : 'Complete Goal'}
          </button>
        </div>
      )}
    </div>
  );
}
