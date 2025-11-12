import { useState, useEffect } from 'react';
import QuestChoice from './QuestChoice';
import { quests as questsApi } from '../services/api';

const QUEST_STATUS_INFO = {
  available: { label: 'Available', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  active: { label: 'In Progress', color: 'bg-green-50 text-green-700 border-green-200' },
  completed: { label: 'Completed', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700 border-red-200' },
};

export default function QuestCard({ quest, onAccept, onComplete, onCompleteObjective, onMakeChoice, onAbandon, character }) {
  const [showDetails, setShowDetails] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [choices, setChoices] = useState([]);
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const statusInfo = QUEST_STATUS_INFO[quest.status] || QUEST_STATUS_INFO.available;

  // Load choices for active quests
  useEffect(() => {
    if (quest.status === 'active' && character) {
      loadChoices();
    }
  }, [quest.id, quest.status, character]);

  // Update timer for time-limited quests
  useEffect(() => {
    if (quest.expiresAt || quest.expires_at) {
      const updateTimer = () => {
        const expiryDate = new Date(quest.expiresAt || quest.expires_at);
        const now = new Date();
        const diff = expiryDate - now;

        if (diff <= 0) {
          setTimeRemaining('Expired');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          if (hours < 24) {
            setTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            const days = Math.floor(hours / 24);
            setTimeRemaining(`${days}d ${hours % 24}h`);
          }
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [quest.expiresAt, quest.expires_at]);

  const loadChoices = async () => {
    try {
      setLoadingChoices(true);
      const response = await questsApi.getChoices(quest.id, character.id);
      setChoices(response.data.choices || []);
    } catch (err) {
      console.error('Failed to load choices:', err);
    } finally {
      setLoadingChoices(false);
    }
  };

  // Parse objectives if they're JSON string
  let objectives = [];
  try {
    if (typeof quest.objectives === 'string') {
      objectives = JSON.parse(quest.objectives);
    } else if (Array.isArray(quest.objectives)) {
      objectives = quest.objectives;
    } else if (quest.objectivesJson) {
      objectives = typeof quest.objectivesJson === 'string'
        ? JSON.parse(quest.objectivesJson)
        : quest.objectivesJson;
    }
  } catch (e) {
    console.error('Failed to parse objectives:', e);
  }

  const completedObjectives = objectives.filter(obj => obj.completed).length;
  const allObjectivesComplete = objectives.length > 0 && completedObjectives === objectives.length;

  // Calculate total rewards from objectives
  const totalXpReward = objectives.reduce((sum, obj) => sum + (obj.xpReward || obj.xp_reward || 0), 0);
  const totalGoldReward = quest.goldReward || quest.gold_reward || 0;

  const handleComplete = async () => {
    if (objectives.length > 0 && !allObjectivesComplete) {
      console.log('Please complete all objectives first');
      return;
    }

    setCompleting(true);
    try {
      await onComplete(quest.id);
    } catch (err) {
      console.error('Failed to complete quest:', err);
    } finally {
      setCompleting(false);
    }
  };

  const handleObjectiveClick = async (objective) => {
    if (objective.completed || !onCompleteObjective) return;

    try {
      await onCompleteObjective(quest.id, objective.id);
    } catch (err) {
      console.error('Failed to complete objective:', err);
    }
  };

  const handleMakeChoice = async (choiceId, optionId) => {
    if (!onMakeChoice) return;

    try {
      await onMakeChoice(quest.id, choiceId, optionId);
      // Reload choices after making a choice
      await loadChoices();
    } catch (err) {
      console.error('Failed to make choice:', err);
      throw err;
    }
  };

  const handleAbandon = async () => {
    if (!onAbandon) return;

    if (!confirmAbandon) {
      setConfirmAbandon(true);
      setTimeout(() => setConfirmAbandon(false), 3000); // Reset after 3 seconds
      return;
    }

    setAbandoning(true);
    setConfirmAbandon(false);
    try {
      await onAbandon(quest.id);
    } catch (err) {
      console.error('Failed to abandon quest:', err);
    } finally {
      setAbandoning(false);
    }
  };

  return (
    <div className="card border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📜</span>
            <h3 className="text-lg font-display font-bold text-gray-900">{quest.title}</h3>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {quest.difficulty && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {quest.difficulty}
              </span>
            )}
            {timeRemaining && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">
                ⏰ {timeRemaining}
              </span>
            )}
            {(quest.narrativeWeight || quest.narrative_weight) >= 9 && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 font-bold">
                ‼ Important
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 leading-relaxed italic">
          {quest.description || quest.narrativeText || 'A mysterious quest awaits...'}
        </p>
      </div>

      {/* Opening Scene - Immersive Narrative */}
      {quest.openingScene && (
        <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-purple-700">📖 The Story Unfolds...</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {quest.openingScene}
          </p>
        </div>
      )}

      {/* NPC Dialogue */}
      {quest.npcDialogue && quest.npcDialogue.npcName && (
        <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👤</span>
            <span className="text-sm font-bold text-amber-800">{quest.npcDialogue.npcName}</span>
          </div>
          {quest.npcDialogue.opening && (
            <div className="mb-2">
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{quest.npcDialogue.opening}"
              </p>
            </div>
          )}
          {quest.status === 'active' && quest.npcDialogue.during && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="text-xs text-amber-700 italic">
                💭 {quest.npcDialogue.during}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Objectives */}
      {objectives.length > 0 && quest.status !== 'completed' && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Quest Objectives:</h4>
          <div className="space-y-2">
            {objectives.map((objective, index) => (
              <div
                key={objective.id || index}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  objective.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-purple-100 hover:border-purple-200 cursor-pointer'
                }`}
                onClick={() => !objective.completed && handleObjectiveClick(objective)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {objective.completed ? (
                    <span className="text-green-600 text-lg">✓</span>
                  ) : (
                    <span className="text-purple-400 text-lg">○</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${objective.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                    {objective.description || objective.title || 'Complete this objective'}
                  </p>
                  {objective.targetGoals && objective.targetGoals.length > 0 && (
                    <p className="text-xs text-purple-600 mt-1">
                      Complete: {objective.targetGoals.join(', ')}
                    </p>
                  )}
                  {(objective.xpReward || objective.xp_reward) && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Reward:</span>
                      <span className="text-xs font-medium text-yellow-700">
                        +{objective.xpReward || objective.xp_reward} XP
                      </span>
                      {(objective.statReward || objective.stat_reward) && (
                        <span className="text-xs font-medium text-purple-700">
                          +1 {objective.statReward || objective.stat_reward}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {objectives.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 text-right">
              {completedObjectives} / {objectives.length} objectives complete
            </div>
          )}
        </div>
      )}

      {/* Quest Choices */}
      {quest.status === 'active' && choices.length > 0 && (
        <div className="mb-4">
          {choices.map((choice) => (
            <QuestChoice
              key={choice.id}
              choice={choice}
              onMakeChoice={handleMakeChoice}
              disabled={loadingChoices}
            />
          ))}
        </div>
      )}

      {/* Show More Details */}
      {showDetails && quest.fullNarrative && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-purple-100">
          <p className="text-sm text-gray-600 leading-relaxed">
            {quest.fullNarrative}
          </p>
        </div>
      )}

      {/* Quest Rewards */}
      {quest.status !== 'completed' && (totalXpReward > 0 || totalGoldReward > 0) && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-xs font-bold text-yellow-800 mb-2">Total Quest Rewards:</h4>
          <div className="flex items-center gap-4 text-sm">
            {totalXpReward > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-600">⚡</span>
                <span className="font-medium text-gray-700">+{totalXpReward} XP</span>
              </div>
            )}
            {totalGoldReward > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-600">💰</span>
                <span className="font-medium text-gray-700">{totalGoldReward} Gold</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {quest.status === 'available' && onAccept && (
          <button
            onClick={() => onAccept(quest.id)}
            className="btn btn-primary flex-1"
          >
            Accept Quest
          </button>
        )}

        {quest.status === 'active' && onComplete && (
          <button
            onClick={handleComplete}
            disabled={completing || (objectives.length > 0 && !allObjectivesComplete)}
            className="btn btn-primary flex-1 disabled:opacity-50"
            title={objectives.length > 0 && !allObjectivesComplete ? 'Complete all objectives first' : ''}
          >
            {completing ? 'Completing...' : allObjectivesComplete || objectives.length === 0 ? 'Complete Quest' : `Complete Objectives (${completedObjectives}/${objectives.length})`}
          </button>
        )}

        {quest.status === 'completed' && (
          <div className="flex-1 text-center py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
            ✓ Quest Completed
          </div>
        )}

        {quest.fullNarrative && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-secondary text-sm"
          >
            {showDetails ? 'Less' : 'More'}
          </button>
        )}

        {/* Abandon button for non-completed quests */}
        {quest.status !== 'completed' && onAbandon && (
          <button
            onClick={handleAbandon}
            disabled={abandoning}
            className={`btn text-sm disabled:opacity-50 ${
              confirmAbandon
                ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
            }`}
            title={confirmAbandon ? 'Click again to confirm' : 'Abandon this quest'}
          >
            {abandoning ? 'Abandoning...' : confirmAbandon ? '⚠ Click to Confirm' : '🗑️ Abandon'}
          </button>
        )}
      </div>
    </div>
  );
}
