import { useEffect, useState } from 'react';
import haptics from '../../utils/haptics';

/**
 * AchievementToast - Notification popup when an achievement is unlocked
 * Displays with a celebratory animation and auto-dismisses
 */

const rarityConfig = {
  common: {
    border: 'border-gray-500',
    bg: 'bg-gray-900',
    glow: '',
    text: 'text-gray-300',
    icon: '🏅',
  },
  rare: {
    border: 'border-blue-500',
    bg: 'bg-blue-950',
    glow: 'shadow-lg shadow-blue-500/30',
    text: 'text-blue-300',
    icon: '🎖️',
  },
  epic: {
    border: 'border-purple-500',
    bg: 'bg-purple-950',
    glow: 'shadow-xl shadow-purple-500/40',
    text: 'text-purple-300',
    icon: '🏆',
  },
  legendary: {
    border: 'border-amber-500',
    bg: 'bg-gradient-to-r from-amber-950 to-orange-950',
    glow: 'shadow-2xl shadow-amber-500/50',
    text: 'text-amber-300',
    icon: '👑',
  },
};

export default function AchievementToast({ achievement, onDismiss, duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const rarity = rarityConfig[achievement?.rarity] || rarityConfig.common;

  useEffect(() => {
    if (achievement) {
      // Trigger entrance animation
      requestAnimationFrame(() => setIsVisible(true));

      // Haptic feedback for achievement unlock
      haptics.achievement();

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [achievement, duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      if (onDismiss) onDismiss();
    }, 300);
  };

  if (!achievement) return null;

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}
      `}
    >
      <div
        onClick={handleDismiss}
        className={`
          relative overflow-hidden rounded-xl border-2 ${rarity.border} ${rarity.bg} ${rarity.glow}
          cursor-pointer transform transition-transform hover:scale-[1.02]
        `}
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 animate-shine opacity-30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" />
        </div>

        {/* Particle effects for legendary/epic */}
        {(achievement.rarity === 'legendary' || achievement.rarity === 'epic') && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/60 rounded-full animate-float-particle"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl animate-bounce">{rarity.icon}</span>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Achievement Unlocked!
            </div>
          </div>

          {/* Content */}
          <div className="flex items-start gap-4">
            <div className={`
              w-14 h-14 rounded-lg flex items-center justify-center text-3xl
              bg-black/30 border ${rarity.border}
            `}>
              {rarity.icon}
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">{achievement.title}</h3>
              <p className={`text-sm ${rarity.text} mt-1`}>{achievement.description}</p>

              {/* Rewards */}
              <div className="flex gap-3 mt-3">
                {achievement.mythPoints > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                    +{achievement.mythPoints} Myth Points
                  </span>
                )}
                {achievement.xpReward > 0 && (
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                    +{achievement.xpReward} XP
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar timer */}
        <div className="h-1 bg-black/30">
          <div
            className={`h-full ${rarity.border.replace('border-', 'bg-')} transition-all ease-linear`}
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      {/* Keyframes for shrink animation */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shine > div {
          animation: shine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
