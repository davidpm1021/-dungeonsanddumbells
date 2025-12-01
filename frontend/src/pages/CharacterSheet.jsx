import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCharacterStore from '../stores/characterStore';
import { characters, achievements as achievementsApi } from '../services/api';
import BottomNav from '../components/navigation/BottomNav';
import StatBlock from '../components/character/StatBlock';
import QualitiesList from '../components/character/QualitiesList';
import InventoryList from '../components/character/InventoryList';
import AchievementList from '../components/achievements/AchievementList';
import { useTutorial } from '../hooks/useTutorial';

// Class icons and colors
const classConfig = {
  Fighter: { icon: '⚔️', color: 'red', title: 'Champion of Might' },
  Mage: { icon: '🔮', color: 'blue', title: 'Wielder of Arcane Arts' },
  Rogue: { icon: '🗡️', color: 'green', title: 'Master of Shadows' },
  Cleric: { icon: '✝️', color: 'yellow', title: 'Divine Servant' },
  Ranger: { icon: '🏹', color: 'emerald', title: 'Guardian of the Wild' }
};

export default function CharacterSheet() {
  const navigate = useNavigate();
  const { character, setCharacter } = useCharacterStore();
  const [loading, setLoading] = useState(!character);
  const [qualities, setQualities] = useState({});
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');

  // Achievement state
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [mythPoints, setMythPoints] = useState(0);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // Trigger tutorial tips for this page
  useTutorial('character', { delay: 800 });

  useEffect(() => {
    if (!character) {
      loadCharacter();
    } else {
      loadQualities();
      loadInventory();
    }
  }, [character]);

  // Load achievements when tab is selected
  useEffect(() => {
    if (activeTab === 'achievements' && achievements.length === 0) {
      loadAchievements();
    }
  }, [activeTab]);

  const loadCharacter = async () => {
    try {
      const response = await characters.getMe();
      if (!response.data) {
        navigate('/character/create');
        return;
      }
      setCharacter(response.data);
      await Promise.all([
        loadQualities(response.data.id),
        loadInventory(response.data.id)
      ]);
    } catch (err) {
      console.error('[CharacterSheet] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQualities = async (charId) => {
    try {
      const id = charId || character?.id;
      if (!id) return;
      const response = await characters.getQualities(id);
      setQualities(response.data.qualities || {});
    } catch (err) {
      console.log('[CharacterSheet] No qualities yet');
    }
  };

  const loadInventory = async (charId) => {
    try {
      // Placeholder - inventory API to be implemented
      setInventory([]);
    } catch (err) {
      console.log('[CharacterSheet] No inventory yet');
    }
  };

  const loadAchievements = async () => {
    try {
      setAchievementsLoading(true);
      const response = await achievementsApi.getComplete();
      if (response.data.success) {
        setAchievements(response.data.achievements || []);
        setUserAchievements(response.data.userAchievements || []);
        setMythPoints(response.data.mythPoints || 0);
      }
    } catch (err) {
      console.log('[CharacterSheet] Failed to load achievements:', err);
    } finally {
      setAchievementsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-200/60 font-serif italic">Consulting the archives...</p>
        </div>
      </div>
    );
  }

  if (!character) return null;

  const classInfo = classConfig[character.characterClass] || classConfig.Fighter;

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20">
      {/* Background texture */}
      <div className="fixed inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-purple-900/10 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0520]/95 backdrop-blur-xl border-b border-amber-900/20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/journal')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ←
            </button>
            <h1 className="text-lg font-bold text-white">Character Sheet</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Character Header Card */}
        <section className="mb-6">
          <div className="bg-gradient-to-br from-[#1a0a2e]/80 to-[#0d0520]/60 rounded-2xl p-6 border border-amber-900/30 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-amber-500 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative flex items-start gap-5">
              {/* Avatar */}
              <div className={`
                w-20 h-20 rounded-2xl
                bg-gradient-to-br from-${classInfo.color}-500 to-${classInfo.color}-700
                flex items-center justify-center text-4xl
                shadow-xl shadow-${classInfo.color}-500/30
                border-2 border-white/20
              `}>
                {classInfo.icon}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">{character.name}</h2>
                <p className={`text-${classInfo.color}-400 font-medium`}>
                  Level {character.level} {character.characterClass}
                </p>
                <p className="text-sm text-gray-500 italic mt-1">
                  {classInfo.title}
                </p>
              </div>
            </div>

            {/* XP Bar */}
            <div className="mt-5 relative">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Experience</span>
                <span className="text-amber-400 font-bold">{character.totalXp} XP</span>
              </div>
              <div className="h-3 bg-gray-900/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full relative"
                  style={{ width: `${Math.min((character.xpToNextLevel || 0) / 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'stats', label: 'Abilities', icon: '📊' },
            { id: 'qualities', label: 'Qualities', icon: '✨' },
            { id: 'achievements', label: 'Trophies', icon: '🏆' },
            { id: 'inventory', label: 'Inventory', icon: '🎒' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-3 px-4 rounded-xl font-medium text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'stats' && (
            <section>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>Ability Scores</span>
                <span className="text-xs text-gray-500 font-normal">Tap to expand</span>
              </h3>
              <StatBlock character={character} />
            </section>
          )}

          {activeTab === 'qualities' && (
            <section>
              <h3 className="text-lg font-bold text-white mb-4">
                Character Qualities
              </h3>
              <QualitiesList qualities={qualities} />
            </section>
          )}

          {activeTab === 'achievements' && (
            <section>
              <AchievementList
                achievements={achievements}
                userAchievements={userAchievements}
                mythPoints={mythPoints}
                isLoading={achievementsLoading}
                onRefresh={loadAchievements}
              />
            </section>
          )}

          {activeTab === 'inventory' && (
            <section>
              <h3 className="text-lg font-bold text-white mb-4">
                Inventory
              </h3>
              <InventoryList items={inventory} />
            </section>
          )}
        </div>

        {/* Quick Actions */}
        <section className="mt-8">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/journal')}
              className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-purple-500/30 hover:border-purple-500/50 transition-all text-left group"
            >
              <span className="text-2xl mb-2 block">📖</span>
              <span className="font-semibold text-white group-hover:text-purple-300 transition-colors text-sm">
                Adventure
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                Continue your story
              </span>
            </button>
            <button
              onClick={() => navigate('/quests')}
              className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-amber-500/30 hover:border-amber-500/50 transition-all text-left group"
            >
              <span className="text-2xl mb-2 block">📜</span>
              <span className="font-semibold text-white group-hover:text-amber-300 transition-colors text-sm">
                Quest Log
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                View your quests
              </span>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
