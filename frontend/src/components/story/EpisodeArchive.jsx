import { useState } from 'react';

/**
 * EpisodeArchive - Past story episodes/chapters
 * Expandable entries showing completed story arcs
 */

export default function EpisodeArchive({ episodes = [], loading }) {
  const [expandedEpisode, setExpandedEpisode] = useState(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-[#1a0a2e]/40 rounded-xl p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-5 bg-gray-800/50 rounded w-2/3" />
              <div className="h-3 bg-gray-800/30 rounded w-full" />
              <div className="h-3 bg-gray-800/30 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!episodes || episodes.length === 0) {
    return <EmptyArchive />;
  }

  return (
    <div className="space-y-4">
      {/* Archive header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-amber-400">📚</span>
          <span>{episodes.length} chapter{episodes.length !== 1 ? 's' : ''} recorded</span>
        </div>
      </div>

      {/* Episode list */}
      <div className="space-y-3">
        {episodes.map((episode, index) => (
          <EpisodeCard
            key={episode.id || index}
            episode={episode}
            number={episodes.length - index}
            isExpanded={expandedEpisode === (episode.id || index)}
            onToggle={() => setExpandedEpisode(
              expandedEpisode === (episode.id || index) ? null : (episode.id || index)
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual episode card
 */
function EpisodeCard({ episode, number, isExpanded, onToggle }) {
  // Determine episode type/mood for styling
  const moodConfig = {
    triumph: { color: 'amber', icon: '🏆', label: 'Triumph' },
    discovery: { color: 'blue', icon: '🔍', label: 'Discovery' },
    challenge: { color: 'red', icon: '⚔️', label: 'Challenge' },
    mystery: { color: 'purple', icon: '❓', label: 'Mystery' },
    growth: { color: 'green', icon: '🌱', label: 'Growth' },
    default: { color: 'gray', icon: '📖', label: 'Chapter' }
  };

  const mood = moodConfig[episode.mood] || moodConfig.default;

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className={`
      bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40
      rounded-xl border transition-all duration-200
      ${isExpanded
        ? `border-${mood.color}-500/50 shadow-lg shadow-${mood.color}-500/10`
        : 'border-gray-800/50 hover:border-gray-700/50'
      }
    `}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-4">
          {/* Chapter number badge */}
          <div className={`
            w-12 h-12 rounded-xl flex-shrink-0
            bg-gradient-to-br from-${mood.color}-500/30 to-${mood.color}-700/20
            flex flex-col items-center justify-center
            border border-${mood.color}-500/30
          `}>
            <span className="text-lg">{mood.icon}</span>
            <span className="text-[10px] text-gray-400">#{number}</span>
          </div>

          {/* Episode info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white">
                {episode.title || `Chapter ${number}`}
              </h4>
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                bg-${mood.color}-500/20 text-${mood.color}-400
              `}>
                {mood.label}
              </span>
            </div>

            {/* Preview text */}
            {!isExpanded && episode.summary && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {episode.summary}
              </p>
            )}

            {/* Date */}
            {episode.date && (
              <p className="text-xs text-gray-600 mt-2">
                {formatDate(episode.date)}
              </p>
            )}
          </div>

          {/* Expand indicator */}
          <span className={`
            text-gray-500 transition-transform duration-200 mt-1
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="pt-4 border-t border-gray-800/50 space-y-4">
            {/* Full summary */}
            {episode.summary && (
              <div className="bg-black/20 rounded-lg p-4">
                <p className="text-gray-300 font-serif italic leading-relaxed">
                  {episode.summary}
                </p>
              </div>
            )}

            {/* Key events */}
            {episode.keyEvents && episode.keyEvents.length > 0 && (
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Key Events
                </h5>
                <ul className="space-y-2">
                  {episode.keyEvents.map((event, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-amber-500/60 mt-1">•</span>
                      <span>{event}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Characters involved */}
            {episode.characters && episode.characters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Characters:</span>
                {episode.characters.map((char, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded"
                  >
                    {char}
                  </span>
                ))}
              </div>
            )}

            {/* Locations visited */}
            {episode.locations && episode.locations.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Locations:</span>
                {episode.locations.map((loc, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded"
                  >
                    📍 {loc}
                  </span>
                ))}
              </div>
            )}

            {/* Rewards/outcomes */}
            {episode.rewards && (
              <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                <h5 className="text-xs text-amber-400 uppercase tracking-wide mb-2">
                  Chapter Rewards
                </h5>
                <div className="flex flex-wrap gap-2">
                  {episode.rewards.xp && (
                    <span className="text-sm text-amber-300">
                      +{episode.rewards.xp} XP
                    </span>
                  )}
                  {episode.rewards.stats && Object.entries(episode.rewards.stats).map(([stat, val]) => (
                    <span key={stat} className="text-sm text-green-300">
                      +{val} {stat.toUpperCase()}
                    </span>
                  ))}
                  {episode.rewards.items && episode.rewards.items.map((item, idx) => (
                    <span key={idx} className="text-sm text-purple-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            {episode.duration && (
              <p className="text-xs text-gray-600">
                This chapter spanned {episode.duration}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Empty archive state
 */
function EmptyArchive() {
  return (
    <div className="bg-[#1a0a2e]/30 rounded-xl p-8 text-center border border-dashed border-gray-800/50">
      <div className="w-20 h-20 rounded-full bg-gray-800/30 flex items-center justify-center mx-auto mb-5">
        <span className="text-4xl opacity-40">📚</span>
      </div>
      <h4 className="font-bold text-gray-400 mb-3">No Chapters Yet</h4>
      <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
        Your chronicle awaits its first chapter. Complete story arcs and major
        quests to add entries to your archive. Each significant adventure will
        be recorded here for posterity.
      </p>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-700">
        <div className="flex items-center gap-1">
          <span>🏆</span>
          <span>Triumphs</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <span>🔍</span>
          <span>Discoveries</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <span>⚔️</span>
          <span>Challenges</span>
        </div>
      </div>
    </div>
  );
}
