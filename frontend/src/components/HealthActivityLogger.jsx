import { useState } from 'react';
import { health } from '../services/api';

const ACTIVITY_TYPES = [
  { value: 'strength', label: 'Strength Training', stat: 'STR', category: 'physical', icon: '💪', color: 'red' },
  { value: 'cardio', label: 'Cardio', stat: 'CON', category: 'physical', icon: '🏃', color: 'yellow' },
  { value: 'flexibility', label: 'Flexibility/Yoga', stat: 'DEX', category: 'physical', icon: '🧘', color: 'green' },
  { value: 'meditation', label: 'Meditation', stat: 'WIS', category: 'mental', icon: '🧠', color: 'purple' },
  { value: 'sleep', label: 'Sleep', stat: 'CON', category: 'physical', icon: '😴', color: 'yellow' },
  { value: 'learning', label: 'Learning', stat: 'INT', category: 'learning', icon: '📚', color: 'blue' },
  { value: 'social', label: 'Social Activity', stat: 'CHA', category: 'social', icon: '👥', color: 'pink' },
];

const INTENSITY_LEVELS = [
  { value: 'low', label: 'Low', emoji: '🌱', description: 'Light effort' },
  { value: 'moderate', label: 'Moderate', emoji: '⚡', description: 'Steady effort' },
  { value: 'high', label: 'High', emoji: '🔥', description: 'Challenging' },
  { value: 'max', label: 'Max', emoji: '💥', description: 'All out!' },
];

const STAT_COLORS = {
  STR: 'red',
  DEX: 'green',
  CON: 'yellow',
  INT: 'blue',
  WIS: 'purple',
  CHA: 'pink',
};

// Graduated success streak levels
const STREAK_LEVELS = {
  gold: { emoji: '🥇', label: 'Gold', min: 30, color: 'text-amber-500', bgColor: 'bg-amber-500/20' },
  silver: { emoji: '🥈', label: 'Silver', min: 7, color: 'text-gray-400', bgColor: 'bg-gray-400/20' },
  bronze: { emoji: '🥉', label: 'Bronze', min: 1, color: 'text-amber-700', bgColor: 'bg-amber-700/20' },
};

function getStreakLevel(days) {
  if (days >= 30) return 'gold';
  if (days >= 7) return 'silver';
  return 'bronze';
}

