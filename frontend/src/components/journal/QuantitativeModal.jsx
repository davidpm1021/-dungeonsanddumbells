import { useState, useEffect, useRef } from 'react';

/**
 * QuantitativeModal - Input modal for quantitative goals
 * Allows the user to enter a value before completing the challenge
 */
export default function QuantitativeModal({
  challenge,
  isOpen,
  onClose,
  onSubmit
}) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Default to target value
      setValue(challenge?.targetValue?.toString() || '');
    }
  }, [isOpen, challenge]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(parseFloat(value));
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !challenge) return null;

  const statColors = {
    STR: 'border-red-500/50 focus:border-red-400',
    DEX: 'border-green-500/50 focus:border-green-400',
    CON: 'border-yellow-500/50 focus:border-yellow-400',
    INT: 'border-blue-500/50 focus:border-blue-400',
    WIS: 'border-purple-500/50 focus:border-purple-400',
    CHA: 'border-pink-500/50 focus:border-pink-400'
  };

  const buttonColors = {
    STR: 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500',
    DEX: 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500',
    CON: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
    INT: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
    WIS: 'from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500',
    CHA: 'from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500'
  };

  const stat = challenge.statMapping || 'STR';
  const borderColor = statColors[stat] || statColors.STR;
  const buttonColor = buttonColors[stat] || buttonColors.STR;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-sm bg-[#1a0a2e] rounded-2xl border border-purple-500/30 shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-purple-500/20">
          <h3 className="text-lg font-bold text-white mb-1">{challenge.name}</h3>
          <p className="text-sm text-gray-400">
            Enter the value you completed
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {challenge.unit ? `Amount (${challenge.unit})` : 'Amount'}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`e.g., ${challenge.targetValue || 0}`}
                min="0"
                step="any"
                className={`
                  w-full px-4 py-4 text-2xl text-center font-bold
                  bg-black/30 rounded-xl border-2 ${borderColor}
                  text-white placeholder-gray-600
                  focus:outline-none focus:ring-0
                  transition-colors
                `}
              />
              {challenge.targetValue && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  / {challenge.targetValue} target
                </div>
              )}
            </div>

            {/* Quick select buttons */}
            <div className="flex gap-2 mt-3">
              {[0.25, 0.5, 0.75, 1].map((multiplier) => {
                const quickValue = Math.round((challenge.targetValue || 10) * multiplier);
                return (
                  <button
                    key={multiplier}
                    type="button"
                    onClick={() => setValue(quickValue.toString())}
                    className="flex-1 py-2 text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/10 transition-all"
                  >
                    {quickValue}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value || isSubmitting}
              className={`
                flex-1 py-3 px-4 text-white font-semibold rounded-xl
                bg-gradient-to-r ${buttonColor}
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg
              `}
            >
              {isSubmitting ? 'Saving...' : 'Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
