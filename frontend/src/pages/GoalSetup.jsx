import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { goals } from '../services/api';
import useCharacterStore from '../stores/characterStore';

const STAT_INFO = {
  STR: {
    name: 'Strength',
    shortName: 'STR',
    color: 'str',
    icon: '💪',
    description: 'Physical strength and power',
    examples: ['Weightlifting', 'Push-ups', 'Strength training', 'Heavy lifting'],
    narrative: 'Build raw power through discipline and determination.',
  },
  DEX: {
    name: 'Dexterity',
    shortName: 'DEX',
    color: 'dex',
    icon: '🏃',
    description: 'Agility, speed, and flexibility',
    examples: ['Running', 'Yoga', 'Dance', 'Cardio', 'Stretching'],
    narrative: 'Master fluid motion and graceful movement.',
  },
  CON: {
    name: 'Constitution',
    shortName: 'CON',
    color: 'con',
    icon: '🔥',
    description: 'Stamina and resilience',
    examples: ['Long runs', 'Swimming', 'Cycling', 'Endurance training'],
    narrative: 'Develop unshakeable endurance and vitality.',
  },
  INT: {
    name: 'Intelligence',
    shortName: 'INT',
    color: 'int',
    icon: '📚',
    description: 'Learning and mental growth',
    examples: ['Reading', 'Learning a skill', 'Studying', 'Puzzles', 'Writing'],
    narrative: 'Expand your knowledge and sharpen your mind.',
  },
  WIS: {
    name: 'Wisdom',
    shortName: 'WIS',
    color: 'wis',
    icon: '🧘',
    description: 'Mindfulness and inner peace',
    examples: ['Meditation', 'Journaling', 'Mindfulness', 'Deep breathing', 'Recovery'],
    narrative: 'Find balance and clarity through reflection.',
  },
  CHA: {
    name: 'Charisma',
    shortName: 'CHA',
    color: 'cha',
    icon: '✨',
    description: 'Social wellness and confidence',
    examples: ['Social activities', 'Public speaking', 'Helping others', 'Self-care'],
    narrative: 'Cultivate confidence and meaningful connections.',
  },
};

// Alias for backwards compatibility
const PILLAR_INFO = STAT_INFO;

