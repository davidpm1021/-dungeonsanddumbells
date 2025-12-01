import { useState } from 'react';

/**
 * StatBlock - D&D-style ability score display
 * Classic hexagonal/pentagon design with XP progress on tap
 */

const statConfig = {
  str: {
    name: 'Strength',
    abbr: 'STR',
    foundation: 'Iron',
    color: 'red',
    icon: '💪',
    gradient: 'from-red-600 to-orange-600',
    border: 'border-red-500',
    bg: 'bg-red-500',
    text: 'text-red-400',
    shadow: 'shadow-red-500/30',
    description: 'Physical power and martial prowess'
  },
  dex: {
    name: 'Dexterity',
    abbr: 'DEX',
    foundation: 'Wind',
    color: 'green',
    icon: '🏃',
    gradient: 'from-green-600 to-emerald-600',
    border: 'border-green-500',
    bg: 'bg-green-500',
    text: 'text-green-400',
    shadow: 'shadow-green-500/30',
    description: 'Agility, reflexes, and balance'
  },
  con: {
    name: 'Constitution',
    abbr: 'CON',
    foundation: 'Stone',
    color: 'yellow',
    icon: '❤️',
    gradient: 'from-yellow-600 to-amber-600',
    border: 'border-yellow-500',
    bg: 'bg-yellow-500',
    text: 'text-yellow-400',
    shadow: 'shadow-yellow-500/30',
    description: 'Health, stamina, and vitality'
  },
  int: {
    name: 'Intelligence',
    abbr: 'INT',
    foundation: 'Spark',
    color: 'blue',
    icon: '📚',
    gradient: 'from-blue-600 to-cyan-600',
    border: 'border-blue-500',
    bg: 'bg-blue-500',
    text: 'text-blue-400',
    shadow: 'shadow-blue-500/30',
    description: 'Mental acuity and knowledge'
  },
  wis: {
    name: 'Wisdom',
    abbr: 'WIS',
    foundation: 'Tide',
    color: 'purple',
    icon: '🧘',
    gradient: 'from-purple-600 to-violet-600',
    border: 'border-purple-500',
    bg: 'bg-purple-500',
    text: 'text-purple-400',
    shadow: 'shadow-purple-500/30',
    description: 'Perception and intuition'
  },
  cha: {
    name: 'Charisma',
    abbr: 'CHA',
    foundation: 'Flame',
    color: 'pink',
    icon: '✨',
    gradient: 'from-pink-600 to-rose-600',
    border: 'border-pink-500',
    bg: 'bg-pink-500',
    text: 'text-pink-400',
    shadow: 'shadow-pink-500/30',
    description: 'Force of personality and social grace'
  }
};

export default function StatBlock({ character, onStatTap }) {
  const [expandedStat, setExpandedStat] = useState(null);

  const handleStatTap = (stat) => {
    if (expandedStat === stat) {
      setExpandedStat(null);
    } else {
      setExpandedStat(stat);
      onStatTap?.(stat);
    }
  };

  const getModifier = (value) => {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="space-y-4">
      {/* 2x3 Grid of Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(statConfig).map(([stat, config]) => {
          const value = character[stat] || 10;
          const xp = character[`${stat}Xp`] || 0;
          const xpNeeded = character[`${stat}XpNeeded`] || 100;
          const progress = xpNeeded > 0 ? Math.min((xp / xpNeeded) * 100, 100) : 0;
          const isExpanded = expandedStat === stat;

          return (
            <button
              key={stat}
              onClick={() => handleStatTap(stat)}
              className={`
                relative overflow-hidden
                bg-gradient-to-br from-[#1a0a2e]/80 to-[#0d0520]/60
                rounded-xl p-3 text-center
                border-2 ${config.border}/40
                ${isExpanded ? `${config.border}/80 shadow-lg ${config.shadow}` : ''}
                hover:${config.border}/60
                transition-all duration-300
                group
              `}
            >
              {/* Stat Icon */}
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                {config.icon}
              </div>

              {/* Stat Abbreviation */}
              <div className={`text-xs font-bold ${config.text} uppercase tracking-widest mb-1`}>
                {config.abbr}
              </div>

              {/* Score Box - D&D style */}
              <div className={`
                relative mx-auto w-14 h-14
                bg-gradient-to-br ${config.gradient}
                rounded-lg flex items-center justify-center
                shadow-lg ${config.shadow}
                transform rotate-45
                mb-2
              `}>
                <div className="transform -rotate-45 text-center">
                  <div className="text-2xl font-bold text-white leading-none">
                    {value}
                  </div>
                </div>
              </div>

              {/* Modifier */}
              <div className="text-lg font-bold text-gray-300">
                {getModifier(value)}
              </div>

              {/* XP Progress Bar */}
              <div className="mt-2 h-1.5 bg-gray-800/80 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.bg} rounded-full transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* XP Text */}
              <div className="text-[10px] text-gray-500 mt-1">
                {xp} / {xpNeeded} XP
              </div>

              {/* Expand indicator */}
              <div className={`
                absolute top-1 right-1 w-2 h-2 rounded-full
                ${config.bg} opacity-0 group-hover:opacity-50
                transition-opacity
              `} />
            </button>
          );
        })}
      </div>

      {/* Expanded Stat Detail */}
      {expandedStat && (
        <StatDetail
          stat={expandedStat}
          config={statConfig[expandedStat]}
          character={character}
          onClose={() => setExpandedStat(null)}
        />
      )}
    </div>
  );
}

/**
 * Expanded stat detail panel
 */
function StatDetail({ stat, config, character, onClose }) {
  const value = character[stat] || 10;
  const xp = character[`${stat}Xp`] || 0;
  const xpNeeded = character[`${stat}XpNeeded`] || 100;
  const progress = xpNeeded > 0 ? Math.min((xp / xpNeeded) * 100, 100) : 0;
  const xpToNext = xpNeeded - xp;

  const getModifier = (value) => {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div
      className={`
        bg-gradient-to-br from-[#1a0a2e]/90 to-[#0d0520]/80
        rounded-xl p-4 border-2 ${config.border}/50
        animate-fade-in
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-lg
            bg-gradient-to-br ${config.gradient}
            flex items-center justify-center text-2xl
            shadow-lg ${config.shadow}
          `}>
            {config.icon}
          </div>
          <div>
            <h4 className="font-bold text-white">{config.name}</h4>
            <p className={`text-sm ${config.text}`}>The Foundation of {config.foundation}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          &times;
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4 font-serif italic">
        "{config.description}"
      </p>

      {/* Current Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/30 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase mb-1">Score</div>
          <div className={`text-3xl font-bold ${config.text}`}>{value}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase mb-1">Modifier</div>
          <div className="text-3xl font-bold text-white">{getModifier(value)}</div>
        </div>
      </div>

      {/* Progress to next level */}
      <div className="bg-black/20 rounded-lg p-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress to next point</span>
          <span className={config.text}>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.bg} rounded-full transition-all duration-500 relative`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{xp} XP earned</span>
          <span>{xpToNext} XP to go</span>
        </div>
      </div>

      {/* How to improve */}
      <div className="mt-4 text-xs text-gray-500">
        <span className="font-semibold text-gray-400">Improve by:</span> Complete{' '}
        <span className={config.text}>{config.abbr}</span>-linked challenges
      </div>
    </div>
  );
}

export { statConfig };