export default function HealthActivityLogger({ onActivityLogged }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState(1); // 1: activity, 2: details

  const [formData, setFormData] = useState({
    activityType: '',
    title: '',
    description: '',
    durationMinutes: '',
    intensity: 'moderate',
  });

  const selectedActivity = ACTIVITY_TYPES.find(a => a.value === formData.activityType);

  const handleActivitySelect = (type) => {
    setFormData({ ...formData, activityType: type });
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setFormData({ ...formData, activityType: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const payload = {
        activityType: formData.activityType,
        title: formData.title || `${selectedActivity.label} session`,
        description: formData.description || null,
        durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        intensity: formData.intensity,
      };

      const response = await health.logActivity(payload);

      // Include streak info and narrative event in success state
      const streakInfo = response.data.streak_info || null;
      const narrativeEvent = response.data.narrative_event || null;

      setSuccess({
        xp: response.data.xp_earned,
        stat: response.data.primary_stat,
        streakInfo,
        narrativeEvent,
        activityType: formData.activityType,
      });

      // Reset form
      setFormData({
        activityType: '',
        title: '',
        description: '',
        durationMinutes: '',
        intensity: 'moderate',
      });
      setStep(1);

      // Callback to refresh parent component - include newly unlocked achievements
      if (onActivityLogged) {
        onActivityLogged({
          ...response.data,
          newlyUnlockedAchievements: response.data.newlyUnlockedAchievements || []
        });
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log activity');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Success Toast with Streak Info */}
      {success && (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-xl p-4 animate-fade-in space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/30 flex items-center justify-center text-2xl">
              {ACTIVITY_TYPES.find(a => a.value === success.activityType)?.icon || '✨'}
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-400">Activity Logged!</p>
              <p className="text-sm text-gray-300">
                Earned <span className="text-amber-400 font-semibold">+{success.xp} XP</span> for{' '}
                <span className={`font-semibold text-${STAT_COLORS[success.stat]}-400`}>{success.stat}</span>
              </p>
            </div>
          </div>

          {/* Streak Badge */}
          {success.streakInfo && success.streakInfo.currentStreak > 0 && (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${STREAK_LEVELS[getStreakLevel(success.streakInfo.currentStreak)].bgColor}`}>
              <span className="text-orange-500">🔥</span>
              <span className="text-sm text-white font-medium">
                {success.streakInfo.currentStreak} day streak!
              </span>
              <span className="text-sm">
                {STREAK_LEVELS[getStreakLevel(success.streakInfo.currentStreak)].emoji}
              </span>
              {success.streakInfo.currentStreak === 7 && (
                <span className="text-xs text-amber-400 ml-auto">+100 XP Bonus!</span>
              )}
            </div>
          )}

          {/* Narrative Event (Story Integration) */}
          {success.narrativeEvent && success.narrativeEvent.event_description && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-xs text-purple-400 mb-1">📖 Journal Entry:</p>
              <p className="text-sm text-gray-300 italic">
                "{success.narrativeEvent.event_description}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Step 1: Activity Type Selection */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-4">Choose your activity type:</p>
          <div className="grid grid-cols-2 gap-3">
            {ACTIVITY_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => handleActivitySelect(type.value)}
                className={`
                  p-4 rounded-xl border text-left transition-all duration-200
                  bg-[#1a0a2e]/60 border-${type.color}-500/30
                  hover:bg-${type.color}-500/10 hover:border-${type.color}-500/50
                  focus:outline-none focus:ring-2 focus:ring-${type.color}-500/50
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{type.label}</p>
                    <p className={`text-xs text-${type.color}-400`}>{type.stat}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Activity Details */}
      {step === 2 && selectedActivity && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          {/* Selected Activity Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedActivity.icon}</span>
              <span className="font-semibold text-white">{selectedActivity.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-${selectedActivity.color}-500/20 text-${selectedActivity.color}-400`}>
                {selectedActivity.stat}
              </span>
            </div>
          </div>

          {/* Duration & Intensity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Duration</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  placeholder="30"
                  min="1"
                  max="1440"
                  className="w-full bg-[#1a0a2e]/60 text-white rounded-xl px-4 py-3 pr-12 border border-purple-900/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">min</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Intensity</label>
              <select
                value={formData.intensity}
                onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
                className="w-full bg-[#1a0a2e] text-white rounded-xl px-4 py-3 border border-purple-900/30 focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
              >
                {INTENSITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value} className="bg-[#1a0a2e] text-white">
                    {level.emoji} {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Intensity Legend */}
          <div className="flex gap-2 flex-wrap">
            {INTENSITY_LEVELS.map(level => (
              <button
                key={level.value}
                type="button"
                onClick={() => setFormData({ ...formData, intensity: level.value })}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${formData.intensity === level.value
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-[#1a0a2e]/40 text-gray-400 border border-transparent hover:border-purple-900/30'
                  }
                `}
              >
                {level.emoji} {level.label}
              </button>
            ))}
          </div>

          {/* Title (Optional) */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Title (optional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={`e.g., "Morning ${selectedActivity.label}"`}
              className="w-full bg-[#1a0a2e]/60 text-white rounded-xl px-4 py-3 border border-purple-900/30 focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-600"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="How did it go? Any achievements?"
              rows={2}
              className="w-full bg-[#1a0a2e]/60 text-white rounded-xl px-4 py-3 border border-purple-900/30 focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-600 resize-none"
            />
          </div>

          {/* XP Preview */}
          {formData.durationMinutes && (
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Estimated XP:</span>
                <span className="text-lg font-bold text-amber-400">
                  +{calculateEstimatedXP(formData)} XP
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.durationMinutes} min at {formData.intensity} intensity
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !formData.durationMinutes}
            className={`
              w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
              ${isLoading || !formData.durationMinutes
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Logging...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>✨</span>
                Log Activity
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// Helper function to estimate XP (matches backend calculation)
function calculateEstimatedXP(formData) {
  const baseXPPerMinute = 5;
  const intensityMultipliers = {
    low: 1.0,
    moderate: 1.5,
    high: 2.0,
    max: 3.0
  };

  const duration = parseInt(formData.durationMinutes) || 0;
  const multiplier = intensityMultipliers[formData.intensity] || 1.0;

  return Math.floor(baseXPPerMinute * duration * multiplier);
}
