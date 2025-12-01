import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { characters, wearables, narrative } from '../services/api';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';

/**
 * OnboardingFlow - Multi-step adventure setup wizard
 *
 * Steps:
 * 1. Character Creation (name + class)
 * 2. Wellness Focus (what stats to prioritize)
 * 3. Wearable Connection (optional)
 * 4. Welcome narrative + first quest
 */
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { setCharacter } = useCharacterStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Character data
  const [characterName, setCharacterName] = useState('');
  const [characterClass, setCharacterClass] = useState('Fighter');

  // Step 2: Wellness focus
  const [wellnessFocus, setWellnessFocus] = useState([]);

  // Step 3: Wearable
  const [wearableChoice, setWearableChoice] = useState(null);

  // Step 4: Created character and welcome narrative
  const [createdCharacter, setCreatedCharacter] = useState(null);
  const [welcomeNarrative, setWelcomeNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const totalSteps = 4;

  // Fetch welcome narrative when entering step 4
  useEffect(() => {
    if (currentStep === 4 && characterName && characterClass && !welcomeNarrative) {
      fetchWelcomeNarrative();
    }
  }, [currentStep]);

  const fetchWelcomeNarrative = async () => {
    setNarrativeLoading(true);
    try {
      const response = await narrative.getWelcomeNarrative(characterName, characterClass, wellnessFocus);
      setWelcomeNarrative(response.data.narrative);
    } catch (err) {
      console.error('Failed to fetch welcome narrative:', err);
      // Fallback narrative if API fails
      setWelcomeNarrative(null);
    } finally {
      setNarrativeLoading(false);
    }
  };

  const classes = {
    Fighter: {
      title: 'The Champion',
      subtitle: 'Path of Physical Might',
      icon: '⚔️',
      description: 'You are drawn to physical power and endurance. Your strength will shape your destiny.',
      focus: 'Strength & Constitution',
      gradient: 'from-red-500 via-orange-500 to-amber-500',
      glow: 'shadow-red-500/50',
    },
    Mage: {
      title: 'The Scholar',
      subtitle: 'Path of Mental Clarity',
      icon: '📚',
      description: 'You seek knowledge and inner peace. Through learning and mindfulness, you unlock mysteries.',
      focus: 'Intelligence & Wisdom',
      gradient: 'from-blue-500 via-purple-500 to-violet-500',
      glow: 'shadow-purple-500/50',
    },
    Rogue: {
      title: 'The Shadow',
      subtitle: 'Path of Grace & Charm',
      icon: '🗡️',
      description: 'You excel in agility and charm. Finesse and social mastery are your weapons.',
      focus: 'Dexterity & Charisma',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      glow: 'shadow-green-500/50',
    },
  };

  const wellnessGoals = [
    { id: 'fitness', label: 'Build Strength', stat: 'STR', icon: '💪', desc: 'Weightlifting, resistance training' },
    { id: 'flexibility', label: 'Improve Flexibility', stat: 'DEX', icon: '🧘', desc: 'Yoga, stretching, mobility' },
    { id: 'cardio', label: 'Boost Endurance', stat: 'CON', icon: '🏃', desc: 'Running, cycling, cardio' },
    { id: 'learning', label: 'Learn New Things', stat: 'INT', icon: '📖', desc: 'Reading, courses, skills' },
    { id: 'mindfulness', label: 'Practice Mindfulness', stat: 'WIS', icon: '🧠', desc: 'Meditation, journaling' },
    { id: 'social', label: 'Connect with Others', stat: 'CHA', icon: '💬', desc: 'Social activities, networking' },
  ];

  const wearableOptions = [
    { id: 'oura', name: 'Oura Ring', icon: '💍', status: 'available' },
    { id: 'apple_health', name: 'Apple Health', icon: '🍎', status: 'available' },
    { id: 'fitbit', name: 'Fitbit', icon: '⌚', status: 'available' },
    { id: 'garmin', name: 'Garmin', icon: '🏃', status: 'available' },
    { id: 'google_fit', name: 'Google Fit', icon: '🤖', status: 'available' },
    { id: 'samsung_health', name: 'Samsung Health', icon: '📱', status: 'available' },
    { id: 'skip', name: 'Skip for now', icon: '⏭️', status: 'available' },
  ];

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!characterName.trim()) {
        setError('Please enter your character name');
        return;
      }
      setError(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Create character after wellness focus
      setLoading(true);
      setError(null);
      try {
        const response = await characters.create(characterName, characterClass);
        setCreatedCharacter(response.data);
        setCharacter(response.data);
        setCurrentStep(3);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to create character');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 3) {
      // Wearable step - optional
      if (wearableChoice && wearableChoice !== 'skip') {
        // Connect wearable (mock for now)
        try {
          await wearables.connect(wearableChoice);
        } catch (err) {
          console.log('Wearable connection skipped:', err.message);
        }
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Complete onboarding
      navigate('/goals/setup');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleWellnessFocus = (id) => {
    setWellnessFocus(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
    );
  };

  const selectedClassData = classes[characterClass];

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -left-48 animate-float"></div>
        <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl top-1/3 -right-48 animate-float-delayed"></div>
        <div className="absolute w-96 h-96 bg-amber-600/20 rounded-full blur-3xl -bottom-48 left-1/3 animate-float-slow"></div>

        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
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

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-amber-200/70">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-400">
              {currentStep === 1 && 'Create Your Character'}
              {currentStep === 2 && 'Choose Your Focus'}
              {currentStep === 3 && 'Connect Wearable'}
              {currentStep === 4 && 'Begin Your Adventure'}
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-purple-400 transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl w-full">

          {/* Step 1: Character Creation */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10 mb-4">
                  <span className="text-5xl">✨</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  Begin Your Journey
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                  A realm where wellness becomes power, where every choice shapes your destiny...
                </p>
              </div>

              <div className="glass-card p-8 border border-amber-500/20">
                {/* Name Input */}
                <div className="mb-8">
                  <label className="block text-sm font-bold text-amber-200 mb-3 uppercase tracking-wide">
                    What is your name, traveler?
                  </label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="input text-xl"
                    placeholder="Enter your name..."
                    autoFocus
                    maxLength={50}
                  />
                </div>

                {/* Class Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-amber-200 mb-4 uppercase tracking-wide">
                    Choose Your Path
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(classes).map(([classKey, classData]) => (
                      <button
                        key={classKey}
                        type="button"
                        onClick={() => setCharacterClass(classKey)}
                        className={`
                          relative p-5 rounded-xl border-2 transition-all duration-300 text-left
                          ${characterClass === classKey
                            ? `border-white/50 bg-gradient-to-br ${classData.gradient} bg-opacity-20 shadow-xl ${classData.glow} scale-105`
                            : 'border-white/10 bg-white/5 hover:border-white/30'
                          }
                        `}
                      >
                        <div className="text-3xl mb-2">{classData.icon}</div>
                        <h3 className="text-lg font-bold text-white">{classData.title}</h3>
                        <p className="text-xs text-gray-400">{classData.focus}</p>
                        {characterClass === classKey && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                            <span className="text-xs text-black">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected class detail */}
                <div className={`p-4 rounded-xl bg-gradient-to-br ${selectedClassData.gradient} bg-opacity-10 border border-white/10`}>
                  <p className="text-sm text-gray-300">{selectedClassData.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Wellness Focus */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-green-400/20 to-blue-400/20 backdrop-blur-sm border border-white/10 mb-4">
                  <span className="text-5xl">🎯</span>
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-200 to-blue-200 bg-clip-text text-transparent">
                  Choose Your Focus
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                  What aspects of wellness do you want to strengthen? Select all that apply.
                </p>
              </div>

              <div className="glass-card p-8 border border-green-500/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wellnessGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => toggleWellnessFocus(goal.id)}
                      className={`
                        p-5 rounded-xl border-2 transition-all duration-300 text-left
                        ${wellnessFocus.includes(goal.id)
                          ? 'border-green-400/50 bg-green-500/20 shadow-lg shadow-green-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                        }
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{goal.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{goal.label}</h3>
                            <span className={`stat-badge-${goal.stat.toLowerCase()} px-2 py-0.5 rounded text-xs`}>
                              {goal.stat}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{goal.desc}</p>
                        </div>
                        {wellnessFocus.includes(goal.id) && (
                          <span className="text-green-400 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {wellnessFocus.length === 0 && (
                  <p className="text-center text-gray-500 mt-4 text-sm italic">
                    Select at least one focus area, or skip to continue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Wearable Connection */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10 mb-4">
                  <span className="text-5xl">⌚</span>
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                  Connect Your Gear
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                  Link a wearable device to automatically track your wellness quests.
                </p>
              </div>

              <div className="glass-card p-8 border border-blue-500/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wearableOptions.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setWearableChoice(device.id)}
                      disabled={device.status === 'coming_soon'}
                      className={`
                        p-5 rounded-xl border-2 transition-all duration-300 text-left
                        ${device.status === 'coming_soon' ? 'opacity-50 cursor-not-allowed' : ''}
                        ${wearableChoice === device.id
                          ? 'border-blue-400/50 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{device.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-bold text-white">{device.name}</h3>
                          {device.status === 'coming_soon' && (
                            <span className="text-xs text-amber-400">Coming Soon</span>
                          )}
                        </div>
                        {wearableChoice === device.id && (
                          <span className="text-blue-400 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-gray-500 mt-6 text-sm">
                  You can connect wearables later in Settings
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Welcome / First Quest */}
          {currentStep === 4 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-amber-400/20 to-red-400/20 backdrop-blur-sm border border-white/10 mb-4">
                  <span className="text-5xl">📜</span>
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-amber-200 to-red-200 bg-clip-text text-transparent">
                  Your Adventure Begins
                </h1>
              </div>

              <div className="glass-card p-8 border border-amber-500/20 mb-8">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg text-amber-100 italic leading-relaxed mb-6">
                    *The ancient tome before you glows with golden light as your name appears upon its pages...*
                  </p>

                  <div className="bg-amber-900/20 p-6 rounded-xl border border-amber-500/20 mb-6">
                    {narrativeLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        <span className="ml-3 text-amber-200/70 italic">The Dungeon Master speaks...</span>
                      </div>
                    ) : welcomeNarrative ? (
                      <div className="text-gray-200 leading-relaxed whitespace-pre-line font-serif">
                        {welcomeNarrative}
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-200 leading-relaxed">
                          Welcome, <span className="text-amber-300 font-bold">{characterName}</span>, to the fractured realm of Ironhold.
                        </p>
                        <p className="text-gray-200 leading-relaxed mt-4">
                          You have chosen the path of the <span className="text-amber-300 font-bold">{classes[characterClass].title}</span>.
                          Your journey toward mastery begins now. Through dedication to your wellness, you will grow in power.
                          Each workout, each moment of mindfulness, each healthy choice will strengthen your legend.
                        </p>
                        <p className="text-gray-200 leading-relaxed mt-4">
                          The Six Foundations await your devotion. Go forth, adventurer, and claim your destiny!
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20">
                    <span className="text-4xl">🗡️</span>
                    <div>
                      <h4 className="font-bold text-purple-200">First Quest Awaits</h4>
                      <p className="text-sm text-gray-400">Set your first wellness goals to begin earning XP</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl border transition-all ${
                currentStep === 1
                  ? 'border-white/10 text-gray-600 cursor-not-allowed'
                  : 'border-white/20 text-gray-300 hover:border-white/40 hover:text-white'
              }`}
            >
              ← Back
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="modern-button-large px-10"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Creating...
                </span>
              ) : currentStep === 4 ? (
                <span className="flex items-center gap-2">
                  Set Your Goals
                  <span>⚔️</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <span>→</span>
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
