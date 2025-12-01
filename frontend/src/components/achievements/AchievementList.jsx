import { useState, useMemo } from 'react';
import AchievementCard from './AchievementCard';

/**
 * AchievementList - Trophy case style achievement display
 * Shows unlocked and locked achievements with filtering and stats
 */

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'unlocked', label: 'Unlocked' },
  { id: 'locked', label: 'Locked' },
  { id: 'legendary', label: 'Legendary' },
  { id: 'epic', label: 'Epic' },
  { id: 'rare', label: 'Rare' },
];

export default function AchievementList({
  achievements = [],
  userAchievements = [],
  mythPoints = 0,
  isLoading = false,
  onRefresh,
}) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Create a set of unlocked achievement IDs for quick lookup
  const unlockedIds = useMemo(() => {
    return new Set(userAchievements.map(ua => ua.achievementId));
  }, [userAchievements]);

  // Merge achievement data with user unlock status
  const mergedAchievements = useMemo(() => {
    return achievements.map(achievement => {
      const userAch = userAchievements.find(ua => ua.achievementId === achievement.id);
      return {
        ...achievement,
        isUnlocked: !!userAch,
        earnedAt: userAch?.earnedAt,
        progressSnapshot: userAch?.progressSnapshot,
      };
    });
  }, [achievements, userAchievements]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let filtered = [...mergedAchievements];

    switch (activeFilter) {
      case 'unlocked':
        filtered = filtered.filter(a => a.isUnlocked);
        break;
      case 'locked':
        filtered = filtered.filter(a => !a.isUnlocked);
        break;
      case 'legendary':
      case 'epic':
      case 'rare':
        filtered = filtered.filter(a => a.rarity === activeFilter);
        break;
      default:
        break;
    }

    // Sort by: unlocked first, then by rarity
    return filtered.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1;
      }
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    });
  }, [mergedAchievements, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = achievements.length;
    const unlocked = mergedAchievements.filter(a => a.isUnlocked).length;
    const byRarity = {
      legendary: achievements.filter(a => a.rarity === 'legendary').length,
      legendaryUnlocked: mergedAchievements.filter(a => a.rarity === 'legendary' && a.isUnlocked).length,
      epic: achievements.filter(a => a.rarity === 'epic').length,
      epicUnlocked: mergedAchievements.filter(a => a.rarity === 'epic' && a.isUnlocked).length,
      rare: achievements.filter(a => a.rarity === 'rare').length,
      rareUnlocked: mergedAchievements.filter(a => a.rarity === 'rare' && a.isUnlocked).length,
      common: achievements.filter(a => a.rarity === 'common').length,
      commonUnlocked: mergedAchievements.filter(a => a.rarity === 'common' && a.isUnlocked).length,
    };
    return { total, unlocked, byRarity };
  }, [achievements, mergedAchievements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <span className="ml-3 text-amber-200/70">Loading achievements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Myth Points */}
      <div className="glass-card p-5 border border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Trophy Case</h2>
            <p className="text-sm text-gray-400">
              {stats.unlocked} of {stats.total} achievements unlocked
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-amber-400">{mythPoints}</div>
            <div className="text-xs text-amber-300/70">Myth Points</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Rarity breakdown */}
        <div className="mt-4 flex justify-between text-xs">
          <div className="text-amber-400">
            <span className="font-medium">{stats.byRarity.legendaryUnlocked}/{stats.byRarity.legendary}</span>
            <span className="text-gray-500 ml-1">Legendary</span>
          </div>
          <div className="text-purple-400">
            <span className="font-medium">{stats.byRarity.epicUnlocked}/{stats.byRarity.epic}</span>
            <span className="text-gray-500 ml-1">Epic</span>
          </div>
          <div className="text-blue-400">
            <span className="font-medium">{stats.byRarity.rareUnlocked}/{stats.byRarity.rare}</span>
            <span className="text-gray-500 ml-1">Rare</span>
          </div>
          <div className="text-gray-400">
            <span className="font-medium">{stats.byRarity.commonUnlocked}/{stats.byRarity.common}</span>
            <span className="text-gray-500 ml-1">Common</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filterOptions.map(option => (
          <button
            key={option.id}
            onClick={() => setActiveFilter(option.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeFilter === option.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      {filteredAchievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAchievements.map(achievement => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isUnlocked={achievement.isUnlocked}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-400">
            {activeFilter === 'unlocked'
              ? 'No achievements unlocked yet. Start your wellness journey!'
              : activeFilter === 'locked'
              ? 'All achievements unlocked! You are a legend!'
              : 'No achievements match this filter.'
            }
          </p>
        </div>
      )}

      {/* Refresh button */}
      {onRefresh && (
        <div className="text-center">
          <button
            onClick={onRefresh}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Refresh achievements
          </button>
        </div>
      )}
    </div>
  );
}