export default function GoalSetup() {
  const navigate = useNavigate();
  const { character, addGoal } = useCharacterStore();

  const [goalList, setGoalList] = useState([]);
  const [currentStep, setCurrentStep] = useState('intro'); // intro, select-pillar, create-goal, complete
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'binary',
    frequency: 'daily',
    targetValue: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectPillar = (pillar) => {
    setSelectedPillar(pillar);
    setCurrentStep('create-goal');
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const goalData = {
        name: formData.title,
        description: formData.description,
        goalType: formData.type,
        frequency: formData.frequency,
        statMapping: selectedPillar,
      };

      if (formData.type === 'quantitative') {
        goalData.targetValue = parseInt(formData.targetValue);
      }

      const response = await goals.create(goalData);
      const newGoal = response.data.goal;

      addGoal(newGoal);
      setGoalList([...goalList, newGoal]);

      // Reset form and go back to pillar selection
      setFormData({
        title: '',
        description: '',
        type: 'binary',
        frequency: 'daily',
        targetValue: '',
      });
      setSelectedPillar(null);
      setCurrentStep('select-pillar');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (goalList.length === 0) {
      // Allow skipping, but show them they can add goals later
      navigate('/journal');
    } else {
      setCurrentStep('complete');
    }
  };

  const handleContinueToJournal = () => {
    navigate('/journal');
  };

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
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 py-12">
        <div className="max-w-6xl mx-auto">

          {/* Introduction Step */}
          {currentStep === 'intro' && (
            <div className="animate-fade-in">
              <div className="text-center mb-12">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10 mb-6 animate-scale-in">
                  <span className="text-6xl animate-float-slow">🏛️</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-amber-200 via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  Training Setup
                </h1>

                <div className="max-w-3xl mx-auto space-y-4 text-gray-300 text-lg leading-relaxed mb-12">
                  <p className="text-xl md:text-2xl font-light italic text-amber-200/90">
                    Welcome, {character?.name}. Your journey begins with commitment...
                  </p>

                  <div className="glass-card p-8 border border-amber-500/20 bg-amber-500/5 text-left">
                    <p className="text-gray-300 mb-4 leading-relaxed italic">
                      "Before you stand six core attributes, each representing a fundamental aspect of growth—a path to power through dedication."
                    </p>
                    <p className="text-gray-300 mb-4 leading-relaxed italic">
                      "Your growth demands commitment, consistency, and genuine effort. You must forge your path through <span className="text-amber-300 font-semibold not-italic">daily practices</span>—what we call Training Rituals."
                    </p>
                    <p className="text-gray-300 leading-relaxed italic">
                      "Choose your rituals wisely. Each one will strengthen a core attribute. Over time, you'll grow more powerful... and your story will unfold."
                    </p>
                  </div>

                  <p className="text-lg text-white/90 pt-4">
                    It's time to set your Training Rituals. Which attributes will you commit to?
                  </p>
                </div>

                <button
                  onClick={() => setCurrentStep('select-pillar')}
                  className="modern-button-large group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <span>Choose Your Attributes</span>
                    <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Select Pillar Step */}
          {currentStep === 'select-pillar' && (
            <div className="animate-fade-in">
              {/* Goals Summary */}
              {goalList.length > 0 && (
                <div className="glass-card p-6 mb-8 border border-green-500/30 bg-green-500/5">
                  <h3 className="text-xl font-bold text-green-200 mb-4">
                    Your Training Rituals ({goalList.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {goalList.map((goal) => (
                      <div
                        key={goal.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <span className="text-2xl">
                          {PILLAR_INFO[goal.statMapping || goal.stat_mapping]?.icon}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{goal.name}</p>
                          <p className="text-xs text-gray-400">
                            {PILLAR_INFO[goal.statMapping || goal.stat_mapping]?.shortName} • {goal.frequency}
                          </p>
                        </div>
                        <span className={`stat-badge-${(goal.statMapping || goal.stat_mapping).toLowerCase()} px-2 py-1 rounded text-xs font-bold`}>
                          {goal.statMapping || goal.stat_mapping}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Choose an Attribute
                </h2>
                <p className="text-gray-300 text-lg">
                  Which attribute calls to you? Select one to create a Training Ritual.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {Object.entries(PILLAR_INFO).map(([key, pillar]) => (
                  <button
                    key={key}
                    onClick={() => handleSelectPillar(key)}
                    className="group glass-card p-6 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300 text-left"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{pillar.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{pillar.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">{pillar.description}</p>
                    <p className="text-xs text-gray-500 italic mb-3">{pillar.narrative}</p>
                    <div className="flex flex-wrap gap-1">
                      {pillar.examples.slice(0, 3).map((example, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
                          {example}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleFinish}
                  className="glass-button-secondary"
                >
                  {goalList.length > 0 ? `Continue with ${goalList.length} Ritual${goalList.length > 1 ? 's' : ''}` : 'Skip for now'}
                </button>
                {goalList.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    You can create Training Rituals later from your journey dashboard
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Create Goal Step */}
          {currentStep === 'create-goal' && selectedPillar && (
            <div className="animate-fade-in">
              <div className="max-w-3xl mx-auto">
                <div className="glass-card p-8 mb-8 border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="text-6xl">{PILLAR_INFO[selectedPillar].icon}</div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {PILLAR_INFO[selectedPillar].name}
                      </h2>
                      <p className="text-gray-300 mb-3">{PILLAR_INFO[selectedPillar].description}</p>
                      <p className="text-sm text-gray-400 italic">{PILLAR_INFO[selectedPillar].narrative}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-gray-300 mb-2 font-medium">Common Training Rituals:</p>
                    <div className="flex flex-wrap gap-2">
                      {PILLAR_INFO[selectedPillar].examples.map((example, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/10 text-gray-300">
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddGoal} className="glass-card p-8 border border-purple-500/20">
                  <h3 className="text-2xl font-bold text-white mb-6">Create Your Training Ritual</h3>

                  <div className="space-y-6">
                    <div>
                      <label htmlFor="title" className="label">
                        What will you commit to?
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g., 30-minute workout, Read for 20 minutes..."
                        required
                        maxLength={200}
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Be specific. This is your commitment to growth.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="description" className="label">
                        Additional Details (optional)
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="input"
                        placeholder="Any additional notes about this ritual..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="type" className="label">
                          How will you track it?
                        </label>
                        <select
                          id="type"
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          className="input"
                          required
                        >
                          <option value="binary">Did it / Didn't do it</option>
                          <option value="quantitative">Track a number (steps, reps, etc.)</option>
                          <option value="streak">Daily streak</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="frequency" className="label">
                          How often?
                        </label>
                        <select
                          id="frequency"
                          name="frequency"
                          value={formData.frequency}
                          onChange={handleChange}
                          className="input"
                          required
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                    </div>

                    {formData.type === 'quantitative' && (
                      <div>
                        <label htmlFor="targetValue" className="label">
                          Target Number
                        </label>
                        <input
                          type="number"
                          id="targetValue"
                          name="targetValue"
                          value={formData.targetValue}
                          onChange={handleChange}
                          className="input"
                          placeholder="e.g., 10000 (steps), 50 (push-ups)"
                          required={formData.type === 'quantitative'}
                          min={1}
                        />
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl">
                        <p className="text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="modern-button flex-1 disabled:opacity-50"
                      >
                        {loading ? 'Creating Ritual...' : 'Create Training Ritual'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep('select-pillar');
                          setSelectedPillar(null);
                          setError(null);
                        }}
                        className="glass-button"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="animate-fade-in">
              <div className="text-center mb-12">
                <div className="inline-block p-6 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-400/20 backdrop-blur-sm border border-green-500/30 mb-6 animate-scale-in">
                  <span className="text-7xl animate-bounce-slow">✨</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-200 via-emerald-200 to-teal-200 bg-clip-text text-transparent">
                  Your Path is Set
                </h1>

                <div className="max-w-3xl mx-auto space-y-4 text-gray-300 text-lg leading-relaxed mb-12">
                  <div className="glass-card p-8 border border-green-500/20 bg-green-500/5 text-left">
                    <p className="text-gray-300 mb-4 leading-relaxed italic">
                      Your commitment has been recognized.
                      <span className="text-green-300 font-semibold not-italic"> You have chosen wisely, </span>
                      setting the foundation for your journey.
                    </p>
                    <p className="text-gray-300 mb-4 leading-relaxed italic">
                      Remember: you are not judged by your failures, but by your persistence.
                      Complete your Training Rituals each day, and watch as your power grows.
                      Your story now begins.
                    </p>
                    <p className="text-gray-300 leading-relaxed italic">
                      Now go. Your first quest awaits. Your narrative is being written...
                      and you are the author.
                    </p>
                  </div>

                  <div className="glass-card p-6 border border-purple-500/20 bg-purple-500/5">
                    <h3 className="text-lg font-bold text-purple-200 mb-4">What Happens Next:</h3>
                    <ul className="space-y-2 text-left text-sm text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">1.</span>
                        <span>Your journey dashboard will show your <strong className="text-white">active quests</strong> and story progression</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">2.</span>
                        <span>Generate quests using AI to continue your unique narrative</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">3.</span>
                        <span>Complete your Training Rituals to earn XP and strengthen your attributes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">4.</span>
                        <span>Watch as your choices shape your world and unlock new story paths</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleContinueToJournal}
                  className="modern-button-large group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-3xl">⚔️</span>
                    <span>Enter the Kingdom</span>
                    <span className="text-3xl">✨</span>
                  </span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
