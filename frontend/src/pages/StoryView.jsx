import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCharacterStore from '../stores/characterStore';
import useNarrativeStore from '../stores/narrativeStore';
import { characters, narrative as narrativeApi } from '../services/api';
import BottomNav from '../components/navigation/BottomNav';
import NarrativeSummary from '../components/story/NarrativeSummary';
import NPCList from '../components/story/NPCList';
import LocationList from '../components/story/LocationList';
import EpisodeArchive from '../components/story/EpisodeArchive';
import { useTutorial } from '../hooks/useTutorial';

/**
 * StoryView - The Campaign Recap
 * Everything that's happened in the player's story
 */
export default function StoryView() {
  const navigate = useNavigate();
  const { character, setCharacter } = useCharacterStore();
  const {
    narrativeSummary,
    setNarrativeSummary,
    episodes,
    setEpisodes,
    worldState,
    setWorldState
  } = useNarrativeStore();

  // Trigger tutorial tips for this page
  useTutorial('story', { delay: 800 });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('story');

  useEffect(() => {
    loadStoryData();
  }, []);

  const loadStoryData = async () => {
    setLoading(true);
    try {
      // Load character if needed
      let charId = character?.id;
      if (!charId) {
        const charResponse = await characters.getMe();
        if (!charResponse.data) {
          navigate('/character/create');
          return;
        }
        setCharacter(charResponse.data);
        charId = charResponse.data.id;
      }

      // Load all story data in parallel
      const [summaryRes, worldRes, episodesRes] = await Promise.allSettled([
        narrativeApi.getSummary(charId),
        narrativeApi.getWorldState(charId),
        narrativeApi.getEpisodes?.(charId) || Promise.resolve({ data: { episodes: [] } })
      ]);

      // Process results
      if (summaryRes.status === 'fulfilled') {
        setNarrativeSummary(summaryRes.value.data.summary || null);
      }
      if (worldRes.status === 'fulfilled') {
        setWorldState(worldRes.value.data);
      }
      if (episodesRes.status === 'fulfilled') {
        setEpisodes(episodesRes.value.data.episodes || []);
      }

    } catch (err) {
      console.error('[Story] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'story', label: 'Chronicle', icon: '📖', count: narrativeSummary ? 1 : 0 },
    { id: 'characters', label: 'Characters', icon: '👥', count: Object.keys(worldState?.npcRelationships || {}).length },
    { id: 'locations', label: 'Locations', icon: '🗺️', count: (worldState?.unlockedLocations || []).length },
    { id: 'episodes', label: 'Archive', icon: '📚', count: episodes?.length || 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-200/60 font-serif italic">Gathering your tale...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20">
      {/* Background texture */}
      <div className="fixed inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-purple-900/10 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0520]/95 backdrop-blur-xl border-b border-amber-900/20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/journal')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ←
              </button>
              <h1 className="text-lg font-bold text-white">Your Story</h1>
            </div>
            <div className="text-sm text-gray-500 font-serif italic">
              {character?.name}'s Chronicle
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1.5 bg-[#1a0a2e]/40 rounded-xl border border-amber-900/20 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-2.5 px-3 rounded-lg font-medium text-sm
                transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                  : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <span className={activeTab === tab.id ? '' : 'opacity-70'}>
                  {tab.icon}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded-full
                    ${activeTab === tab.id
                      ? 'bg-white/20'
                      : 'bg-amber-500/20 text-amber-400'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'story' && (
            <section>
              <SectionHeader
                icon="📖"
                title="The Story So Far"
                subtitle="Your adventures chronicled"
              />
              <NarrativeSummary
                summary={narrativeSummary}
                characterName={character?.name}
                loading={false}
              />
            </section>
          )}

          {activeTab === 'characters' && (
            <section>
              <SectionHeader
                icon="👥"
                title="Key Characters"
                subtitle="Those you've encountered"
              />
              <NPCList
                npcs={worldState?.npcRelationships || {}}
                loading={false}
              />
            </section>
          )}

          {activeTab === 'locations' && (
            <section>
              <SectionHeader
                icon="🗺️"
                title="Places You've Been"
                subtitle="Locations discovered"
              />
              <LocationList
                locations={worldState?.unlockedLocations || []}
                loading={false}
              />
            </section>
          )}

          {activeTab === 'episodes' && (
            <section>
              <SectionHeader
                icon="📚"
                title="Episode Archive"
                subtitle="Completed story arcs"
              />
              <EpisodeArchive
                episodes={episodes}
                loading={false}
              />
            </section>
          )}
        </div>

        {/* Story Stats Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800/50">
          <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-4 text-center">
            Chronicle Statistics
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <StatBox
              icon="📖"
              value={narrativeSummary ? narrativeSummary.split(' ').length : 0}
              label="Words"
            />
            <StatBox
              icon="👥"
              value={Object.keys(worldState?.npcRelationships || {}).length}
              label="NPCs"
            />
            <StatBox
              icon="📍"
              value={(worldState?.unlockedLocations || []).length}
              label="Places"
            />
            <StatBox
              icon="📚"
              value={episodes?.length || 0}
              label="Chapters"
            />
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * Section header with icon and subtitle
 */
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-500 mt-1 ml-8">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Small stat box for footer
 */
function StatBox({ icon, value, label }) {
  return (
    <div className="bg-[#1a0a2e]/30 rounded-lg p-3 text-center border border-gray-800/30">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
