import { useState } from 'react';

/**
 * CombatMargin - Margin annotations for combat encounters
 * Displays enemy info, health conditions, and combat state
 * in a subtle, journal-margin style
 */
export default function CombatMargin({
  combat,
  healthConditions = [],
  onEnemyHover = null,
  className = ''
}) {
  const [hoveredEnemy, setHoveredEnemy] = useState(null);

  if (!combat) return null;

  const { enemies = [], round = 1, currentTurn } = combat;

  // Calculate HP percentage for bar display
  const getHPPercentage = (current, max) => {
    return Math.max(0, Math.min(100, (current / max) * 100));
  };

  // Get HP bar color based on percentage
  const getHPColor = (percentage) => {
    if (percentage > 60) return 'var(--color-dex)';
    if (percentage > 30) return 'var(--gold-muted)';
    return 'var(--color-str)';
  };

  return (
    <div className={`combat-margin ${className}`}>
      {/* Round indicator */}
      <div className="handwritten text-center mb-4 text-lg">
        Round {round}
      </div>

      {/* Enemy list */}
      <div className="space-y-3">
        {enemies.map((enemy, index) => {
          const hpPercent = getHPPercentage(enemy.currentHP, enemy.maxHP);
          const isCurrentTurn = currentTurn === index;

          return (
            <div
              key={enemy.id || index}
              className={`combat-margin-enemy relative ${isCurrentTurn ? 'ring-1 ring-gold-muted/50 -mx-2 px-2 py-1 rounded' : ''}`}
              onMouseEnter={() => {
                setHoveredEnemy(enemy);
                onEnemyHover?.(enemy);
              }}
              onMouseLeave={() => {
                setHoveredEnemy(null);
                onEnemyHover?.(null);
              }}
            >
              {/* Enemy name */}
              <div className="enemy-name flex items-center gap-2">
                <span>{enemy.name}</span>
                {isCurrentTurn && <span className="text-xs opacity-60">(acting)</span>}
              </div>

              {/* HP bar */}
              <div className="mt-1 h-1.5 bg-gray-300/30 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${hpPercent}%`,
                    backgroundColor: getHPColor(hpPercent)
                  }}
                />
              </div>

              {/* HP text - shown on hover */}
              {hoveredEnemy?.id === enemy.id && (
                <div className="enemy-stats mt-1">
                  {enemy.currentHP}/{enemy.maxHP} HP
                  {enemy.zone && <span className="ml-2">({enemy.zone})</span>}
                </div>
              )}

              {/* Enemy conditions */}
              {enemy.conditions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {enemy.conditions.map((condition, i) => (
                    <span
                      key={i}
                      className="text-xs px-1 py-0.5 rounded bg-gray-200/30"
                      title={condition.description}
                    >
                      {condition.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      {healthConditions.length > 0 && <div className="journal-divider my-4" />}

      {/* Player health conditions */}
      {healthConditions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider opacity-60">Your Conditions</div>
          {healthConditions.map((condition, index) => (
            <div
              key={index}
              className={`health-buff ${condition.type === 'debuff' ? 'debuff' : ''}`}
              title={condition.description}
            >
              <span>{condition.icon || (condition.type === 'buff' ? '✨' : '😔')}</span>
              <span>{condition.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Combat hint */}
      <div className="mt-4 text-xs opacity-50 italic">
        Describe your actions in the narrative below
      </div>
    </div>
  );
}
