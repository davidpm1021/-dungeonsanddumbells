import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';
import { characters, goals as goalsApi } from '../services/api';
import StatCard from '../components/StatCard';
import GoalCard from '../components/GoalCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { character, goals, setCharacter, setGoals, updateCharacterXP } = useCharacterStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load character
      const charResponse = await characters.get();

      if (!charResponse.data) {
        // No character yet, redirect to creation
        navigate('/character/create');
        return;
      }

      setCharacter(charResponse.data);

      // Load goals
      const goalsResponse = await goalsApi.getAll();
      setGoals(goalsResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoal = async (goalId, payload) => {
    try {
      const response = await goalsApi.complete(goalId, payload);
      const { goal, character: updatedCharacter } = response.data;

      // Update the goal in the store
      setGoals(goals.map((g) => (g.id === goal.id ? goal : g)));

      // Update character stats
      setCharacter(updatedCharacter);
    } catch (err) {
      console.error('Error completing goal:', err);
      throw err;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={loadDashboardData} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return null; // Will redirect to character creation
  }

  const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-display font-bold text-primary">
                Dumbbells & Dragons
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user?.username}</span>!
              </span>
              <button onClick={handleLogout} className="btn btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Character Header */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-display font-bold text-gray-900">
                {character.name}
              </h2>
              <p className="text-gray-600">Level {character.level}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total XP</p>
              <p className="text-2xl font-bold text-primary">{character.total_xp}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-display font-bold mb-4">Your Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <StatCard
                key={stat}
                stat={stat}
                value={character[stat]}
                xp={character[`${stat}_xp`]}
                xpNeeded={character[`${stat}_xp_needed`]}
              />
            ))}
          </div>
        </div>

        {/* Goals Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-bold">Daily Goals</h3>
            <button
              onClick={() => navigate('/goals/setup')}
              className="btn btn-secondary text-sm"
            >
              + Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-600 mb-4">
                You haven't set any goals yet. Add your first wellness goal to start earning XP!
              </p>
              <button
                onClick={() => navigate('/goals/setup')}
                className="btn btn-primary"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onComplete={handleCompleteGoal} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
