import { useState } from 'react';

/**
 * NarrativeSummary - "The Story So Far" prose block
 * Styled as an ancient scroll/tome with decorative elements
 */
export default function NarrativeSummary({ summary, characterName, loading }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40 rounded-2xl p-6 border border-amber-900/30 relative overflow-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-amber-900/20 rounded w-3/4" />
          <div className="h-4 bg-amber-900/20 rounded w-full" />
          <div className="h-4 bg-amber-900/20 rounded w-5/6" />
          <div className="h-4 bg-amber-900/20 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return <EmptyStory characterName={characterName} />;
  }

  // Split long summaries for expand/collapse
  const isLong = summary.length > 400;
  const displayText = isLong && !expanded ? summary.slice(0, 400) + '...' : summary;

  return (
    <div className="bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40 rounded-2xl border border-amber-900/30 relative overflow-hidden">
      {/* Decorative corner flourishes */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-600/30 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-600/30 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-600/30 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-amber-600/30 rounded-br-2xl" />

      {/* Parchment texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-amber-900/5 pointer-events-none" />

      {/* Content */}
      <div className="relative p-6 sm:p-8">
        {/* Chapter heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <span className="w-12 h-px bg-gradient-to-r from-transparent to-amber-600/50" />
            <span className="text-xs uppercase tracking-[0.3em] text-amber-500/70 font-semibold">
              Chronicle
            </span>
            <span className="w-12 h-px bg-gradient-to-l from-transparent to-amber-600/50" />
          </div>
        </div>

        {/* Story text */}
        <p className="text-gray-200 font-serif text-lg leading-relaxed italic text-center sm:text-left">
          <span className="text-4xl font-bold text-amber-400 float-left mr-2 mt-1 leading-none">
            {displayText.charAt(0)}
          </span>
          {displayText.slice(1)}
        </p>

        {/* Expand/Collapse button */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors flex items-center gap-1 mx-auto sm:mx-0"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <span className="text-xs">▲</span>
              </>
            ) : (
              <>
                <span>Continue reading</span>
                <span className="text-xs">▼</span>
              </>
            )}
          </button>
        )}

        {/* Word count */}
        <div className="mt-6 text-center">
          <span className="text-xs text-gray-600">
            {summary.split(' ').length} words written in your saga
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when no story has been written yet
 */
function EmptyStory({ characterName }) {
  return (
    <div className="bg-gradient-to-br from-[#1a0a2e]/40 to-[#0d0520]/30 rounded-2xl p-8 border border-dashed border-amber-900/30 text-center">
      {/* Quill icon */}
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
        <span className="text-5xl opacity-60">📜</span>
      </div>

      <h3 className="text-xl font-bold text-gray-300 mb-3">
        Your Story Awaits
      </h3>

      <p className="text-gray-500 font-serif italic max-w-sm mx-auto leading-relaxed">
        {characterName ? (
          <>
            The chronicles of <span className="text-amber-400">{characterName}</span> have
            yet to be inscribed. Complete quests and challenges to write the
            first chapter of your legend.
          </>
        ) : (
          <>
            Every hero's journey begins with a single step. Complete quests
            and challenges to begin writing your legend.
          </>
        )}
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
        <span className="w-8 h-px bg-gray-700" />
        <span>Begin your adventure</span>
        <span className="w-8 h-px bg-gray-700" />
      </div>
    </div>
  );
}
