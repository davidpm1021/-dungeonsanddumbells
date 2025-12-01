import { useState } from 'react';

/**
 * LocationList - Places you've discovered and visited
 * Map-style display with location details
 */

// Location type configurations
const locationTypeConfig = {
  city: { icon: '🏰', color: 'amber', label: 'City' },
  town: { icon: '🏘️', color: 'green', label: 'Town' },
  village: { icon: '🛖', color: 'emerald', label: 'Village' },
  dungeon: { icon: '🗝️', color: 'red', label: 'Dungeon' },
  forest: { icon: '🌲', color: 'green', label: 'Forest' },
  mountain: { icon: '⛰️', color: 'gray', label: 'Mountain' },
  temple: { icon: '🏛️', color: 'purple', label: 'Temple' },
  tavern: { icon: '🍺', color: 'amber', label: 'Tavern' },
  guild: { icon: '⚔️', color: 'blue', label: 'Guild' },
  shop: { icon: '🏪', color: 'cyan', label: 'Shop' },
  cave: { icon: '🕳️', color: 'gray', label: 'Cave' },
  ruins: { icon: '🏚️', color: 'orange', label: 'Ruins' },
  port: { icon: '⚓', color: 'blue', label: 'Port' },
  default: { icon: '📍', color: 'gray', label: 'Location' }
};

// Region configurations
const regionConfig = {
  the_waystation: { name: 'The Waystation', color: 'amber' },
  shattered_peaks: { name: 'Shattered Peaks', color: 'blue' },
  eastern_forests: { name: 'Eastern Forests', color: 'green' },
  southern_deserts: { name: 'Southern Deserts', color: 'orange' },
  western_coast: { name: 'Western Coast', color: 'cyan' },
  still_waters: { name: 'The Still Waters', color: 'purple' },
  ember_quarter: { name: 'The Ember Quarter', color: 'orange' },
  unknown: { name: 'Unknown Region', color: 'gray' }
};

export default function LocationList({ locations = [], loading }) {
  const [expandedLocation, setExpandedLocation] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'region'

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#1a0a2e]/40 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-blue-900/20 rounded w-1/2" />
                <div className="h-3 bg-blue-900/20 rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Normalize locations - handle both array and object formats
  const normalizedLocations = Array.isArray(locations)
    ? locations.map((loc, idx) =>
        typeof loc === 'string'
          ? { id: idx, name: loc, type: 'default' }
          : { id: idx, ...loc }
      )
    : Object.entries(locations).map(([name, data], idx) => ({
        id: idx,
        name,
        ...(typeof data === 'string' ? { description: data } : data)
      }));

  if (normalizedLocations.length === 0) {
    return <EmptyLocationList />;
  }

  // Group by region for region view
  const groupedByRegion = normalizedLocations.reduce((acc, loc) => {
    const region = loc.region || 'unknown';
    if (!acc[region]) acc[region] = [];
    acc[region].push(loc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${viewMode === 'list'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          List View
        </button>
        <button
          onClick={() => setViewMode('region')}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${viewMode === 'region'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          By Region
        </button>
      </div>

      {/* Location count */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-blue-400">🗺️</span>
        <span>{normalizedLocations.length} locations discovered</span>
      </div>

      {/* List or grouped view */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {normalizedLocations.map(location => (
            <LocationCard
              key={location.id}
              location={location}
              isExpanded={expandedLocation === location.id}
              onToggle={() => setExpandedLocation(
                expandedLocation === location.id ? null : location.id
              )}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(regionConfig).map(([regionKey, regionInfo]) => {
            const regionLocations = groupedByRegion[regionKey];
            if (!regionLocations || regionLocations.length === 0) return null;

            return (
              <div key={regionKey}>
                <h4 className={`
                  text-sm font-bold text-${regionInfo.color}-400
                  uppercase tracking-wider mb-3
                  flex items-center gap-2
                `}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {regionInfo.name}
                  <span className="text-gray-600 font-normal">
                    ({regionLocations.length})
                  </span>
                </h4>
                <div className="space-y-2 pl-4 border-l-2 border-gray-800">
                  {regionLocations.map(location => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      isExpanded={expandedLocation === location.id}
                      onToggle={() => setExpandedLocation(
                        expandedLocation === location.id ? null : location.id
                      )}
                      compact
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Individual location card
 */
function LocationCard({ location, isExpanded, onToggle, compact }) {
  const type = locationTypeConfig[location.type] || locationTypeConfig.default;

  return (
    <button
      onClick={onToggle}
      className={`
        w-full text-left bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40
        rounded-xl border transition-all duration-200
        ${isExpanded
          ? `border-${type.color}-500/50 shadow-lg shadow-${type.color}-500/10`
          : 'border-blue-900/30 hover:border-blue-500/40'
        }
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          ${compact ? 'w-8 h-8 text-lg' : 'w-10 h-10 text-xl'}
          rounded-lg flex-shrink-0
          bg-gradient-to-br from-${type.color}-500/30 to-${type.color}-700/20
          flex items-center justify-center
          border border-${type.color}-500/30
        `}>
          {type.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-bold text-white truncate ${compact ? 'text-sm' : ''}`}>
              {location.name}
            </h4>
            {location.discovered && (
              <span className="text-xs text-gray-600">
                ✓ Discovered
              </span>
            )}
          </div>
          {!compact && (
            <p className="text-xs text-gray-500">{type.label}</p>
          )}
        </div>

        {/* Expand indicator */}
        <span className={`
          text-gray-500 text-xs transition-transform duration-200
          ${isExpanded ? 'rotate-180' : ''}
        `}>
          ▼
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-900/30 space-y-2 animate-fade-in">
          {/* Description */}
          {location.description && (
            <p className="text-sm text-gray-400 font-serif italic">
              {location.description}
            </p>
          )}

          {/* Notable features */}
          {location.features && location.features.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">Notable Features:</span>
              <ul className="mt-1 flex flex-wrap gap-2">
                {location.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* NPCs present */}
          {location.npcs && location.npcs.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>👥</span>
              <span>Residents: {location.npcs.join(', ')}</span>
            </div>
          )}

          {/* Times visited */}
          {location.visits && (
            <div className="text-xs text-gray-600">
              Visited {location.visits} time{location.visits !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

/**
 * Empty state
 */
function EmptyLocationList() {
  return (
    <div className="bg-[#1a0a2e]/30 rounded-xl p-6 text-center border border-dashed border-blue-900/30">
      <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl opacity-50">🗺️</span>
      </div>
      <h4 className="font-semibold text-gray-400 mb-2">No Locations Discovered</h4>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">
        The map of Ironhold awaits your exploration.
        Complete quests to discover new locations and uncover hidden places.
      </p>
    </div>
  );
}
