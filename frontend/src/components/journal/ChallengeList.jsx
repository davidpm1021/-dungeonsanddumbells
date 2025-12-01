import ChallengeCard from './ChallengeCard';

/**
 * ChallengeList - Container for Today's Challenges
 * Displays the list of goals as narrative challenges with completion tracking
 */
export default function ChallengeList({
  challenges = [],
  onComplete,
  disabled = false,
  onAddGoals
}) {
  if (challenges.length === 0) {
    return (
      <EmptyState onAddGoals={onAddGoals} />
    );
  }

  const completedCount = challenges.filter(c => c.completedToday).length;
  const totalCount = challenges.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allComplete
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400'
                }`}
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-400">
              {completedCount}/{totalCount}
            </span>
          </div>

          {allComplete && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              All Complete!
            </span>
          )}
        </div>
      )}

      {/* Challenge cards */}
      <div className="space-y-3">
        {challenges.map((challenge, index) => (
          <div
            key={challenge.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ChallengeCard
              challenge={challenge}
              onComplete={() => onComplete?.(challenge)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {/* Encouragement message when partially complete */}
      {completedCount > 0 && !allComplete && (
        <div className="text-center py-3">
          <p className="text-sm text-gray-500 italic font-serif">
            {getEncouragementMessage(completedCount, totalCount)}
          </p>
        </div>
      )}

      {/* Celebration when all complete */}
      {allComplete && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 text-center">
          <p className="text-green-300 font-serif italic">
            A day of triumph! All challenges conquered. Rest well, adventurer.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Empty state when no challenges are set
 */
function EmptyState({ onAddGoals }) {
  return (
    <div className="bg-[#1a0a2e]/40 rounded-xl p-8 text-center border border-purple-900/30">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
        <span className="text-3xl">📜</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No Challenges Set</h3>
      <p className="text-gray-400 mb-6 max-w-xs mx-auto">
        Your adventure awaits! Set some goals to begin building your legend.
      </p>
      {onAddGoals && (
        <button
          onClick={onAddGoals}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
        >
          Set Your Goals
        </button>
      )}
    </div>
  );
}

/**
 * Get encouraging message based on progress
 */
function getEncouragementMessage(completed, total) {
  const remaining = total - completed;
  const percentage = (completed / total) * 100;

  if (percentage >= 75) {
    return `Almost there! Just ${remaining} more to go.`;
  } else if (percentage >= 50) {
    return `Halfway through! Keep up the momentum.`;
  } else if (percentage >= 25) {
    return `Good start! The journey of a thousand miles...`;
  } else {
    return `Every step forward matters. You've got this!`;
  }
}
