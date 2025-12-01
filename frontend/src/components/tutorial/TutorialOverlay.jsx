import { useEffect, useRef } from 'react';
import useTutorialStore from '../../stores/tutorialStore';

/**
 * TutorialOverlay
 * Displays tutorial tips as modal overlays with optional element spotlighting.
 * Uses the tutorial store to manage tip state and progression.
 */
export default function TutorialOverlay() {
  const { activeTip, tipQueue, markTipSeen, skipPageTips } = useTutorialStore();
  const overlayRef = useRef(null);

  // Handle escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeTip) {
        markTipSeen(activeTip.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTip, markTipSeen]);

  if (!activeTip) return null;

  const remainingCount = tipQueue.length;

  // Position classes based on tip config
  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-24',
    bottom: 'items-end justify-center pb-32',
  };

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex ${positionClasses[activeTip.position] || positionClasses.center}`}
      onClick={() => markTipSeen(activeTip.id)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Tip Card */}
      <div
        className="relative max-w-md mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Parchment-style card */}
        <div className="bg-gradient-to-b from-amber-50 to-amber-100 border-2 border-amber-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header with decorative border */}
          <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 px-4 py-3">
            <h3 className="text-amber-50 font-serif text-lg font-bold text-center">
              {activeTip.title}
            </h3>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-amber-900 font-serif text-base leading-relaxed text-center">
              {activeTip.message}
            </p>
          </div>

          {/* Footer with buttons */}
          <div className="bg-amber-100/80 border-t border-amber-300 px-4 py-3 flex items-center justify-between">
            {/* Progress indicator */}
            <div className="text-amber-700 text-sm">
              {remainingCount > 0 ? (
                <span>{remainingCount} more tip{remainingCount > 1 ? 's' : ''}</span>
              ) : (
                <span className="opacity-50">Last tip</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {remainingCount > 0 && (
                <button
                  onClick={skipPageTips}
                  className="px-3 py-1.5 text-amber-700 hover:text-amber-900 text-sm font-medium transition-colors"
                >
                  Skip All
                </button>
              )}
              <button
                onClick={() => markTipSeen(activeTip.id)}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-amber-50 rounded font-medium text-sm transition-colors"
              >
                {remainingCount > 0 ? 'Next' : 'Got It!'}
              </button>
            </div>
          </div>
        </div>

        {/* Decorative scroll flourish */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-amber-600 text-2xl opacity-50">
          ~~~
        </div>
      </div>
    </div>
  );
}
