import { useState, useEffect } from 'react';

export default function CombatUI({ combat, onAction, isLoading }) {
  const [actionInput, setActionInput] = useState('');

  if (!combat) return null;

  const { encounter, enemies, playerZone, currentRound, currentTurnIndex, initiativeOrder, activeConditions } = combat;

  const aliveEnemies = enemies?.filter(e => e.currentHp > 0) || [];
  const currentTurn = initiativeOrder?.[currentTurnIndex];

  const handleQuickAction = (action) => {
    onAction(action);
    setActionInput('');
  };

  const handleCustomAction = (e) => {
    e.preventDefault();
    if (!actionInput.trim()) return;
    onAction(actionInput);
    setActionInput('');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border-2 border-red-500 shadow-lg mb-4">
      {/* Combat Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <h2 className="text-xl font-bold text-red-400">COMBAT</h2>
        </div>
        <div className="text-sm text-gray-300">
          Round {currentRound} | Turn: {currentTurn?.name || 'Unknown'}
        </div>
      </div>

      {/* Active Conditions */}
      {activeConditions && activeConditions.length > 0 && (
        <div className="mb-4 p-3 bg-purple-900/30 rounded border border-purple-500">
          <div className="text-xs text-purple-300 mb-1">Active Conditions</div>
          <div className="flex flex-wrap gap-2">
            {activeConditions.map((condition, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-purple-800/50 text-purple-200 px-2 py-1 rounded text-sm"
              >
                {condition.emoji} {condition.display_name}
                <span className="text-xs text-purple-400">({condition.duration_remaining}r)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Enemies */}
      <div className="space-y-3 mb-4">
        {aliveEnemies.map((enemy, idx) => {
          const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
          return (
            <div key={idx} className="bg-gray-700 rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-white">{enemy.name}</div>
                <div className="text-sm text-gray-300">
                  {enemy.currentHp}/{enemy.maxHp} HP
                </div>
              </div>
              {/* HP Bar */}
              <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Zone: {enemy.zone} | AC: {enemy.ac}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Zone Info */}
      <div className="bg-blue-900/30 rounded p-2 mb-4 border border-blue-500">
        <div className="text-xs text-blue-300">Your Position</div>
        <div className="text-sm text-blue-100 font-semibold">{playerZone} range</div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => handleQuickAction('I attack with my weapon')}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
        >
          ⚔️ Attack
        </button>
        <button
          onClick={() => handleQuickAction('I move to near range')}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
        >
          🏃 Move
        </button>
        <button
          onClick={() => handleQuickAction('I defend')}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
        >
          🛡️ Defend
        </button>
      </div>

      {/* Custom Action */}
      <form onSubmit={handleCustomAction} className="flex gap-2">
        <input
          type="text"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          placeholder="Custom action..."
          disabled={isLoading}
          className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !actionInput.trim()}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-gray-900 font-bold px-4 py-2 rounded text-sm transition-colors"
        >
          Go
        </button>
      </form>
    </div>
  );
}
