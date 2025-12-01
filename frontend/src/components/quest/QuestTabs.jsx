/**
 * QuestTabs - Navigation tabs for quest status filtering
 * Styled to match the dark parchment aesthetic
 */
export default function QuestTabs({ activeTab, onTabChange, counts = {} }) {
  const tabs = [
    {
      id: 'active',
      label: 'Active',
      icon: '⚔️',
      color: 'amber',
      gradient: 'from-amber-600 to-orange-600',
      description: 'Quests in progress'
    },
    {
      id: 'available',
      label: 'Available',
      icon: '📋',
      color: 'blue',
      gradient: 'from-blue-600 to-cyan-600',
      description: 'Ready to accept'
    },
    {
      id: 'completed',
      label: 'History',
      icon: '✓',
      color: 'green',
      gradient: 'from-green-600 to-emerald-600',
      description: 'Completed quests'
    }
  ];

  return (
    <div className="flex gap-2 p-1.5 bg-[#1a0a2e]/40 rounded-xl border border-purple-900/30">
      {tabs.map(tab => {
        const count = counts[tab.id] || 0;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium text-sm
              transition-all duration-200
              ${isActive
                ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <span className={isActive ? '' : 'opacity-70'}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${isActive
                    ? 'bg-white/20'
                    : `bg-${tab.color}-500/20 text-${tab.color}-400`
                  }
                `}>
                  {count}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
