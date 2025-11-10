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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4 py-12">
      <div className="card max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-primary mb-2">
            Create Your Character
          </h1>
          <p className="text-gray-600">
            Welcome, {user?.username}! Choose a name for your adventure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="characterName" className="label">
              Character Name
            </label>
            <input
              type="text"
              id="characterName"
              name="characterName"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="input"
              placeholder="Sir Swole of the Iron Temple"
              required
              minLength={2}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a name that reflects your fitness journey
            </p>
          </div>

          <div>
            <label htmlFor="characterClass" className="label">
              Character Class
            </label>
            <select
              id="characterClass"
              name="characterClass"
              value={characterClass}
              onChange={(e) => setCharacterClass(e.target.value)}
              className="input"
              required
            >
              <option value="Fighter">Fighter - Master of Strength & Constitution (cardio & lifting)</option>
              <option value="Mage">Mage - Scholar of Intelligence & Wisdom (learning & mindfulness)</option>
              <option value="Rogue">Rogue - Expert in Dexterity & Charisma (agility & social)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose a class that reflects your fitness focus. All stats start at 10 and level up through completing goals!
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-display font-bold text-blue-900 mb-2">
              Your Starting Stats
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              All stats begin at level 10. As you complete wellness goals, you'll earn XP to
              level up your character!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="stat-badge-str px-2 py-1 rounded text-sm font-medium">
                  STR 10
                </span>
                <span className="text-sm text-gray-600">Strength</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-badge-dex px-2 py-1 rounded text-sm font-medium">
                  DEX 10
                </span>
                <span className="text-sm text-gray-600">Dexterity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-badge-con px-2 py-1 rounded text-sm font-medium">
                  CON 10
                </span>
                <span className="text-sm text-gray-600">Constitution</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-badge-int px-2 py-1 rounded text-sm font-medium">
                  INT 10
                </span>
                <span className="text-sm text-gray-600">Intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-badge-wis px-2 py-1 rounded text-sm font-medium">
                  WIS 10
                </span>
                <span className="text-sm text-gray-600">Wisdom</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-badge-cha px-2 py-1 rounded text-sm font-medium">
                  CHA 10
                </span>
                <span className="text-sm text-gray-600">Charisma</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating character...' : 'Begin Your Journey'}
          </button>
        </form>
      </div>
    </div>
  );
}
