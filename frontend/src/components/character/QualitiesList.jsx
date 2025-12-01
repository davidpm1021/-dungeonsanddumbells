import { useState } from 'react';

/**
 * QualitiesList - Character qualities/traits earned through gameplay
 * These are narrative flags that unlock content and track progression
 */

// Quality category definitions
const qualityCategories = {
  achievement: {
    icon: '🏆',
    label: 'Achievements',
    color: 'amber',
    description: 'Milestones and accomplishments'
  },
  trait: {
    icon: '✨',
    label: 'Traits',
    color: 'purple',
    description: 'Personal characteristics'
  },
  relationship: {
    icon: '🤝',
    label: 'Relationships',
    color: 'pink',
    description: 'Connections with NPCs'
  },
  skill: {
    icon: '📚',
    label: 'Skills',
    color: 'blue',
    description: 'Abilities and knowledge'
  },
  reputation: {
    icon: '👑',
    label: 'Reputation',
    color: 'yellow',
    description: 'How the world sees you'
  },
  hidden: {
    icon: '🔮',
    label: 'Mysteries',
    color: 'violet',
    description: 'Secrets uncovered'
  }
};

// Format quality key to display name
function formatQualityName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Determine category from quality key
function getQualityCategory(key) {
  const keyLower = key.toLowerCase();
  if (keyLower.includes('met_') || keyLower.includes('befriend') || keyLower.includes('ally')) {
    return 'relationship';
  }
  if (keyLower.includes('skill') || keyLower.includes('learned') || keyLower.includes('master')) {
    return 'skill';
  }
  if (keyLower.includes('reputation') || keyLower.includes('known') || keyLower.includes('fame')) {
    return 'reputation';
  }
  if (keyLower.includes('completed') || keyLower.includes('achieved') || keyLower.includes('first')) {
    return 'achievement';
  }
  if (keyLower.includes('secret') || keyLower.includes('discovered') || keyLower.includes('hidden')) {
    return 'hidden';
  }
  return 'trait';
}

export default function QualitiesList({ qualities = {}, onQualityTap }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);

  // Group qualities by category
  const groupedQualities = Object.entries(qualities).reduce((acc, [key, value]) => {
    const category = getQualityCategory(key);
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, value, name: formatQualityName(key) });
    return acc;
  }, {});

  const totalQualities = Object.keys(qualities).length;

  if (totalQualities === 0) {
    return <EmptyQualities />;
  }

  const handleQualityClick = (quality) => {
    setSelectedQuality(selectedQuality?.key === quality.key ? null : quality);
    onQualityTap?.(quality);
  };

  return (
    <div className="space-y-3">
      {/* Summary Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {totalQualities} {totalQualities === 1 ? 'Quality' : 'Qualities'} Earned
        </span>
      </div>

      {/* Category Groups */}
      {Object.entries(qualityCategories).map(([catKey, catConfig]) => {
        const catQualities = groupedQualities[catKey] || [];
        if (catQualities.length === 0) return null;

        const isExpanded = expandedCategory === catKey;

        return (
          <div
            key={catKey}
            className={`
              bg-[#1a0a2e]/40 rounded-xl border
              border-${catConfig.color}-500/20
              overflow-hidden transition-all duration-300
            `}
          >
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
              className={`
                w-full flex items-center justify-between p-4
                hover:bg-white/5 transition-colors
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{catConfig.icon}</span>
                <div className="text-left">
                  <span className="font-semibold text-white">{catConfig.label}</span>
                  <span className={`ml-2 text-xs text-${catConfig.color}-400`}>
                    ({catQualities.length})
                  </span>
                </div>
              </div>
              <span className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Quality Items */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2 animate-fade-in">
                {catQualities.map((quality) => (
                  <QualityItem
                    key={quality.key}
                    quality={quality}
                    category={catConfig}
                    isSelected={selectedQuality?.key === quality.key}
                    onClick={() => handleQualityClick(quality)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Selected Quality Detail */}
      {selectedQuality && (
        <QualityDetail
          quality={selectedQuality}
          category={qualityCategories[getQualityCategory(selectedQuality.key)]}
          onClose={() => setSelectedQuality(null)}
        />
      )}
    </div>
  );
}

/**
 * Individual quality item
 */
function QualityItem({ quality, category, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg text-left
        bg-black/20 border border-white/5
        hover:bg-white/5 hover:border-${category.color}-500/30
        ${isSelected ? `border-${category.color}-500/50 bg-${category.color}-500/10` : ''}
        transition-all duration-200
      `}
    >
      <div className={`
        w-8 h-8 rounded-lg
        bg-${category.color}-500/20
        flex items-center justify-center
        text-${category.color}-400
      `}>
        {typeof quality.value === 'number' && quality.value > 1 ? (
          <span className="text-sm font-bold">{quality.value}</span>
        ) : (
          <span>✓</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-200 block truncate">
          {quality.name}
        </span>
      </div>
      <span className="text-gray-600 text-xs">→</span>
    </button>
  );
}

/**
 * Expanded quality detail panel
 */
function QualityDetail({ quality, category, onClose }) {
  return (
    <div className={`
      bg-gradient-to-br from-[#1a0a2e]/90 to-[#0d0520]/80
      rounded-xl p-4 border-2 border-${category.color}-500/40
      animate-scale-in
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-lg
            bg-gradient-to-br from-${category.color}-600 to-${category.color}-500
            flex items-center justify-center text-2xl
            shadow-lg shadow-${category.color}-500/30
          `}>
            {category.icon}
          </div>
          <div>
            <h4 className="font-bold text-white">{quality.name}</h4>
            <p className={`text-sm text-${category.color}-400`}>{category.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-xl"
        >
          &times;
        </button>
      </div>

      {typeof quality.value === 'number' && quality.value > 1 && (
        <div className="bg-black/30 rounded-lg p-3 mb-3">
          <div className="text-xs text-gray-500 uppercase mb-1">Level</div>
          <div className={`text-2xl font-bold text-${category.color}-400`}>
            {quality.value}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-400 font-serif italic">
        This quality was earned through your adventures. It may unlock new quest options and narrative paths.
      </p>
    </div>
  );
}

/**
 * Empty state
 */
function EmptyQualities() {
  return (
    <div className="bg-[#1a0a2e]/30 rounded-xl p-6 text-center border border-dashed border-purple-500/30">
      <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl text-purple-400/50">✨</span>
      </div>
      <h4 className="font-semibold text-gray-400 mb-2">No Qualities Yet</h4>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">
        Complete quests and make choices to earn qualities that shape your character's story.
      </p>
    </div>
  );
}
