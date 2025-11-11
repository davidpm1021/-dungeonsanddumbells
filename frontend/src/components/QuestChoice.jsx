import { useState } from 'react';

/**
 * QuestChoice Component
 * Displays a choice point in a quest with multiple options
 *
 * Props:
 * - choice: The choice object with options
 * - onMakeChoice: Callback when player selects an option
 * - disabled: Whether choices are disabled
 */
export default function QuestChoice({ choice, onMakeChoice, disabled = false }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [making, setMaking] = useState(false);

  // If choice already made, show the result
  if (choice.choice_made !== null) {
    const madeOption = choice.choice_options.find(opt => opt.id === choice.choice_made);

    return (
      <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg mb-4">
        <h4 className="text-sm font-bold text-purple-900 mb-2">Choice Made</h4>
        <p className="text-sm text-gray-700 mb-3">{choice.choice_point_description}</p>
        <div className="p-3 bg-white border-2 border-purple-400 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-600">✓</span>
            <span className="font-medium text-purple-900">{madeOption?.label}</span>
          </div>
          {madeOption?.description && (
            <p className="text-sm text-gray-600 ml-6">{madeOption.description}</p>
          )}
        </div>
      </div>
    );
  }

  const handleOptionClick = (option) => {
    if (disabled || !option.meetsRequirements) return;

    setSelectedOption(option);
    setShowConfirmation(true);
  };

  const confirmChoice = async () => {
    if (!selectedOption) return;

    setMaking(true);
    try {
      await onMakeChoice(choice.id, selectedOption.id);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Failed to make choice:', error);
      alert('Failed to make choice. Please try again.');
    } finally {
      setMaking(false);
    }
  };

  const cancelChoice = () => {
    setSelectedOption(null);
    setShowConfirmation(false);
  };

  return (
    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mb-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-2xl">🔀</span>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-blue-900 mb-1">A Choice Awaits</h4>
          <p className="text-sm text-gray-700">{choice.choice_point_description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {choice.choice_options.map((option) => {
          const isLocked = !option.meetsRequirements;
          const isSelected = selectedOption?.id === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option)}
              disabled={disabled || isLocked}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                isLocked
                  ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'bg-purple-100 border-purple-400 shadow-md'
                  : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {isLocked ? (
                    <span className="text-gray-400">🔒</span>
                  ) : (
                    <span className={isSelected ? 'text-purple-600' : 'text-blue-600'}>○</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>

                  {/* Show requirements if locked */}
                  {isLocked && option.requirementReason && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ⚠️ {option.requirementReason}
                    </div>
                  )}

                  {/* Show consequence preview on hover (if provided) */}
                  {!isLocked && option.consequencePreview && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      {option.consequencePreview}
                    </div>
                  )}

                  {/* Show stat requirement */}
                  {option.requirements && option.requirements.stat && (
                    <div className="mt-1 text-xs text-purple-600">
                      Requires {option.requirements.stat} {option.requirements.minValue}+
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirm Your Choice</h3>

            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="font-medium text-purple-900 mb-2">{selectedOption.label}</div>
              <div className="text-sm text-gray-700">{selectedOption.description}</div>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-xs font-bold text-yellow-800 mb-1">⚠️ Important</div>
              <div className="text-xs text-gray-700">
                This choice will affect your story. Choose wisely - you cannot change your decision later.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelChoice}
                disabled={making}
                className="flex-1 btn btn-secondary"
              >
                Go Back
              </button>
              <button
                onClick={confirmChoice}
                disabled={making}
                className="flex-1 btn btn-primary"
              >
                {making ? 'Confirming...' : 'Confirm Choice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
