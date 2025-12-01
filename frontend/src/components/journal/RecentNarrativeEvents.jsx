import { useState, useEffect } from 'react';
import { narrative } from '../../services/api';

/**
 * Displays recent narrative events from fitness activities
 * This bridges the gap between real-world activities and the game narrative
 */
export default function RecentNarrativeEvents({ characterId, onEventClick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (characterId) {
      loadNarrativeEvents();
    }
  }, [characterId]);

  const loadNarrativeEvents = async () => {
    try {
      setLoading(true);
      const response = await narrative.getRecentEvents(characterId, 10);
      // Filter to only show health_activity events
      const healthEvents = (response.data.events || []).filter(
        event => event.event_type === 'health_activity'
      );
      setEvents(healthEvents);
    } catch (err) {
      console.log('[RecentNarrativeEvents] Could not load events:', err);
      // Silently fail - not critical to core experience
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (eventContext) => {
    const activityType = eventContext?.activityType || 'strength';
    const icons = {
      strength: '💪',
      cardio: '🏃',
      flexibility: '🧘',
      meditation: '🧠',
      sleep: '😴',
      learning: '📚',
      social: '👥'
    };
    return icons[activityType] || '✨';
  };

  const getStreakBadge = (eventContext) => {
    if (!eventContext?.isStreak || !eventContext?.streakDays) return null;
    const days = eventContext.streakDays;

    if (days >= 30) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">🥇 {days} days</span>;
    } else if (days >= 7) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-400/20 text-gray-300 border border-gray-400/30">🥈 {days} days</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30">🔥 {days} days</span>;
  };

  if (loading) {
    return (
      <div className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-purple-900/30 animate-pulse">
        <div className="h-4 bg-purple-900/40 rounded w-1/3 mb-3"></div>
        <div className="h-16 bg-purple-900/30 rounded"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-[#1a0a2e]/40 rounded-xl p-4 border border-purple-900/30">
        <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <span>📖</span>
          <span>Your Story</span>
        </h3>
        <p className="text-sm text-gray-500 italic">
          Complete activities to add to your tale...
        </p>
      </div>
    );
  }

  const displayEvents = expanded ? events : events.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-[#1a0a2e]/60 to-[#0d0520]/40 rounded-xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-900/30 flex items-center justify-between">
        <h3 className="text-sm font-medium text-purple-300 flex items-center gap-2">
          <span>📖</span>
          <span>Recent Tales</span>
        </h3>
        <span className="text-xs text-gray-500">{events.length} entries</span>
      </div>

      {/* Events List */}
      <div className="divide-y divide-purple-900/20">
        {displayEvents.map((event, index) => {
          const context = event.event_context || {};
          return (
            <div
              key={event.id || index}
              className="p-4 hover:bg-purple-500/5 transition-colors cursor-pointer"
              onClick={() => onEventClick?.(event)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl mt-0.5">{getEventIcon(context)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {event.event_description}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">{getTimeAgo(event.created_at)}</span>
                    {getStreakBadge(context)}
                    {event.stat_changes && Object.keys(event.stat_changes).length > 0 && (
                      <span className="text-xs text-amber-400">
                        +{Object.values(event.stat_changes).reduce((a, b) => a + b, 0)} XP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse */}
      {events.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors border-t border-purple-900/30"
        >
          {expanded ? 'Show Less' : `Show ${events.length - 3} More`}
        </button>
      )}
    </div>
  );
}
