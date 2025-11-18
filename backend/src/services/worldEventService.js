/**
 * World Event Service
 * Manages global world events that affect all players
 * Reference: PRD Addendum - Phase 5: World Events & Dynamic Story
 */

const pool = require('../config/database');
const questCreator = require('./agents/questCreator');

/**
 * Create a new world event
 * Can be called manually or via scheduled cron job
 *
 * @param {object} eventData - Event configuration
 * @returns {Promise<object>} Created world event
 */
async function createWorldEvent(eventData) {
  const {
    eventName,
    eventDescription,
    durationDays = 7,
    spawnsQuestType = 'world_event',
    affectsAllPlayers = true,
    triggerCondition = {}
  } = eventData;

  try {
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + durationDays);

    const result = await pool.query(
      `INSERT INTO world_events
        (event_name, event_description, trigger_condition, affects_all_players,
         duration_days, starts_at, ends_at, spawns_quest_type, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [
        eventName,
        eventDescription,
        JSON.stringify(triggerCondition),
        affectsAllPlayers,
        durationDays,
        startsAt,
        endsAt,
        spawnsQuestType
      ]
    );

    const event = result.rows[0];

    console.log(`[WorldEvent] Created: ${event.event_name} (expires ${endsAt.toISOString()})`);

    return event;
  } catch (error) {
    console.error('[WorldEvent] Error creating event:', error);
    throw error;
  }
}

/**
 * Get all active world events
 *
 * @returns {Promise<array>} Active world events
 */
async function getActiveWorldEvents() {
  const result = await pool.query(
    `SELECT * FROM world_events
     WHERE is_active = true
     AND (ends_at IS NULL OR ends_at > NOW())
     ORDER BY starts_at DESC`
  );

  return result.rows;
}

/**
 * Get a specific world event by ID
 *
 * @param {number} eventId - World event ID
 * @returns {Promise<object>} World event
 */
async function getWorldEvent(eventId) {
  const result = await pool.query(
    `SELECT * FROM world_events WHERE id = $1`,
    [eventId]
  );

  if (result.rows.length === 0) {
    throw new Error('World event not found');
  }

  return result.rows[0];
}

/**
 * Track player participation in a world event
 *
 * @param {number} eventId - World event ID
 * @param {number} characterId - Character ID
 * @param {boolean} completed - Whether the player completed the event quest
 */
async function trackParticipation(eventId, characterId, completed = false) {
  try {
    // Increment participation count
    await pool.query(
      `UPDATE world_events
       SET participation_count = participation_count + 1,
           completion_count = completion_count + CASE WHEN $2 THEN 1 ELSE 0 END
       WHERE id = $1`,
      [eventId, completed]
    );

    console.log(`[WorldEvent] Tracked participation for event ${eventId}, completed: ${completed}`);
  } catch (error) {
    console.error('[WorldEvent] Error tracking participation:', error);
  }
}

/**
 * Deactivate expired world events
 * Should be called periodically (e.g., via cron job)
 *
 * @returns {Promise<number>} Number of events deactivated
 */
async function deactivateExpiredEvents() {
  const result = await pool.query(
    `UPDATE world_events
     SET is_active = false
     WHERE is_active = true
     AND ends_at < NOW()
     RETURNING id, event_name`
  );

  if (result.rows.length > 0) {
    console.log(`[WorldEvent] Deactivated ${result.rows.length} expired event(s):`);
    result.rows.forEach(event => {
      console.log(`  - ${event.event_name} (ID: ${event.id})`);
    });
  }

  return result.rows.length;
}

/**
 * Generate preset world events for the beta
 * These can be triggered manually or on a schedule
 *
 * @returns {Promise<object>} Created event
 */
async function generatePresetEvent() {
  // Pool of preset events for beta
  const presetEvents = [
    {
      eventName: 'The Great Tremor',
      eventDescription: 'Three violent tremors shook the realm last night. The balance of power grows unstable. All able-bodied adventurers are urged to reinforce their abilities through dedicated training. Your strength is needed now.',
      durationDays: 7,
      spawnsQuestType: 'world_event'
    },
    {
      eventName: 'Eclipse Phenomenon',
      eventDescription: 'A mysterious eclipse darkens the sky, and magical energy pulses with unusual intensity. This is a rare opportunity to strengthen your abilities. Those who train during this celestial event may unlock hidden potential.',
      durationDays: 5,
      spawnsQuestType: 'world_event'
    },
    {
      eventName: 'Festival of Balance',
      eventDescription: 'The realm celebrates the ancient Festival of Balance. All citizens are encouraged to demonstrate their commitment to holistic growth by training multiple aspects of their being.',
      durationDays: 7,
      spawnsQuestType: 'world_event'
    },
    {
      eventName: 'The Calling',
      eventDescription: 'A strange resonance emanates from the distant peaks. The realm seems to be calling out to those with dedication and discipline. Many adventurers report feeling drawn to train harder than ever before. Will you answer the call?',
      durationDays: 10,
      spawnsQuestType: 'world_event'
    }
  ];

  // Check if we already have an active world event
  const activeEvents = await getActiveWorldEvents();

  if (activeEvents.length > 0) {
    console.log(`[WorldEvent] Already have ${activeEvents.length} active event(s), skipping generation`);
    return activeEvents[0];
  }

  // Randomly select an event
  const selectedEvent = presetEvents[Math.floor(Math.random() * presetEvents.length)];

  // Create the event
  const event = await createWorldEvent(selectedEvent);

  console.log(`[WorldEvent] Generated preset event: ${event.event_name}`);

  return event;
}

/**
 * Evaluate the outcome of a world event
 * Called when an event expires
 *
 * @param {number} eventId - World event ID
 * @returns {Promise<object>} Event outcome summary
 */
async function evaluateEventOutcome(eventId) {
  const event = await getWorldEvent(eventId);

  // Calculate participation rate
  // For now, we'll use simple counts (in production, track against active player count)
  const participationRate = event.participation_count;
  const completionRate = event.completion_count;

  const outcome = {
    eventId: event.id,
    eventName: event.event_name,
    participationCount: participationRate,
    completionCount: completionRate,
    impact: 'moderate',
    narrative: `The ${event.event_name} has concluded. ${completionRate} adventurers rose to the challenge and completed their quests. Their dedication is acknowledged.`
  };

  // Determine impact level based on completion rate
  if (completionRate >= 100) {
    outcome.impact = 'major';
    outcome.narrative = `The ${event.event_name} has ended in triumph! ${completionRate} adventurers answered the call, their collective effort resonating through the realm. The world grows stronger.`;
  } else if (completionRate >= 50) {
    outcome.impact = 'moderate';
    outcome.narrative = `The ${event.event_name} has concluded. ${completionRate} dedicated adventurers completed their quests. Balance is being restored.`;
  } else if (completionRate < 20) {
    outcome.impact = 'minor';
    outcome.narrative = `The ${event.event_name} has passed with limited response. Only ${completionRate} adventurers completed their quests. The balance remains precarious.`;
  }

  console.log(`[WorldEvent] Evaluated outcome for: ${event.event_name}`);
  console.log(`  Participation: ${participationRate}, Completions: ${completionRate}`);
  console.log(`  Impact: ${outcome.impact}`);

  // Store outcome in narrative (could be expanded to store in database)
  return outcome;
}

/**
 * Get participation stats for a world event
 *
 * @param {number} eventId - World event ID
 * @returns {Promise<object>} Participation statistics
 */
async function getEventStats(eventId) {
  const event = await getWorldEvent(eventId);

  const now = new Date();
  const timeRemaining = event.ends_at ? Math.max(0, event.ends_at - now) : null;
  const daysRemaining = timeRemaining ? Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)) : null;

  return {
    eventId: event.id,
    eventName: event.event_name,
    isActive: event.is_active,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    daysRemaining,
    participationCount: event.participation_count,
    completionCount: event.completion_count,
    completionRate: event.participation_count > 0
      ? Math.floor((event.completion_count / event.participation_count) * 100)
      : 0
  };
}

module.exports = {
  createWorldEvent,
  getActiveWorldEvents,
  getWorldEvent,
  trackParticipation,
  deactivateExpiredEvents,
  generatePresetEvent,
  evaluateEventOutcome,
  getEventStats
};
