import { useState } from 'react';
import haptics from '../../utils/haptics';

/**
 * ChallengeCard - A single challenge (goal) displayed in the Journal
 * Features parchment styling, stat-specific colors, and narrative flavor
 */

// Stat color schemes
const statColors = {
  STR: {
    bg: 'from-red-900/40 to-red-800/20',
    border: 'border-red-500/30',
    borderHover: 'hover:border-red-400/50',
    text: 'text-red-400',
    badge: 'bg-gradient-to-r from-red-600 to-red-500',
    icon: 'bg-red-500/20',
    glow: 'shadow-red-500/20'
  },
  DEX: {
    bg: 'from-green-900/40 to-green-800/20',
    border: 'border-green-500/30',
    borderHover: 'hover:border-green-400/50',
    text: 'text-green-400',
    badge: 'bg-gradient-to-r from-green-600 to-green-500',
    icon: 'bg-green-500/20',
    glow: 'shadow-green-500/20'
  },
  CON: {
    bg: 'from-yellow-900/40 to-yellow-800/20',
    border: 'border-yellow-500/30',
    borderHover: 'hover:border-yellow-400/50',
    text: 'text-yellow-400',
    badge: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
    icon: 'bg-yellow-500/20',
    glow: 'shadow-yellow-500/20'
  },
  INT: {
    bg: 'from-blue-900/40 to-blue-800/20',
    border: 'border-blue-500/30',
    borderHover: 'hover:border-blue-400/50',
    text: 'text-blue-400',
    badge: 'bg-gradient-to-r from-blue-600 to-blue-500',
    icon: 'bg-blue-500/20',
    glow: 'shadow-blue-500/20'
  },
  WIS: {
    bg: 'from-purple-900/40 to-purple-800/20',
    border: 'border-purple-500/30',
    borderHover: 'hover:border-purple-400/50',
    text: 'text-purple-400',
    badge: 'bg-gradient-to-r from-purple-600 to-purple-500',
    icon: 'bg-purple-500/20',
    glow: 'shadow-purple-500/20'
  },
  CHA: {
    bg: 'from-pink-900/40 to-pink-800/20',
    border: 'border-pink-500/30',
    borderHover: 'hover:border-pink-400/50',
    text: 'text-pink-400',
    badge: 'bg-gradient-to-r from-pink-600 to-pink-500',
    icon: 'bg-pink-500/20',
    glow: 'shadow-pink-500/20'
  }
};

// Stat icons
const statIcons = {
  STR: { emoji: '💪', name: 'Might' },
  DEX: { emoji: '🏃', name: 'Grace' },
  CON: { emoji: '❤️', name: 'Endurance' },
  INT: { emoji: '📚', name: 'Clarity' },
  WIS: { emoji: '🧘', name: 'Serenity' },
  CHA: { emoji: '✨', name: 'Radiance' }
};

// Narrative flavor text per stat - multiple options for variety
const narrativeFlavors = {
  STR: [
    'The weight of the iron calls to your muscles',
    'Feel the power building within you',
    'Push past your limits, grow stronger',
    'Every lift forges your body anew',
    'The path of might awaits your dedication'
  ],
  DEX: [
    'Grace flows through fluid motion',
    'Balance and precision sharpen your reflexes',
    'Move like water, swift and sure',
    'Your agility is honed through practice',
    'The dance of nimble warriors calls you'
  ],
  CON: [
    'Endurance is the foundation of all strength',
    'Each breath builds your resilience',
    'The marathon, not the sprint, shapes warriors',
    'Rest renews; movement sustains',
    'Your stamina grows with every challenge'
  ],
  INT: [
    'Knowledge is the sharpest blade',
    'Feed your mind with new discoveries',
    'Every page turned is a step forward',
    'Understanding illuminates the path',
    'The wisdom of ages awaits your study'
  ],
  WIS: [
    'In stillness, clarity emerges',
    'The mind finds peace through practice',
    'Breathe deep; wisdom flows in silence',
    'Inner calm grants outer power',
    'Serenity is the truest strength'
  ],
  CHA: [
    'Connection with others lifts the spirit',
    'Your presence brightens those around you',
    'The bonds we forge are our greatest treasure',
    'Share your light with the world',
    'Community is the heart of adventure'
  ]
};

