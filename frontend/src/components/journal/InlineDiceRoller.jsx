import { useState, useCallback } from 'react';
import haptics from '../../utils/haptics';

/**
 * InlineDiceRoller - Subtle inline dice roller for skill checks and combat
 * Appears within the narrative flow rather than as a modal/popup
 */
export default function InlineDiceRoller({
  rollType = 'skill_check', // 'skill_check', 'attack', 'initiative', 'saving_throw'
  skillName = null,
  modifier = 0,
  dc = null,
  advantage = false,
  disadvantage = false,
  healthConditions = [],
  onRoll,
  isLoading = false,
  className = ''
}) {
  const [result, setResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  // Roll a d20
  const rollD20 = useCallback(() => {
    return Math.floor(Math.random() * 20) + 1;
  }, []);

  // Handle the roll
  const handleRoll = useCallback(async () => {
    if (isRolling || isLoading) return;

    setIsRolling(true);
    haptics.mediumTap();

    // Roll with advantage/disadvantage
    let roll;
    if (advantage && !disadvantage) {
      const r1 = rollD20();
      const r2 = rollD20();
      roll = Math.max(r1, r2);
    } else if (disadvantage && !advantage) {
      const r1 = rollD20();
      const r2 = rollD20();
      roll = Math.min(r1, r2);
    } else {
      roll = rollD20();
    }

    const total = roll + modifier;
    const success = dc ? total >= dc : null;
    const isCrit = roll === 20;
    const isCritFail = roll === 1;

    // Animate the result
    await new Promise(resolve => setTimeout(resolve, 300));

    const rollResult = {
      roll,
      total,
      modifier,
      success,
      isCrit,
      isCritFail,
      dc,
      rollType,
      skillName
    };

    setResult(rollResult);
    setIsRolling(false);

    if (isCrit) haptics.success();
    else if (isCritFail) haptics.error();
    else if (success) haptics.lightTap();

    // Notify parent
    onRoll?.(rollResult);
  }, [rollD20, modifier, dc, advantage, disadvantage, onRoll, rollType, skillName, isRolling, isLoading]);

  // Format the roll prompt text
  const getPromptText = () => {
    const modSign = modifier >= 0 ? '+' : '';
    const base = skillName ? `Roll ${skillName}!` : 'Roll d20!';
    const modText = modifier !== 0 ? ` ${modSign}${modifier}` : '';
    const dcText = dc ? ` vs DC ${dc}` : '';
    return `${base} d20${modText}${dcText}`;
  };

  // Get result display
  const getResultClass = () => {
    if (!result) return '';
    if (result.isCrit) return 'text-gold-bright font-bold';
    if (result.isCritFail) return 'text-red-700 font-bold';
    if (result.success === true) return 'text-green-700';
    if (result.success === false) return 'text-red-600';
    return '';
  };

  return (
    <div className={`inline-flex flex-col gap-2 my-4 ${className}`}>
      {/* Roll prompt */}
      {!result && (
        <button
          onClick={handleRoll}
          disabled={isRolling || isLoading}
          className={`inline-dice-roller ${isRolling ? 'animate-pulse' : ''}`}
        >
          <span className="text-lg">🎲</span>
          <span>{getPromptText()}</span>
          {(advantage || disadvantage) && (
            <span className="text-xs opacity-70">
              ({advantage ? 'Adv' : 'Dis'})
            </span>
          )}
        </button>
      )}

      {/* Health conditions affecting roll */}
      {!result && healthConditions.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-2">
          {healthConditions.map((condition, i) => (
            <span
              key={i}
              className={`health-buff ${condition.type === 'debuff' ? 'debuff' : ''}`}
              title={condition.description}
            >
              {condition.icon} {condition.name}
            </span>
          ))}
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className={`roll-result ${result.success !== null ? (result.success ? 'success' : 'failure') : ''}`}>
          <span className="text-lg mr-1">🎲</span>
          <span className={getResultClass()}>
            {result.isCrit && '✨ Natural 20! '}
            {result.isCritFail && '💀 Natural 1! '}
            {!result.isCrit && !result.isCritFail && (
              <>
                {result.roll}
                {result.modifier !== 0 && ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}`}
                {' = '}
                <strong>{result.total}</strong>
              </>
            )}
            {dc && (
              <span className="ml-2 opacity-70">
                vs DC {dc} - {result.success ? 'Success!' : 'Failed'}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
