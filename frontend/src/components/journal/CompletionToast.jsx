import { useEffect, useState } from 'react';

/**
 * CompletionToast - Narrative feedback after completing a challenge
 * Shows XP gain, stat progression, and narrative message
 */
export default function CompletionToast({
  feedback,
  onDismiss,
  autoDismissMs = 4000
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (feedback) {
      // Animate in
      setTimeout(() => setIsVisible(true), 50);

      // Auto dismiss
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [feedback, autoDismissMs]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onDismiss?.();
    }, 300);
  };

  if (!feedback) return null;

  const statColors = {
    STR: 'from-red-600 to-orange-600',
    DEX: 'from-green-600 to-emerald-600',
    CON: 'from-yellow-600 to-amber-600',
    INT: 'from-blue-600 to-cyan-600',
    WIS: 'from-purple-600 to-violet-600',
    CHA: 'from-pink-600 to-rose-600'
  };

  const glowColors = {
    STR: 'shadow-red-500/50',
    DEX: 'shadow-green-500/50',
    CON: 'shadow-yellow-500/50',
    INT: 'shadow-blue-500/50',
    WIS: 'shadow-purple-500/50',
    CHA: 'shadow-pink-500/50'
  };

  const statGradient = statColors[feedback.stat] || statColors.STR;
  const glow = glowColors[feedback.stat] || glowColors.STR;

  return (
    <div
      className={`
        fixed bottom-24 left-4 right-4 z-50
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      onClick={handleDismiss}
    >
      <div className={`
        max-w-md mx-auto overflow-hidden rounded-xl
        bg-gradient-to-r ${statGradient}
        shadow-2xl ${glow}
        border border-white/20
      `}>
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="relative p-4">
          <div className="flex items-center gap-4">
            {/* XP Badge */}
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-black/30 flex items-center justify-center border-2 border-white/30">
                <div className="text-center">
                  <div className="text-xs text-white/80">+</div>
                  <div className="text-lg font-bold text-white">{feedback.xp}</div>
                  <div className="text-[10px] text-white/70">XP</div>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-serif italic text-sm leading-relaxed">
                {feedback.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/70 uppercase tracking-wider">
                  {feedback.stat}
                </span>
                {feedback.streakBonus && (
                  <span className="text-xs bg-orange-500 px-2 py-0.5 rounded-full text-white font-bold">
                    +Streak Bonus!
                  </span>
                )}
              </div>
            </div>

            {/* Dismiss hint */}
            <div className="flex-shrink-0 text-white/50">
              <span className="text-xs">tap to dismiss</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
