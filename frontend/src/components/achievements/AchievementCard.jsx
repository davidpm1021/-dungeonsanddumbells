import { useState } from 'react';

/**
 * AchievementCard - Display individual achievements with unlock animations
 *
 * Rarity colors:
 * - common: gray
 * - rare: blue
 * - epic: purple
 * - legendary: gold/amber
 */

const rarityConfig = {
  common: {
    border: 'border-gray-500/30',
    bg: 'bg-gray-500/10',
    glow: '',
    text: 'text-gray-400',
    label: 'Common',
    icon: '🏅',
  },
  rare: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    glow: 'shadow-lg shadow-blue-500/20',
    text: 'text-blue-400',
    label: 'Rare',
    icon: '🎖️',
  },
  epic: {
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/10',
    glow: 'shadow-lg shadow-purple-500/30',
    text: 'text-purple-400',
    label: 'Epic',
    icon: '🏆',
  },
  legendary: {
    border: 'border-amber-500/60',
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
    glow: 'shadow-xl shadow-amber-500/40',
    text: 'text-amber-400',
    label: 'Legendary',
    icon: '👑',
  },
};

export default function AchievementCard({ achievement, isUnlocked = false, progress = null, onView }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);

  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;

  // Calculate progress percentage if available
  const progressPercent = progress?.current && progress?.target
    ? Math.min((progress.current / progress.target) * 100, 100)
    : null;

  const handleClick = () => {
    if (onView) {
      onView(achievement);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden
        ${rarity.border} ${rarity.bg}
        ${isUnlocked ? rarity.glow : 'opacity-60 grayscale-[50%]'}
        ${isExpanded ? 'scale-105 z-10' : 'hover:scale-[1.02]'}
      `}
    >
      {/* Unlock animation overlay */}
      {showUnlockAnimation && (
        <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`
            w-12 h-12 rounded-lg flex items-center justify-center text-2xl
            ${isUnlocked ? rarity.bg : 'bg-gray-700/50'}
            border ${rarity.border}
          `}>
            {isUnlocked ? rarity.icon : '🔒'}
          </div>

          {/* Title & Rarity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold truncate ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                {achievement.title}
              </h3>
              {isUnlocked && achievement.mythPoints > 0 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                  +{achievement.mythPoints} MP
                </span>
              )}
            </div>
            <span className={`text-xs font-medium ${rarity.text}`}>
              {rarity.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className={`mt-3 text-sm ${isUnlocked ? 'text-gray-300' : 'text-gray-500'}`}>
          {achievement.description}
        </p>

        {/* Progress bar (for locked achievements) */}
        {!isUnlocked && progressPercent !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{progress.current} / {progress.target}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Rewards section (expanded or unlocked) */}
        {(isExpanded || isUnlocked) && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex flex-wrap gap-2 text-xs">
              {achievement.mythPoints > 0 && (
                <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                  {achievement.mythPoints} Myth Points
                </span>
              )}
              {achievement.xpReward > 0 && (
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
                  +{achievement.xpReward} XP
                </span>
              )}
              {achievement.titleUnlocked && (
                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                  Title: "{achievement.titleUnlocked}"
                </span>
              )}
            </div>

            {/* Earned date */}
            {isUnlocked && achievement.earnedAt && (
              <p className="mt-2 text-xs text-gray-500">
                Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Locked overlay */}
      {!isUnlocked && (
        <div className="absolute top-2 right-2">
          <span className="text-gray-600 text-lg">🔒</span>
        </div>
      )}
    </div>
  );
}
