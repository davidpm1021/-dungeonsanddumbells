const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * POST /api/analytics/events
 * Receive batched analytics events from frontend
 */
router.post('/events', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Events array required' });
    }

    // Insert events in batch
    const values = events.map(event => [
      event.event,
      event.timestamp,
      event.sessionId,
      event.userId,
      JSON.stringify(event.properties || {}),
    ]);

    const placeholders = values.map((_, i) =>
      `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
    ).join(', ');

    const flatValues = values.flat();

    await pool.query(`
      INSERT INTO analytics_events (event_name, event_timestamp, session_id, user_id, properties)
      VALUES ${placeholders}
    `, flatValues);

    res.json({ success: true, count: events.length });
  } catch (error) {
    console.error('Analytics events error:', error);
    res.status(500).json({ error: 'Failed to store events' });
  }
});

/**
 * GET /api/analytics/summary
 * Get analytics summary for admin dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Get event counts by type
    const eventCounts = await pool.query(`
      SELECT
        event_name,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics_events
      WHERE event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY event_name
      ORDER BY count DESC
    `);

    // Get daily active sessions
    const dailySessions = await pool.query(`
      SELECT
        DATE(event_timestamp) as date,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT user_id) as users,
        COUNT(*) as events
      FROM analytics_events
      WHERE event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(event_timestamp)
      ORDER BY date DESC
    `);

    // Get most viewed pages
    const topPages = await pool.query(`
      SELECT
        properties->>'pageName' as page,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events
      WHERE event_name = 'page_view'
        AND event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY properties->>'pageName'
      ORDER BY views DESC
      LIMIT 10
    `);

    // Get feature usage
    const featureUsage = await pool.query(`
      SELECT
        properties->>'featureName' as feature,
        COUNT(*) as uses,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events
      WHERE event_name = 'feature_used'
        AND event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY properties->>'featureName'
      ORDER BY uses DESC
      LIMIT 10
    `);

    // Get error summary
    const errors = await pool.query(`
      SELECT
        properties->>'message' as error_message,
        COUNT(*) as count,
        MAX(event_timestamp) as last_occurrence
      FROM analytics_events
      WHERE event_name = 'client_error'
        AND event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY properties->>'message'
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      period: `${days} days`,
      eventCounts: eventCounts.rows,
      dailySessions: dailySessions.rows,
      topPages: topPages.rows,
      featureUsage: featureUsage.rows,
      errors: errors.rows,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

/**
 * GET /api/analytics/user-engagement
 * Get user engagement metrics
 */
router.get('/user-engagement', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Session duration estimates (based on last event - first event per session)
    const sessionDurations = await pool.query(`
      SELECT
        session_id,
        EXTRACT(EPOCH FROM (MAX(event_timestamp) - MIN(event_timestamp))) as duration_seconds,
        COUNT(*) as event_count
      FROM analytics_events
      WHERE event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY session_id
      HAVING COUNT(*) > 1
    `);

    const durations = sessionDurations.rows.map(r => parseFloat(r.duration_seconds));
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Returning users (users who visited on multiple days)
    const returningUsers = await pool.query(`
      SELECT
        user_id,
        COUNT(DISTINCT DATE(event_timestamp)) as days_active
      FROM analytics_events
      WHERE user_id IS NOT NULL
        AND event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY user_id
      HAVING COUNT(DISTINCT DATE(event_timestamp)) > 1
    `);

    // Quest engagement
    const questEngagement = await pool.query(`
      SELECT
        properties->>'action' as action,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_name = 'quest_event'
        AND event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY properties->>'action'
    `);

    // Health activity engagement
    const healthEngagement = await pool.query(`
      SELECT
        properties->>'activityType' as activity_type,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_name = 'health_activity_logged'
        AND event_timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY properties->>'activityType'
    `);

    res.json({
      period: `${days} days`,
      sessions: {
        total: sessionDurations.rows.length,
        averageDurationSeconds: Math.round(avgDuration),
        averageEventsPerSession: sessionDurations.rows.length > 0
          ? Math.round(sessionDurations.rows.reduce((a, r) => a + parseInt(r.event_count), 0) / sessionDurations.rows.length)
          : 0,
      },
      returningUsers: {
        count: returningUsers.rows.length,
        avgDaysActive: returningUsers.rows.length > 0
          ? (returningUsers.rows.reduce((a, r) => a + parseInt(r.days_active), 0) / returningUsers.rows.length).toFixed(1)
          : 0,
      },
      questEngagement: questEngagement.rows,
      healthEngagement: healthEngagement.rows,
    });
  } catch (error) {
    console.error('User engagement error:', error);
    res.status(500).json({ error: 'Failed to get user engagement' });
  }
});

module.exports = router;
