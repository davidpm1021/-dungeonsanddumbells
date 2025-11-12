import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { characters } from '../services/api';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';

export default function CharacterCreation() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { setCharacter } = useCharacterStore();

  const [characterName, setCharacterName] = useState('');
  const [characterClass, setCharacterClass] = useState('Fighter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const classes = {
    Fighter: {
      title: 'The Champion',
      subtitle: 'Path of Physical Might',
      icon: '⚔️',
      description: 'You are drawn to the ancient Pillars of Might and Endurance. Your strength will shape kingdoms, your resilience will weather any storm. Through discipline and physical mastery, you will become an unstoppable force.',
      focus: 'Strength & Constitution',
      narrative: 'Masters of the Iron Temple who forge their bodies into weapons of legend.',
      gradient: 'from-red-500 via-orange-500 to-amber-500',
      glow: 'shadow-red-500/50',
    },
    Mage: {
      title: 'The Scholar',
      subtitle: 'Path of Mental Clarity',
      icon: '📚',
      description: 'You seek wisdom from the Pillars of Clarity and Serenity. Knowledge is your weapon, meditation your shield. Through learning and mindfulness, you will unlock the mysteries of Vitalia.',
      focus: 'Intelligence & Wisdom',
      narrative: 'Keepers of the Forgotten Library who wield knowledge as others wield steel.',
      gradient: 'from-blue-500 via-purple-500 to-violet-500',
      glow: 'shadow-purple-500/50',
    },
    Rogue: {
      title: 'The Shadow',
      subtitle: 'Path of Grace & Charm',
      icon: '🗡️',
      description: 'You dance between the Pillars of Grace and Radiance. Agility is your art, charisma your greatest asset. Through finesse and social mastery, you will turn every encounter to your advantage.',
      focus: 'Dexterity & Charisma',
      narrative: 'Silver-tongued wanderers who move like whispers and inspire like legends.',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      glow: 'shadow-green-500/50',
    },
  };

  const selectedClassData = classes[characterClass];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await characters.create(characterName, characterClass);
      setCharacter(response.data);
      navigate('/goals/setup');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create character. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -left-48 animate-float"></div>
        <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl top-1/3 -right-48 animate-float-delayed"></div>
        <div className="absolute w-96 h-96 bg-amber-600/20 rounded-full blur-3xl -bottom-48 left-1/3 animate-float-slow"></div>

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-5xl w-full">

          {/* Opening Narrative */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="mb-6">
              <div className="inline-block p-4 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10 mb-4 animate-scale-in">
                <span className="text-6xl animate-float-slow">✨</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-amber-200 via-purple-200 to-blue-200 bg-clip-text text-transparent animate-fade-in delay-100">
              Welcome to Vitalia
            </h1>

            <div className="max-w-3xl mx-auto space-y-4 text-gray-300 text-lg leading-relaxed animate-fade-in delay-200">
              <p className="text-xl md:text-2xl font-light italic text-amber-200/90">
                A realm where wellness becomes power, where every choice shapes your destiny...
              </p>

              <p>
                The Kingdom of Vitalia stands at the edge of twilight. Once, the Six Ancient Pillars—<span className="text-red-300 font-semibold">Might</span>, <span className="text-green-300 font-semibold">Grace</span>, <span className="text-yellow-300 font-semibold">Endurance</span>, <span className="text-blue-300 font-semibold">Clarity</span>, <span className="text-purple-300 font-semibold">Serenity</span>, and <span className="text-pink-300 font-semibold">Radiance</span>—stood brilliant and whole, channels of raw magical energy flowing through every citizen.
              </p>

              <p>
                But the pillars have dimmed. Their power fades with each passing season. The people grow weary, their potential locked away. Elder Thorne, last of the Pillar Keepers, sends word across the realm: <span className="text-amber-300 font-semibold italic">"Only those who walk the ancient paths can rekindle what was lost."</span>
              </p>

              <p className="text-xl text-white/90 font-medium pt-2">
                You have been called. Your journey begins now.
              </p>
            </div>
          </div>

          {/* Character Creation Form */}
          <form onSubmit={handleSubmit} className="glass-card p-8 md:p-12 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-500 animate-fade-in delay-1000">

            {/* Name Input */}
            <div className="mb-10">
              <label htmlFor="characterName" className="block text-sm font-bold text-amber-200 mb-3 tracking-wide uppercase">
                What is your name, traveler?
              </label>
              <input
                type="text"
                id="characterName"
                name="characterName"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="input text-xl"
                placeholder="Enter your name..."
                required
                minLength={2}
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2 italic">
                Choose a name worthy of legend. This is how the kingdom will remember you.
              </p>
            </div>

            {/* Class Selection */}
            <div className="mb-10">
              <label className="block text-sm font-bold text-amber-200 mb-4 tracking-wide uppercase">
                Choose Your Path
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(classes).map(([classKey, classData]) => (
                  <button
                    key={classKey}
                    type="button"
                    onClick={() => setCharacterClass(classKey)}
                    className={`
                      relative p-6 rounded-xl border-2 transition-all duration-300 text-left
                      ${characterClass === classKey
                        ? `border-white/50 bg-gradient-to-br ${classData.gradient} bg-opacity-20 shadow-2xl ${classData.glow} scale-105`
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="text-4xl mb-3">{classData.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-1">{classData.title}</h3>
                    <p className="text-sm text-gray-300 mb-3 italic">{classData.subtitle}</p>
                    <p className="text-xs text-gray-400 font-medium mb-2">{classData.focus}</p>
                    {characterClass === classKey && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <span className="text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Selected Class Details */}
              <div className={`glass-card p-6 border bg-gradient-to-br ${selectedClassData.gradient} bg-opacity-10 border-white/20 animate-fade-in`}>
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{selectedClassData.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-2">{selectedClassData.title}</h4>
                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">{selectedClassData.description}</p>
                    <p className="text-xs text-gray-400 italic">{selectedClassData.narrative}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* The Six Pillars Preview */}
            <div className="mb-8 glass-card p-6 border border-purple-500/20 bg-purple-500/5">
              <h4 className="text-sm font-bold text-purple-200 mb-4 tracking-wide uppercase">
                The Six Pillars Await
              </h4>
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                All paths begin at the same point. Your connection to each Pillar starts at <span className="text-white font-semibold">10</span>.
                Through your choices and dedication, you will strengthen these bonds, unlocking new powers and shaping your legend.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="stat-badge-str px-2 py-1 rounded text-sm font-bold">STR 10</span>
                  <span className="text-xs text-gray-400">Might</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="stat-badge-dex px-2 py-1 rounded text-sm font-bold">DEX 10</span>
                  <span className="text-xs text-gray-400">Grace</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="stat-badge-con px-2 py-1 rounded text-sm font-bold">CON 10</span>
                  <span className="text-xs text-gray-400">Endurance</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="stat-badge-int px-2 py-1 rounded text-sm font-bold">INT 10</span>
                  <span className="text-xs text-gray-400">Clarity</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="stat-badge-wis px-2 py-1 rounded text-sm font-bold">WIS 10</span>
                  <span className="text-xs text-gray-400">Serenity</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <span className="stat-badge-cha px-2 py-1 rounded text-sm font-bold">CHA 10</span>
                  <span className="text-xs text-gray-400">Radiance</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm animate-fade-in">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !characterName}
              className="modern-button-large w-full disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">⚔️</span>
                <span>{loading ? 'Forging your destiny...' : 'Begin Your Legend'}</span>
                <span className="text-3xl group-hover:scale-110 transition-transform">✨</span>
              </span>
            </button>

            <p className="text-center text-xs text-gray-500 mt-4 italic">
              Elder Thorne awaits your arrival at the Pillar Grove...
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}
