const express = require('express');
const router = express.Router();
const worldEventService = require('../services/worldEventService');
const { authenticateToken } = require('../middleware/auth');

/**
 * World Event Routes
 *
 * Public routes (viewing events) don't require auth
 * Admin routes (creating events) should require auth in production
 */

/**
 * GET /api/world-events
 *
 * Get all active world events
 */
router.get('/', async (req, res) => {
  try {
    const events = await worldEventService.getActiveWorldEvents();

    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('[WorldEventRoutes] Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch world events' });
  }
});

/**
 * GET /api/world-events/:id
 *
 * Get a specific world event
 */
router.get('/:id', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const event = await worldEventService.getWorldEvent(eventId);

    res.json({
      success: true,
      event
    });
  } catch (error) {
    if (error.message === 'World event not found') {
      return res.status(404).json({ error: error.message });
    }

    console.error('[WorldEventRoutes] Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch world event' });
  }
});

/**
 * GET /api/world-events/:id/stats
 *
 * Get participation statistics for an event
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const stats = await worldEventService.getEventStats(eventId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    if (error.message === 'World event not found') {
      return res.status(404).json({ error: error.message });
    }

    console.error('[WorldEventRoutes] Error fetching event stats:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

/**
 * POST /api/world-events/generate-preset
 *
 * Generate a preset world event for beta
 * (In production, this would be admin-only or cron-based)
 */
router.post('/generate-preset', async (req, res) => {
  try {
    const event = await worldEventService.generatePresetEvent();

    res.status(201).json({
      success: true,
      message: 'World event created',
      event
    });
  } catch (error) {
    console.error('[WorldEventRoutes] Error generating event:', error);
    res.status(500).json({ error: 'Failed to generate world event' });
  }
});

/**
 * POST /api/world-events/create
 *
 * Create a custom world event
 * (In production, this would require admin authentication)
 */
router.post('/create', async (req, res) => {
  try {
    const { eventName, eventDescription, durationDays, spawnsQuestType } = req.body;

    if (!eventName || !eventDescription) {
      return res.status(400).json({ error: 'eventName and eventDescription are required' });
    }

    const event = await worldEventService.createWorldEvent({
      eventName,
      eventDescription,
      durationDays: durationDays || 7,
      spawnsQuestType: spawnsQuestType || 'world_event'
    });

    res.status(201).json({
      success: true,
      message: 'World event created',
      event
    });
  } catch (error) {
    console.error('[WorldEventRoutes] Error creating event:', error);
    res.status(500).json({ error: 'Failed to create world event' });
  }
});

/**
 * POST /api/world-events/:id/participate
 *
 * Track participation in a world event
 * Requires authentication
 */
router.post('/:id/participate', authenticateToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { characterId, completed } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    await worldEventService.trackParticipation(eventId, characterId, completed || false);

    res.json({
      success: true,
      message: 'Participation recorded'
    });
  } catch (error) {
    console.error('[WorldEventRoutes] Error tracking participation:', error);
    res.status(500).json({ error: 'Failed to track participation' });
  }
});

/**
 * POST /api/world-events/cleanup
 *
 * Deactivate expired events
 * (In production, this would be a cron job or admin-only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const count = await worldEventService.deactivateExpiredEvents();

    res.json({
      success: true,
      message: `Deactivated ${count} expired event(s)`,
      count
    });
  } catch (error) {
    console.error('[WorldEventRoutes] Error cleaning up events:', error);
    res.status(500).json({ error: 'Failed to cleanup expired events' });
  }
});

module.exports = router;
