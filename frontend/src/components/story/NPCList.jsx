import { useState } from 'react';

/**
 * NPCList - Characters you've met in your journey
 * With relationship tracking and tap-to-expand history
 */

// NPC type configurations
const npcTypeConfig = {
  mentor: { icon: '🧙', color: 'purple', title: 'Mentor' },
  ally: { icon: '🤝', color: 'green', title: 'Ally' },
  rival: { icon: '⚔️', color: 'red', title: 'Rival' },
  merchant: { icon: '💰', color: 'amber', title: 'Merchant' },
  quest_giver: { icon: '📋', color: 'blue', title: 'Quest Giver' },
  companion: { icon: '🛡️', color: 'cyan', title: 'Companion' },
  mysterious: { icon: '❓', color: 'gray', title: 'Mysterious' },
  default: { icon: '👤', color: 'gray', title: 'Character' }
};

// Relationship level colors
const relationshipColors = {
  hostile: { color: 'red', label: 'Hostile', icon: '😠' },
  unfriendly: { color: 'orange', label: 'Unfriendly', icon: '😒' },
  neutral: { color: 'gray', label: 'Neutral', icon: '😐' },
  friendly: { color: 'green', label: 'Friendly', icon: '🙂' },
  trusted: { color: 'blue', label: 'Trusted', icon: '😊' },
  devoted: { color: 'purple', label: 'Devoted', icon: '💜' }
};

export default function NPCList({ npcs = {}, loading }) {
  const [expandedNpc, setExpandedNpc] = useState(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#1a0a2e]/40 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-900/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-purple-900/20 rounded w-1/3" />
                <div className="h-3 bg-purple-900/20 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const npcEntries = Object.entries(npcs);

  if (npcEntries.length === 0) {
    return <EmptyNPCList />;
  }

  return (
    <div className="space-y-3">
      {npcEntries.map(([name, data]) => (
        <NPCCard
          key={name}
          name={name}
          data={typeof data === 'string' ? { relationship: data } : data}
          isExpanded={expandedNpc === name}
          onToggle={() => setExpandedNpc(expandedNpc === name ? null : name)}
        />
      ))}
    </div>
  );
}

/**
 * Individual NPC card with expand/collapse
 */
function NPCCard({ name, data, isExpanded, onToggle }) {
  const type = npcTypeConfig[data.type] || npcTypeConfig.default;
  const relationship = relationshipColors[data.relationshipLevel] || relationshipColors.neutral;

  return (
    <button
      onClick={onToggle}
      className={`
        w-full text-left bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40
        rounded-xl border transition-all duration-200
        ${isExpanded
          ? `border-${type.color}-500/50 shadow-lg shadow-${type.color}-500/10`
          : 'border-purple-900/30 hover:border-purple-500/40'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`
            w-12 h-12 rounded-xl flex-shrink-0
            bg-gradient-to-br from-${type.color}-500/30 to-${type.color}-700/20
            flex items-center justify-center text-2xl
            border border-${type.color}-500/30
          `}>
            {type.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-white truncate">{name}</h4>
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                bg-${relationship.color}-500/20 text-${relationship.color}-400
              `}>
                {relationship.icon} {relationship.label}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{type.title}</p>

            {/* Brief description */}
            {data.relationship && !isExpanded && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                {data.relationship}
              </p>
            )}
          </div>

          {/* Expand indicator */}
          <span className={`
            text-gray-500 transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            ▼
          </span>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-purple-900/30 space-y-3 animate-fade-in">
            {/* Full relationship description */}
            {data.relationship && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Your Connection
                </span>
                <p className="text-gray-300 font-serif italic mt-1">
                  {data.relationship}
                </p>
              </div>
            )}

            {/* History/encounters */}
            {data.history && data.history.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Notable Encounters
                </span>
                <ul className="mt-2 space-y-2">
                  {data.history.map((event, idx) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-amber-500/60">•</span>
                      <span>{event}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* First met */}
            {data.firstMet && (
              <div className="text-xs text-gray-600">
                First encountered: {data.firstMet}
              </div>
            )}

            {/* Location */}
            {data.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>📍</span>
                <span>Usually found at: {data.location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Empty state when no NPCs met yet
 */
function EmptyNPCList() {
  return (
    <div className="bg-[#1a0a2e]/30 rounded-xl p-6 text-center border border-dashed border-purple-900/30">
      <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl opacity-50">👥</span>
      </div>
      <h4 className="font-semibold text-gray-400 mb-2">No Characters Met Yet</h4>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">
        Your path has yet to cross with the denizens of Ironhold.
        Adventure forth to meet allies, rivals, and mysterious figures.
      </p>
    </div>
  );
}
