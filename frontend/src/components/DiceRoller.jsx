import { useState } from 'react';

/**
 * DiceRoller Component
 *
 * Allows players to roll dice either digitally or enter manual rolls.
 * Supports different dice types and purposes (initiative, attack, skill check, damage).
 *
 * Props:
 * - diceType: Type of dice (default: 'd20')
 * - modifier: Numeric modifier to add to roll (default: 0)
 * - modifierLabel: Label for modifier display (e.g., 'DEX', 'STR')
 * - onRollSubmit: Callback when roll is submitted ({ roll, total, modifier })
 * - purpose: Purpose of roll - 'initiative', 'attack', 'skill', 'damage' (default: 'roll')
 * - isLoading: Whether submission is in progress
 */
export default function DiceRoller({
  diceType = 'd20',
  modifier = 0,
  modifierLabel = '',
  onRollSubmit,
  purpose = 'roll',
  isLoading = false
}) {
  const [roll, setRoll] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [isRolling, setIsRolling] = useState(false);

  // Get max value for dice type
  const getDiceMax = () => {
    const match = diceType.match(/d(\d+)/);
    return match ? parseInt(match[1]) : 20;
  };

  const diceMax = getDiceMax();

  // Handle digital dice roll
  const handleDigitalRoll = () => {
    setIsRolling(true);
    setManualInput(''); // Clear manual input when rolling digitally

    // Animate dice roll (1 second)
    setTimeout(() => {
      const result = Math.floor(Math.random() * diceMax) + 1;
      setRoll(result);
      setIsRolling(false);
    }, 1000);
  };

  // Handle manual dice input
  const handleManualSubmit = () => {
    const value = parseInt(manualInput);
    if (value >= 1 && value <= diceMax) {
      setRoll(value);
    }
  };

  // Handle final submission
  const handleSubmit = () => {
    if (roll && onRollSubmit) {
      onRollSubmit({
        roll,
        total: roll + modifier,
        modifier
      });
    }
  };

  const total = roll !== null ? roll + modifier : null;

  // Get color scheme based on purpose
  const getColorScheme = () => {
    switch (purpose) {
      case 'initiative':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-900/30',
          text: 'text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          emoji: '⚡'
        };
      case 'attack':
        return {
          border: 'border-red-500',
          bg: 'bg-red-900/30',
          text: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-700',
          emoji: '⚔️'
        };
      case 'skill':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-900/30',
          text: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700',
          emoji: '🎯'
        };
      case 'damage':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-900/30',
          text: 'text-orange-400',
          button: 'bg-orange-600 hover:bg-orange-700',
          emoji: '💥'
        };
      default:
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-900/30',
          text: 'text-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700',
          emoji: '🎲'
        };
    }
  };

  const colors = getColorScheme();

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-2 ${colors.border} shadow-lg mb-4`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{colors.emoji}</span>
        <h3 className={`text-lg font-bold ${colors.text}`}>
          Roll {diceType}
          {modifier !== 0 && (
            <span className="ml-2">
              {modifier >= 0 ? '+' : ''}{modifier}
              {modifierLabel && <span className="text-sm ml-1">({modifierLabel})</span>}
            </span>
          )}
        </h3>
      </div>

      {/* Digital Dice Roller */}
      <div className={`${colors.bg} rounded p-4 mb-4 border ${colors.border}`}>
        <div className="flex flex-col items-center gap-3">
          {/* Dice Display */}
          <div className="relative">
            <div
              className={`
                w-24 h-24 rounded-lg flex items-center justify-center text-4xl font-bold
                bg-gray-700 border-2 ${colors.border} ${colors.text}
                ${isRolling ? 'animate-spin' : ''}
                transition-transform duration-300
              `}
              style={{
                transformStyle: 'preserve-3d',
                transform: isRolling ? 'rotateX(360deg) rotateY(360deg)' : 'none'
              }}
            >
              {roll !== null ? roll : '?'}
            </div>
          </div>

          {/* Roll Button */}
          <button
            onClick={handleDigitalRoll}
            disabled={isRolling || isLoading}
            className={`
              ${colors.button} disabled:bg-gray-600 text-white px-6 py-2 rounded-lg
              font-semibold transition-colors shadow-md
              ${!isRolling && !isLoading ? 'hover:scale-105 transform transition-transform' : ''}
            `}
          >
            {isRolling ? 'Rolling...' : `🎲 Roll ${diceType}`}
          </button>
        </div>
      </div>

      {/* Manual Input Option */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2 text-center">
          Or enter your physical dice roll:
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max={diceMax}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualSubmit();
              }
            }}
            placeholder={`Enter 1-${diceMax}`}
            disabled={isRolling || isLoading}
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualInput || isRolling || isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
          >
            Use This
          </button>
        </div>
      </div>

      {/* Result Display */}
      {roll !== null && (
        <div className={`${colors.bg} rounded p-4 border ${colors.border}`}>
          <div className="text-center mb-3">
            <div className="text-sm text-gray-300 mb-1">Result</div>
            <div className={`text-2xl font-bold ${colors.text}`}>
              {roll}
              {modifier !== 0 && (
                <>
                  <span className="text-gray-400 mx-2">
                    {modifier >= 0 ? '+' : ''}
                  </span>
                  <span className="text-gray-300">{Math.abs(modifier)}</span>
                  <span className="text-gray-400 mx-2">=</span>
                  <span className={colors.text}>{total}</span>
                </>
              )}
            </div>
            {roll === diceMax && diceType === 'd20' && (
              <div className="text-xs text-yellow-400 mt-1 font-semibold">
                ⭐ NATURAL {diceMax}! CRITICAL! ⭐
              </div>
            )}
            {roll === 1 && diceType === 'd20' && (
              <div className="text-xs text-red-400 mt-1 font-semibold">
                💀 NATURAL 1! CRITICAL FAIL! 💀
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              w-full ${colors.button} disabled:bg-gray-600 text-white py-3 rounded-lg
              font-bold text-lg transition-colors shadow-lg
              ${!isLoading ? 'hover:scale-105 transform transition-transform' : ''}
            `}
          >
            {isLoading ? 'Submitting...' : 'Submit Roll'}
          </button>
        </div>
      )}
    </div>
  );
}
