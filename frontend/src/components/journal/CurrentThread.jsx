import { useNavigate } from 'react-router-dom';

/**
 * CurrentThread - Shows the active quest in the Journal
 * Provides a quick preview with progress and objectives
 */
export default function CurrentThread({ quest, onNavigate }) {
  const navigate = useNavigate();

  if (!quest) return null;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      navigate('/quests');
    }
  };

  // Calculate objective progress
  const objectives = quest.objectives || [];
  const completedObjectives = objectives.filter(o => o.completed).length;
  const totalObjectives = objectives.length;
  const progressPercent = totalObjectives > 0
    ? (completedObjectives / totalObjectives) * 100
    : 0;

  // Get status color
  const statusColors = {
    active: { border: 'border-amber-500/40', badge: 'bg-amber-500', glow: 'shadow-amber-500/20' },
    pending: { border: 'border-blue-500/40', badge: 'bg-blue-500', glow: 'shadow-blue-500/20' },
    completed: { border: 'border-green-500/40', badge: 'bg-green-500', glow: 'shadow-green-500/20' }
  };
  const colors = statusColors[quest.status] || statusColors.active;

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left group
        bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40
        rounded-xl p-5 border ${colors.border}
        hover:border-amber-500/60 hover:shadow-lg ${colors.glow}
        transition-all duration-300
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30">
          {getQuestIcon(quest.questType)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.badge} text-white`}>
              {quest.status === 'active' ? 'Active Quest' : quest.status}
            </span>
            {quest.difficulty && (
              <span className="text-[10px] text-gray-500 uppercase">
                {quest.difficulty}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-white mb-1 group-hover:text-amber-400 transition-colors line-clamp-1">
            {quest.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-2 font-serif italic leading-relaxed">
            {quest.description || 'Continue your adventure...'}
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 self-center">
          <span className="text-gray-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all inline-block">
            &rarr;
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {totalObjectives > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs text-gray-400">
              {completedObjectives}/{totalObjectives} objectives
            </span>
          </div>
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Shimmer on progress */}
            {progressPercent > 0 && progressPercent < 100 && (
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent objective preview */}
      {objectives.length > 0 && (
        <div className="mt-3 space-y-1">
          {objectives.slice(0, 2).map((objective, idx) => (
            <div
              key={objective.id || idx}
              className={`text-xs flex items-center gap-2 ${
                objective.completed ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              <span className={objective.completed ? 'text-green-500' : 'text-gray-600'}>
                {objective.completed ? '✓' : '○'}
              </span>
              <span className={objective.completed ? 'line-through' : ''}>
                {objective.description || objective.title || `Objective ${idx + 1}`}
              </span>
            </div>
          ))}
          {objectives.length > 2 && (
            <div className="text-xs text-gray-600">
              +{objectives.length - 2} more objectives
            </div>
          )}
        </div>
      )}

      {/* Rewards preview */}
      {quest.rewards && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          {quest.rewards.xp && (
            <span className="flex items-center gap-1 text-amber-400">
              <span>✨</span>
              <span>{quest.rewards.xp} XP</span>
            </span>
          )}
          {quest.rewards.stat && (
            <span className="flex items-center gap-1 text-purple-400">
              <span>+</span>
              <span>{quest.rewards.stat}</span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/**
 * Get quest icon based on type
 */
function getQuestIcon(questType) {
  const icons = {
    main: '📜',
    side: '📋',
    daily: '⚡',
    chain: '🔗',
    exploration: '🗺️',
    combat: '⚔️',
    social: '💬',
    training: '💪'
  };
  return icons[questType] || '📜';
}

/**
 * Empty state when no quest is active
 */
export function NoActiveQuest({ onViewQuests }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onViewQuests) {
      onViewQuests();
    } else {
      navigate('/quests');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-[#1a0a2e]/30 rounded-xl p-6 border border-dashed border-purple-500/30 hover:border-purple-500/50 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-2xl text-purple-400/50 group-hover:text-purple-400 transition-colors">
          📜
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-400 group-hover:text-white transition-colors mb-1">
            No Active Quest
          </h3>
          <p className="text-sm text-gray-600 group-hover:text-gray-400 transition-colors">
            Visit the Quest Log to start a new adventure
          </p>
        </div>
        <span className="text-gray-600 group-hover:text-purple-400 transition-colors">
          &rarr;
        </span>
      </div>
    </button>
  );
}
