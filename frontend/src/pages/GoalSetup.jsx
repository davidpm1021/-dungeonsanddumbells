import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { goals } from '../services/api';
import useCharacterStore from '../stores/characterStore';

const STAT_INFO = {
  str: { name: 'Strength', color: 'str', description: 'Physical power and weightlifting' },
  dex: { name: 'Dexterity', color: 'dex', description: 'Agility, cardio, and flexibility' },
  con: { name: 'Constitution', color: 'con', description: 'Endurance and stamina' },
  int: { name: 'Intelligence', color: 'int', description: 'Learning and mental challenges' },
  wis: { name: 'Wisdom', color: 'wis', description: 'Mindfulness and recovery' },
  cha: { name: 'Charisma', color: 'cha', description: 'Social wellness and confidence' },
};

const GOAL_TYPES = {
  binary: 'Binary (Yes/No)',
  quantitative: 'Quantitative (Track a number)',
  streak: 'Streak (Consecutive days)',
};

const FREQUENCIES = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function GoalSetup() {
  const navigate = useNavigate();
  const { addGoal } = useCharacterStore();

  const [goalList, setGoalList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'binary',
    frequency: 'daily',
    targetValue: '',
    stat: 'str',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
        statMapping: formData.stat,
      };

      // Add targetValue only for quantitative goals
      if (formData.type === 'quantitative') {
        goalData.targetValue = parseInt(formData.targetValue);
      }

      const response = await goals.create(goalData);
      const newGoal = response.data;

      addGoal(newGoal);
      setGoalList([...goalList, newGoal]);

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'binary',
        frequency: 'daily',
        targetValue: '',
        stat: 'str',
      });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (goalList.length === 0) {
      setError('Please add at least one goal to get started.');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card mb-6">
          <h1 className="text-3xl font-display font-bold text-primary mb-2">
            Set Your Wellness Goals
          </h1>
          <p className="text-gray-600">
            Define the goals you want to track. Each goal awards XP to a specific stat when
            completed.
          </p>
        </div>

        {/* Goals list */}
        {goalList.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-display font-bold mb-4">Your Goals</h2>
            <div className="space-y-3">
              {goalList.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{goal.title}</h3>
                      <span
                        className={`stat-badge-${goal.stat} px-2 py-0.5 rounded text-xs font-medium`}
                      >
                        {goal.stat.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {FREQUENCIES[goal.frequency]}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {GOAL_TYPES[goal.type]}
                      {goal.type === 'quantitative' && ` (Target: ${goal.target_value})`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add goal form */}
        {showForm ? (
          <div className="card mb-6">
            <h2 className="text-xl font-display font-bold mb-4">Add New Goal</h2>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label htmlFor="title" className="label">
                  Goal Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 30-minute workout"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label htmlFor="description" className="label">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input"
                  placeholder="Add details about this goal..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="label">
                    Goal Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    {Object.entries(GOAL_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="frequency" className="label">
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    {Object.entries(FREQUENCIES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.type === 'quantitative' && (
                <div>
                  <label htmlFor="targetValue" className="label">
                    Target Value
                  </label>
                  <input
                    type="number"
                    id="targetValue"
                    name="targetValue"
                    value={formData.targetValue}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g., 10000 (steps)"
                    required={formData.type === 'quantitative'}
                    min={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The number you need to reach to complete this goal
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="stat" className="label">
                  Stat to Level Up
                </label>
                <select
                  id="stat"
                  name="stat"
                  value={formData.stat}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  {Object.entries(STAT_INFO).map(([value, info]) => (
                    <option key={value} value={value}>
                      {info.name} - {info.description}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Goal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-secondary w-full"
            >
              + Add Goal
            </button>
          </div>
        )}

        {/* Finish button */}
        <div className="card">
          <button onClick={handleFinish} className="btn btn-primary w-full">
            {goalList.length === 0 ? 'Skip for now' : `Continue with ${goalList.length} goal${goalList.length > 1 ? 's' : ''}`}
          </button>
          {goalList.length === 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              You can add goals later from your dashboard
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
