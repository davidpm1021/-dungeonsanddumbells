const STAT_INFO = {
  str: { name: 'Strength', description: 'Physical power' },
  dex: { name: 'Dexterity', description: 'Agility & cardio' },
  con: { name: 'Constitution', description: 'Endurance' },
  int: { name: 'Intelligence', description: 'Mental growth' },
  wis: { name: 'Wisdom', description: 'Mindfulness' },
  cha: { name: 'Charisma', description: 'Social wellness' },
};

const STAT_COLORS = {
  str: '#ef4444', // red
  dex: '#10b981', // green
  con: '#f59e0b', // amber
  int: '#3b82f6', // blue
  wis: '#8b5cf6', // purple
  cha: '#ec4899', // pink
};

function getStatColor(stat) {
  return STAT_COLORS[stat] || '#6b7280';
}

export default function StatCard({ stat, value, xp, xpNeeded }) {
  const info = STAT_INFO[stat];
  const progress = xpNeeded > 0 ? (xp / xpNeeded) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-gray-900">{info.name}</h3>
          <p className="text-xs text-gray-500">{info.description}</p>
        </div>
        <div className={`stat-badge-${stat} px-3 py-1 rounded-lg text-xl font-bold`}>
          {value}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>XP Progress</span>
          <span className="font-bold text-sm">
            {xp} / {xpNeeded}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out`}
            style={{
              width: `${Math.max(Math.min(progress, 100), 2)}%`,
              backgroundColor: getStatColor(stat)
            }}
          />
        </div>
        <div className="text-xs text-gray-500 text-right">
          {progress.toFixed(1)}% complete
        </div>
      </div>
    </div>
  );
}
