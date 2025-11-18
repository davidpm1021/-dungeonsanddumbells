import { useState } from 'react';
import { health } from '../services/api';

const ACTIVITY_TYPES = [
  { value: 'strength', label: '💪 Strength Training', stat: 'STR', category: 'physical' },
  { value: 'cardio', label: '🏃 Cardio', stat: 'CON', category: 'physical' },
  { value: 'flexibility', label: '🧘 Flexibility/Yoga', stat: 'DEX', category: 'physical' },
  { value: 'meditation', label: '🧠 Meditation', stat: 'WIS', category: 'mental' },
  { value: 'sleep', label: '😴 Sleep', stat: 'CON', category: 'physical' },
  { value: 'learning', label: '📚 Learning', stat: 'INT', category: 'learning' },
  { value: 'social', label: '👥 Social Activity', stat: 'CHA', category: 'social' },
];

const INTENSITY_LEVELS = [
  { value: 'low', label: 'Low', emoji: '🌱' },
  { value: 'moderate', label: 'Moderate', emoji: '⚡' },
  { value: 'high', label: 'High', emoji: '🔥' },
  { value: 'max', label: 'Max', emoji: '💥' },
];

export default function HealthActivityLogger({ onActivityLogged }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    activityType: 'strength',
    title: '',
    description: '',
    durationMinutes: '',
    intensity: 'moderate',
  });

  const selectedActivity = ACTIVITY_TYPES.find(a => a.value === formData.activityType);

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

      setSuccess(`Activity logged! Earned ${response.data.xp_earned} XP for ${response.data.primary_stat}`);

      // Reset form
      setFormData({
        ...formData,
        title: '',
        description: '',
        durationMinutes: '',
      });

      // Callback to refresh parent component
      if (onActivityLogged) {
        onActivityLogged(response.data);
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
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">Log Health Activity</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Activity Type */}
        <div>
          <label className="block text-gray-300 mb-2 font-semibold">Activity Type</label>
          <select
            value={formData.activityType}
            onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {ACTIVITY_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label} → {type.stat}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-1">
            Improves <span className="text-yellow-400">{selectedActivity.stat}</span> stat
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-gray-300 mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={`e.g., "Morning ${selectedActivity.label}"`}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* Duration & Intensity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
              placeholder="30"
              min="1"
              max="1440"
              className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Intensity</label>
            <select
              value={formData.intensity}
              onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {INTENSITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.emoji} {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-gray-300 mb-2">Notes (optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="How did it go? Any achievements or challenges?"
            rows={3}
            className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !formData.activityType}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-gray-900 font-bold py-3 rounded transition-colors"
        >
          {isLoading ? 'Logging...' : 'Log Activity'}
        </button>
      </form>

      {/* XP Preview */}
      {formData.durationMinutes && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded border border-gray-600">
          <p className="text-sm text-gray-300">
            <span className="text-yellow-400">Estimated XP:</span> {calculateEstimatedXP(formData)} XP
            <br />
            <span className="text-xs text-gray-400">
              Based on {formData.durationMinutes} minutes at {formData.intensity} intensity
            </span>
          </p>
        </div>
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
