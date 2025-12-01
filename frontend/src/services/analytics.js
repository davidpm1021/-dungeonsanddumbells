/**
 * Analytics Service
 * Lightweight analytics tracking for user behavior and feature usage
 * Stores events locally and batches sends to backend
 */

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = 'dd_analytics_queue';

class AnalyticsService {
  constructor() {
    this.queue = this.loadQueue();
    this.sessionId = this.getOrCreateSessionId();
    this.userId = null;
    this.flushTimer = null;

    // Start flush timer
    this.startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable
    }
  }

  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('dd_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem('dd_session_id', sessionId);
    }
    return sessionId;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  /**
   * Track a generic event
   */
  track(eventName, properties = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      properties: {
        ...properties,
        url: window.location.pathname,
        referrer: document.referrer || null,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        userAgent: navigator.userAgent,
      },
    };

    this.queue.push(event);
    this.saveQueue();

    // Auto-flush if queue is large
    if (this.queue.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  pageView(pageName, properties = {}) {
    this.track('page_view', {
      pageName,
      ...properties,
    });
  }

  /**
   * Track feature usage
   */
  featureUsed(featureName, properties = {}) {
    this.track('feature_used', {
      featureName,
      ...properties,
    });
  }

  /**
   * Track button/action clicks
   */
  buttonClicked(buttonName, properties = {}) {
    this.track('button_clicked', {
      buttonName,
      ...properties,
    });
  }

  /**
   * Track quest interactions
   */
  questEvent(action, questId, properties = {}) {
    this.track('quest_event', {
      action, // started, completed, abandoned, objective_completed
      questId,
      ...properties,
    });
  }

  /**
   * Track health activity logging
   */
  healthActivityLogged(activityType, properties = {}) {
    this.track('health_activity_logged', {
      activityType,
      ...properties,
    });
  }

  /**
   * Track combat events
   */
  combatEvent(action, properties = {}) {
    this.track('combat_event', {
      action, // started, action_taken, ended, fled
      ...properties,
    });
  }

  /**
   * Track errors (client-side)
   */
  trackError(error, context = {}) {
    this.track('client_error', {
      message: error.message || String(error),
      stack: error.stack || null,
      context,
    });
  }

  /**
   * Track timing/performance
   */
  timing(category, name, durationMs, properties = {}) {
    this.track('timing', {
      category,
      name,
      durationMs,
      ...properties,
    });
  }

  /**
   * Flush events to backend
   */
  async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    this.saveQueue();

    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        // Use keepalive for page unload scenarios
        keepalive: true,
      });

      if (!response.ok) {
        // Put events back in queue on failure
        this.queue = [...events, ...this.queue];
        this.saveQueue();
      }
    } catch {
      // Put events back in queue on network error
      this.queue = [...events, ...this.queue];
      this.saveQueue();
    }
  }
}

// Singleton instance
const analytics = new AnalyticsService();

export default analytics;

// Named exports for convenience
export const {
  track,
  pageView,
  featureUsed,
  buttonClicked,
  questEvent,
  healthActivityLogged,
  combatEvent,
  trackError,
  timing,
  setUserId,
} = {
  track: analytics.track.bind(analytics),
  pageView: analytics.pageView.bind(analytics),
  featureUsed: analytics.featureUsed.bind(analytics),
  buttonClicked: analytics.buttonClicked.bind(analytics),
  questEvent: analytics.questEvent.bind(analytics),
  healthActivityLogged: analytics.healthActivityLogged.bind(analytics),
  combatEvent: analytics.combatEvent.bind(analytics),
  trackError: analytics.trackError.bind(analytics),
  timing: analytics.timing.bind(analytics),
  setUserId: analytics.setUserId.bind(analytics),
};
