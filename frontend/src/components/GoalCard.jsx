import { useState } from 'react';

const GOAL_TYPES = {
  binary: 'Yes/No',
  quantitative: 'Tracked',
  streak: 'Streak',
};

export default function GoalCard({ goal, onComplete }) {
  const [completing, setCompleting] = useState(false);
  const [quantValue, setQuantValue] = useState('');

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const payload = {};
      if (goal.type === 'quantitative') {
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
    goal.type !== 'quantitative' || (quantValue && parseInt(quantValue) > 0);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{goal.title}</h3>
            <span className={`stat-badge-${goal.stat} px-2 py-0.5 rounded text-xs font-medium`}>
              {goal.stat.toUpperCase()}
            </span>
          </div>
          {goal.description && <p className="text-sm text-gray-600 mb-2">{goal.description}</p>}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{GOAL_TYPES[goal.type]}</span>
            <span>•</span>
            <span className="capitalize">{goal.frequency}</span>
            {goal.current_streak > 0 && (
              <>
                <span>•</span>
                <span className="text-orange-600 font-medium">
                  🔥 {goal.current_streak} day streak
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {goal.completed_today ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm text-center">
          ✓ Completed today
        </div>
      ) : (
        <div className="space-y-2">
          {goal.type === 'quantitative' && (
            <div>
              <label htmlFor={`goal-${goal.id}`} className="text-xs text-gray-600 block mb-1">
                Enter value (target: {goal.target_value})
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
