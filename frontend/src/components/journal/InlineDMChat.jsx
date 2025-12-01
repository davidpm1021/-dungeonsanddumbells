import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dm } from '../../services/api';

/**
 * Inline DM Chat component for the Journal
 * Provides quick narrative interactions without leaving the journal
 * Expands/collapses to balance immersion with page flow
 */
export default function InlineDMChat({ character, worldContext, onNarrativeUpdate }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const entriesEndRef = useRef(null);

  // Auto-scroll when new entries added
  useEffect(() => {
    if (isExpanded && entriesEndRef.current) {
      entriesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, isExpanded]);

  const addEntry = (type, content) => {
    setEntries(prev => [...prev, {
      id: Date.now(),
      type,
      content,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const playerAction = input.trim();
    setInput('');

    // Add player action
    addEntry('player', playerAction);
    setIsLoading(true);

    try {
      const response = await dm.interact({
        character,
        action: playerAction,
        worldContext,
        recentMessages: entries.slice(-5),
        sessionId
      });

      const result = response.data;

      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      // Add DM response
      if (result.narrative) {
        addEntry('narrative', result.narrative);

        // Notify parent that narrative updated (for refreshing other components)
        if (onNarrativeUpdate) {
          onNarrativeUpdate(result);
        }
      }

      // Handle combat trigger
      if (result.combatState) {
        addEntry('system', 'Combat initiated! Opening full adventure mode...');
        setTimeout(() => navigate('/dm'), 1500);
      }

      // Handle skill check
      if (result.pendingRoll) {
        addEntry('system', `A challenge awaits! Open full mode to roll: ${result.pendingRoll.skillType || 'Skill Check'}`);
      }

    } catch (err) {
      addEntry('narrative', generateFallbackResponse(playerAction));
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (action) => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('look') || actionLower.includes('examine')) {
      return 'You observe your surroundings carefully, taking in the details of your current situation.';
    }
    if (actionLower.includes('talk') || actionLower.includes('speak')) {
      return 'You speak, your words hanging in the air as you await a response.';
    }
    return `You ${action}. The world shifts subtly in response to your actions.`;
  };

  const quickActions = [
    { label: 'Look around', action: 'I look around and observe my surroundings' },
    { label: 'Check status', action: '/status' },
    { label: 'Rest', action: 'I take a moment to rest and gather my thoughts' }
  ];

  // Collapsed state - teaser to engage
  if (!isExpanded) {
    const lastNarrative = entries.filter(e => e.type === 'narrative').slice(-1)[0];

    return (
      <div className="bg-gradient-to-br from-[#1a0a2e]/60 to-purple-900/30 rounded-xl border border-purple-500/30 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-4 text-left hover:bg-purple-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xl">
              {entries.length > 0 ? '📖' : '🎲'}
            </div>
            <div className="flex-1">
              {entries.length > 0 && lastNarrative ? (
                <>
                  <p className="text-sm text-gray-300 line-clamp-2 italic">
                    "{lastNarrative.content.slice(0, 100)}..."
                  </p>
                  <p className="text-xs text-purple-400 mt-1">
                    Tap to continue your adventure
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-white">Quick Adventure</h3>
                  <p className="text-sm text-gray-400">
                    Interact with the DM right here
                  </p>
                </>
              )}
            </div>
            <span className="text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Expanded state - chat interface
  return (
    <div className="bg-gradient-to-br from-[#1a0a2e]/80 to-purple-900/40 rounded-xl border border-purple-500/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/30 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <span className="font-semibold text-purple-200">Quick Adventure</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dm')}
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
          >
            Full Mode
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg hover:bg-purple-500/20 text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Narrative Entries */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">
              Your story awaits. What do you do?
            </p>
            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(qa.action);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          entries.slice(-6).map((entry) => (
            <div key={entry.id} className="animate-fade-in">
              {entry.type === 'narrative' && (
                <p className="text-gray-200 text-sm leading-relaxed">
                  {entry.content}
                </p>
              )}
              {entry.type === 'player' && (
                <p className="text-purple-300 text-sm italic">
                  {entry.content}
                </p>
              )}
              {entry.type === 'system' && (
                <p className="text-amber-400 text-xs py-1 px-2 bg-amber-500/10 rounded">
                  {entry.content}
                </p>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <p className="text-gray-500 text-sm italic animate-pulse">
            The DM ponders...
          </p>
        )}

        <div ref={entriesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-purple-500/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you do?"
            disabled={isLoading}
            className="flex-1 bg-[#0d0520]/60 text-white text-sm rounded-lg px-3 py-2 border border-purple-900/30 focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Act
          </button>
        </div>
      </form>
    </div>
  );
}
