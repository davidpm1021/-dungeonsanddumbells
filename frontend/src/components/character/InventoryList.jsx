import { useState } from 'react';

/**
 * InventoryList - Character inventory with D&D-style item display
 * Items are earned from quests and provide stat bonuses or narrative options
 */

// Item rarity colors
const rarityConfig = {
  common: {
    label: 'Common',
    color: 'gray',
    gradient: 'from-gray-600 to-gray-500',
    border: 'border-gray-500',
    text: 'text-gray-400',
    glow: ''
  },
  uncommon: {
    label: 'Uncommon',
    color: 'green',
    gradient: 'from-green-600 to-emerald-500',
    border: 'border-green-500',
    text: 'text-green-400',
    glow: 'shadow-green-500/20'
  },
  rare: {
    label: 'Rare',
    color: 'blue',
    gradient: 'from-blue-600 to-cyan-500',
    border: 'border-blue-500',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/30'
  },
  epic: {
    label: 'Epic',
    color: 'purple',
    gradient: 'from-purple-600 to-violet-500',
    border: 'border-purple-500',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/30'
  },
  legendary: {
    label: 'Legendary',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-500',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/40'
  }
};

// Item type icons
const itemTypeIcons = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  consumable: '🧪',
  material: '🪨',
  quest: '📜',
  treasure: '💎',
  key: '🔑',
  book: '📚',
  tool: '🔧'
};

export default function InventoryList({ items = [], onItemTap }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');

  const handleItemClick = (item) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
    onItemTap?.(item);
  };

  // Filter items
  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.type === filter);

  // Group by type for display
  const groupedItems = filteredItems.reduce((acc, item) => {
    const type = item.type || 'misc';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  if (items.length === 0) {
    return <EmptyInventory />;
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <FilterTab
          label="All"
          count={items.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {Object.keys(groupedItems).map(type => (
          <FilterTab
            key={type}
            label={type.charAt(0).toUpperCase() + type.slice(1)}
            icon={itemTypeIcons[type]}
            count={groupedItems[type].length}
            active={filter === type}
            onClick={() => setFilter(type)}
          />
        ))}
      </div>

      {/* Item Grid */}
      <div className="grid grid-cols-4 gap-2">
        {filteredItems.map((item) => (
          <ItemSlot
            key={item.id}
            item={item}
            isSelected={selectedItem?.id === item.id}
            onClick={() => handleItemClick(item)}
          />
        ))}
      </div>

      {/* Selected Item Detail */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

/**
 * Filter tab button
 */
function FilterTab({ label, icon, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        whitespace-nowrap transition-all
        ${active
          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
        }
      `}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      <span className="opacity-60">({count})</span>
    </button>
  );
}

/**
 * Individual item slot in grid
 */
function ItemSlot({ item, isSelected, onClick }) {
  const rarity = rarityConfig[item.rarity] || rarityConfig.common;
  const icon = itemTypeIcons[item.type] || '📦';

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-xl p-2
        bg-gradient-to-br from-[#1a0a2e]/80 to-[#0d0520]/60
        border-2 ${rarity.border}/40
        ${isSelected ? `${rarity.border}/80 ${rarity.glow} shadow-lg` : ''}
        hover:${rarity.border}/60 hover:scale-105
        transition-all duration-200
        group
      `}
    >
      {/* Item Icon */}
      <div className="w-full h-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>

      {/* Quantity Badge */}
      {item.quantity > 1 && (
        <div className="absolute bottom-1 right-1 bg-black/70 rounded px-1 text-[10px] font-bold text-white">
          x{item.quantity}
        </div>
      )}

      {/* Rarity Indicator */}
      <div className={`absolute top-1 left-1 w-2 h-2 rounded-full bg-gradient-to-br ${rarity.gradient}`} />

      {/* Equipped indicator */}
      {item.equipped && (
        <div className="absolute top-1 right-1 text-xs">⚡</div>
      )}
    </button>
  );
}

/**
 * Detailed item view
 */
function ItemDetail({ item, onClose }) {
  const rarity = rarityConfig[item.rarity] || rarityConfig.common;
  const icon = itemTypeIcons[item.type] || '📦';

  return (
    <div className={`
      bg-gradient-to-br from-[#1a0a2e]/95 to-[#0d0520]/90
      rounded-xl p-4 border-2 ${rarity.border}/50
      animate-scale-in
      ${rarity.glow}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-14 h-14 rounded-xl
            bg-gradient-to-br ${rarity.gradient}
            flex items-center justify-center text-3xl
            shadow-lg
          `}>
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-white">{item.name}</h4>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${rarity.text} uppercase`}>
                {rarity.label}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {item.type}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-xl"
        >
          &times;
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 font-serif italic mb-4">
        {item.description || 'A mysterious item with unknown properties.'}
      </p>

      {/* Stats/Effects */}
      {item.effects && item.effects.length > 0 && (
        <div className="bg-black/30 rounded-lg p-3 mb-3 space-y-2">
          <div className="text-xs text-gray-500 uppercase mb-2">Effects</div>
          {item.effects.map((effect, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="text-green-400">+</span>
              <span className="text-gray-300">{effect}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quantity */}
      {item.quantity > 1 && (
        <div className="text-sm text-gray-500">
          Quantity: <span className="text-white font-semibold">{item.quantity}</span>
        </div>
      )}

      {/* Source */}
      {item.source && (
        <div className="mt-3 text-xs text-gray-600">
          Obtained from: {item.source}
        </div>
      )}
    </div>
  );
}

/**
 * Empty inventory state
 */
function EmptyInventory() {
  return (
    <div className="bg-[#1a0a2e]/30 rounded-xl p-6 text-center border border-dashed border-gray-700">
      <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl opacity-50">🎒</span>
      </div>
      <h4 className="font-semibold text-gray-400 mb-2">Inventory Empty</h4>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">
        Complete quests to earn items and treasures for your collection.
      </p>
    </div>
  );
}
