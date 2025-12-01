import { useState } from 'react';

/**
 * DM Narrative Block - The storytelling heart of the Journal
 * Displays the DM's narrative for the current day in a parchment-style container
 */
export default function DMNarrativeBlock({
  narrative,
  characterName,
  currentQuest,
  isLoading = false,
  onRefresh
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate a contextual placeholder if no narrative exists
  const getPlaceholderNarrative = () => {
    if (currentQuest) {
      return `The morning sun filters through your window as you prepare for another day. ${currentQuest.title} weighs on your mind—there is still much to be done.`;
    }
    return `A new day dawns in your journey${characterName ? `, ${characterName}` : ''}. The world awaits your next move. What challenges will you face today?`;
  };

  const displayNarrative = narrative || getPlaceholderNarrative();
  const isLongNarrative = displayNarrative.length > 300;

  if (isLoading) {
    return (
      <div className="dm-narrative-block">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-amber-900/20 rounded w-3/4"></div>
          <div className="h-4 bg-amber-900/20 rounded w-full"></div>
          <div className="h-4 bg-amber-900/20 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-narrative-block group">
      {/* Decorative corner flourishes */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-700/30 rounded-tl-sm" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-700/30 rounded-tr-sm" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-700/30 rounded-bl-sm" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-700/30 rounded-br-sm" />

      {/* DM Icon */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-900/30">
          <span className="text-lg">📜</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Dungeon Master
            </span>
            {!narrative && (
              <span className="text-xs text-gray-500 italic">(awaiting your deeds)</span>
            )}
          </div>

          {/* Narrative Text */}
          <div className="relative">
            <p className={`narrative-text ${isLongNarrative && !isExpanded ? 'line-clamp-4' : ''}`}>
              {displayNarrative}
            </p>

            {/* Expand/Collapse for long narratives */}
            {isLongNarrative && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                {isExpanded ? '← Show less' : 'Read more →'}
              </button>
            )}
          </div>

          {/* Refresh button (subtle, on hover) */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-amber-500 flex items-center gap-1"
            >
              <span>↻</span>
              <span>New narrative</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
