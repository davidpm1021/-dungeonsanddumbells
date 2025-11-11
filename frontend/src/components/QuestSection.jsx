import { useState } from 'react';
import QuestCard from './QuestCard';

/**
 * QuestSection Component
 * Groups quests by type with collapsible sections and priority styling
 *
 * Props:
 * - title: Section title (e.g., "Main Story", "Side Quests")
 * - icon: Emoji icon for the section
 * - quests: Array of quests in this section
 * - questStatus: Current tab ('available', 'active', 'completed')
 * - onAccept: Quest accept handler
 * - onCompleteObjective: Objective completion handler
 * - onMakeChoice: Choice handler
 * - character: Character object
 * - urgent: Whether to highlight as urgent (world events)
 * - collapsible: Whether section can be collapsed
 */
export default function QuestSection({
  title,
  icon,
  quests = [],
  questStatus,
  onAccept,
  onCompleteObjective,
  onMakeChoice,
  character,
  urgent = false,
  collapsible = false
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (quests.length === 0) return null;

  // Determine section styling
  const getBorderColor = () => {
    if (urgent) return 'border-red-300 bg-red-50/50';
    if (title === 'Main Story') return 'border-purple-300 bg-purple-50/50';
    if (title === 'Your Path') return 'border-blue-300 bg-blue-50/50';
    return 'border-gray-300 bg-gray-50/50';
  };

  const getHeaderColor = () => {
    if (urgent) return 'text-red-800 bg-red-100 border-red-300';
    if (title === 'Main Story') return 'text-purple-800 bg-purple-100 border-purple-300';
    if (title === 'Your Path') return 'text-blue-800 bg-blue-100 border-blue-300';
    return 'text-gray-800 bg-gray-100 border-gray-300';
  };

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${getBorderColor()}`}>
      {/* Section Header */}
      <div className={`px-4 py-3 border-b-2 ${getHeaderColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h2 className="text-lg font-display font-bold">{title}</h2>
              <p className="text-xs opacity-75">
                {quests.length} {quests.length === 1 ? 'quest' : 'quests'}
                {urgent && <span className="ml-2 font-bold">⏰ Time Limited!</span>}
              </p>
            </div>
          </div>

          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-3 py-1 rounded hover:bg-white/50 transition-colors text-sm font-medium"
            >
              {isCollapsed ? '▼ Expand' : '▲ Collapse'}
            </button>
          )}
        </div>
      </div>

      {/* Quest Cards */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 bg-white">
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onAccept={questStatus === 'available' ? onAccept : null}
              onComplete={questStatus === 'active' ? null : null} // Quest completion happens via objectives
              onCompleteObjective={questStatus === 'active' ? onCompleteObjective : null}
              onMakeChoice={onMakeChoice}
              character={character}
            />
          ))}
        </div>
      )}
    </div>
  );
}
