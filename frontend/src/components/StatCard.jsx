const STAT_INFO = {
  str: { name: 'Strength', description: 'Physical power' },
  dex: { name: 'Dexterity', description: 'Agility & cardio' },
  con: { name: 'Constitution', description: 'Endurance' },
  int: { name: 'Intelligence', description: 'Mental growth' },
  wis: { name: 'Wisdom', description: 'Mindfulness' },
  cha: { name: 'Charisma', description: 'Social wellness' },
};

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

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>XP Progress</span>
          <span className="font-medium">
            {xp} / {xpNeeded}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`bg-${stat} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