// Get a deterministic flavor based on challenge id + date
function getFlavorText(challenge) {
  const stat = challenge.statMapping || 'STR';
  const flavors = narrativeFlavors[stat] || narrativeFlavors.STR;
  const today = new Date().toISOString().split('T')[0];
  const hash = (challenge.id || 0) + today.split('-').reduce((a, b) => a + parseInt(b), 0);
  return flavors[hash % flavors.length];
}

export default function ChallengeCard({
  challenge,
  onComplete,
  disabled = false,
  showStreak = true
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const stat = challenge.statMapping || 'STR';
  const colors = statColors[stat] || statColors.STR;
  const statInfo = statIcons[stat] || statIcons.STR;
  const flavorText = challenge.flavorText || getFlavorText(challenge);
  const isCompleted = challenge.completedToday;

  const handleComplete = async () => {
    if (isCompleted || disabled) return;

    // Haptic feedback on button press
    haptics.mediumTap();

    setIsAnimating(true);
    try {
      await onComplete?.();
      // Success haptic feedback after completion
      haptics.success();
    } finally {
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl transition-all duration-300
        bg-gradient-to-r ${colors.bg}
        border ${colors.border} ${!isCompleted && !disabled ? colors.borderHover : ''}
        ${isCompleted ? 'opacity-70' : ''}
        ${isAnimating ? 'scale-[1.02] shadow-lg ' + colors.glow : ''}
      `}
    >
      {/* Subtle parchment texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Left: Content */}
          <div className="flex-1 min-w-0">
            {/* Header with stat badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge} text-white shadow-sm flex items-center gap-1`}>
                <span>{statInfo.emoji}</span>
                <span>{stat}</span>
              </span>
              {isCompleted && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/80 text-white flex items-center gap-1">
                  <span>✓</span>
                  <span>Complete</span>
                </span>
              )}
            </div>

            {/* Challenge name */}
            <h3 className={`font-bold text-white mb-1 ${isCompleted ? 'line-through opacity-70' : ''}`}>
              {challenge.name}
            </h3>

            {/* Narrative flavor */}
            <p className={`text-sm ${colors.text} italic font-serif leading-relaxed`}>
              "{flavorText}"
            </p>

            {/* Goal details (for quantitative goals) */}
            {challenge.goalType === 'quantitative' && challenge.targetValue && (
              <p className="text-xs text-gray-400 mt-2">
                Target: {challenge.targetValue} {challenge.unit || 'times'}
              </p>
            )}

            {/* Streak display */}
            {showStreak && challenge.currentStreak > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-orange-500">🔥</span>
                <span className="text-xs font-medium text-orange-400">
                  {challenge.currentStreak} day streak
                </span>
                {challenge.currentStreak >= 7 && (
                  <span className="text-xs text-yellow-500 ml-1">+Bonus XP!</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Complete button */}
          <button
            onClick={handleComplete}
            disabled={isCompleted || disabled}
            className={`
              flex-shrink-0 w-14 h-14 rounded-xl
              flex items-center justify-center text-2xl
              transition-all duration-300
              ${isCompleted
                ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                : disabled
                  ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
                  : `${colors.icon} ${colors.text} hover:scale-110 active:scale-95 hover:shadow-lg cursor-pointer`
              }
            `}
          >
            {isCompleted ? (
              <span className="text-green-400">✓</span>
            ) : isAnimating ? (
              <span className="animate-bounce">⚡</span>
            ) : (
              <span>⚡</span>
            )}
          </button>
        </div>
      </div>

      {/* Completion shimmer effect */}
      {isAnimating && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}
    </div>
  );
}
