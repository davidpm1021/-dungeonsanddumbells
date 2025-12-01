/**
 * Narrative Activity Service
 * Bridges health activities with the narrative system
 * Creates story-rich events from real-world fitness activities
 *
 * This enables the DM to reference past training:
 * "Your weeks of consistent training have not gone unnoticed.
 *  The Ranger Captain approaches with a proposition..."
 */

const pool = require('../config/database');

// Narrative templates for different activity types
const NARRATIVE_TEMPLATES = {
  strength: {
    low: [
      "You spent time lifting lighter weights, warming your muscles.",
      "A gentle strength session left you feeling limber.",
      "You practiced your forms with measured intensity."
    ],
    moderate: [
      "The iron called and you answered. Your muscles burn with satisfying exertion.",
      "Sweat dripped from your brow as you pushed through another set.",
      "Your strength training session left you feeling powerful."
    ],
    high: [
      "You pushed your limits today, the weights yielding to your determination.",
      "An intense session - you can feel your warrior's power growing.",
      "The gym became your battleground, and you emerged victorious."
    ],
    max: [
      "A legendary session! You've surpassed what you thought possible.",
      "Your maximum effort echoes through your very being. The iron bows before you.",
      "Today you trained like the heroes of old. Your might knows new heights."
    ]
  },
  cardio: {
    low: [
      "A light walk cleared your mind and warmed your body.",
      "You moved with easy strides, enjoying the simple act of motion.",
      "A gentle cardio session kept your heart healthy."
    ],
    moderate: [
      "Your heart pumped steadily as you pushed through your cardio.",
      "The rhythm of your breath and feet became a meditation.",
      "Endurance training - your stamina grows with each session."
    ],
    high: [
      "You ran with the wind, lungs burning with fierce joy.",
      "Your cardiovascular system was pushed to its limits today.",
      "The path was long but you conquered every step."
    ],
    max: [
      "You ran as if demons chased you - and left them in the dust!",
      "A feat of endurance that would make marathon runners proud.",
      "Your heart is stronger than ever. Nothing can outpace you now."
    ]
  },
  flexibility: {
    low: [
      "Light stretching eased the tension in your muscles.",
      "You moved through gentle poses, finding small releases.",
      "A brief flexibility session kept you limber."
    ],
    moderate: [
      "Your body flowed through the poses like water.",
      "Flexibility training - you're becoming more graceful by the day.",
      "You stretched and bent, feeling your body become more supple."
    ],
    high: [
      "Deep stretches released tensions you didn't know you held.",
      "Your flexibility training pushed your range of motion further.",
      "Like a reed in the wind, you bent but did not break."
    ],
    max: [
      "You've achieved poses that seemed impossible weeks ago.",
      "Your body moves with the grace of a dancer and the control of a monk.",
      "Flexibility mastery - you flow like water, unstoppable and adaptable."
    ]
  },
  meditation: {
    low: [
      "A few moments of quiet helped center your thoughts.",
      "Brief meditation brought a small measure of peace.",
      "You paused to breathe, finding a moment of stillness."
    ],
    moderate: [
      "Your mind grew still as the waters of a peaceful lake.",
      "Meditation deepened your inner calm and awareness.",
      "In the silence, you found clarity waiting."
    ],
    high: [
      "Deep meditation revealed insights hidden in the noise of daily life.",
      "Your mind touched profound stillness today.",
      "The inner peace you cultivated will serve you well in challenges ahead."
    ],
    max: [
      "Transcendent stillness - you've glimpsed the clarity of the ancient sages.",
      "Your meditation practice has reached new depths of serenity.",
      "Inner peace radiates from you like light from a lantern."
    ]
  },
  sleep: {
    low: [
      "Rest came fitfully, but some is better than none.",
      "A short rest left you somewhat refreshed.",
      "Light sleep provided minimal recovery."
    ],
    moderate: [
      "You slept reasonably well, waking with renewed energy.",
      "Rest embraced you through the night hours.",
      "Your body began its healing work as you slumbered."
    ],
    high: [
      "Quality sleep left you feeling restored and ready.",
      "You woke refreshed, your body thanking you for proper rest.",
      "Deep, restorative sleep has replenished your reserves."
    ],
    max: [
      "Perfect rest - you feel reborn with the morning light.",
      "Your sleep was the stuff of legends, leaving you fully restored.",
      "You wake feeling invincible, every cell recharged and ready."
    ]
  },
  learning: {
    low: [
      "You read a few pages, adding small drops to your ocean of knowledge.",
      "Brief study kept your mind engaged.",
      "A short learning session exercised your mental muscles."
    ],
    moderate: [
      "Knowledge flows into you like water filling a vessel.",
      "Your studies today have expanded your understanding.",
      "The pursuit of knowledge continues to sharpen your mind."
    ],
    high: [
      "Deep learning - concepts that were murky are now crystal clear.",
      "Your dedicated study has yielded significant insights.",
      "Your mind grows sharper with each lesson learned."
    ],
    max: [
      "Mastery-level learning! You've achieved breakthrough understanding.",
      "Knowledge crystallizes in your mind with perfect clarity.",
      "The scholars of old would be proud of your dedication to learning."
    ]
  },
  social: {
    low: [
      "A brief interaction brightened your day.",
      "You connected with others, however briefly.",
      "Social time, even in small doses, feeds the soul."
    ],
    moderate: [
      "Meaningful connection with others renewed your spirit.",
      "Your presence uplifted those around you today.",
      "Social bonds strengthen like muscles - and yours are growing."
    ],
    high: [
      "Deep connections were forged or strengthened today.",
      "Your charisma and warmth drew others to you.",
      "Community and belonging - you are not alone on this journey."
    ],
    max: [
      "Your social presence was magnetic - you've inspired those around you.",
      "Legendary charisma on display - people will remember this day.",
      "You've created bonds that will support you through any challenge."
    ]
  }
};

// Stat narrative flavor for XP gains
const STAT_NARRATIVES = {
  STR: "Your muscles remember the work, growing stronger with each rep.",
  DEX: "Grace and agility flow through your movements now.",
  CON: "Your endurance deepens, your vitality grows.",
  INT: "Knowledge crystallizes in your mind.",
  WIS: "Inner clarity guides your path forward.",
  CHA: "Your presence commands attention, your spirit shines brighter."
};

class NarrativeActivityService {
  /**
   * Generate a narrative description for a health activity
   */
  generateActivityNarrative(activityType, intensity = 'moderate', customTitle = null) {
    const templates = NARRATIVE_TEMPLATES[activityType] || NARRATIVE_TEMPLATES.strength;
    const intensityTemplates = templates[intensity] || templates.moderate;

    // Pick a random template
    const narrative = intensityTemplates[Math.floor(Math.random() * intensityTemplates.length)];

    // Optionally prepend custom title context
    if (customTitle && customTitle.trim()) {
      return `${customTitle}: ${narrative}`;
    }

    return narrative;
  }

  /**
   * Create a narrative event for a completed health activity
   * This is the key integration point - activities become story events
   */
  async createActivityNarrativeEvent(params) {
    const {
      characterId,
      activityType,
      intensity = 'moderate',
      title = null,
      xpEarned = 0,
      primaryStat = null,
      durationMinutes = null,
      isStreak = false,
      streakDays = 0
    } = params;

    try {
      // Generate narrative description
      let narrative = this.generateActivityNarrative(activityType, intensity, title);

      // Add XP flavor if earned
      if (xpEarned > 0 && primaryStat) {
        const statFlavor = STAT_NARRATIVES[primaryStat] || "Your dedication pays off.";
        narrative += ` ${statFlavor}`;
      }

      // Add streak acknowledgment
      if (isStreak && streakDays > 1) {
        narrative += ` This marks ${streakDays} days of consistent effort!`;
      }

      // Create the narrative event
      const result = await pool.query(`
        INSERT INTO narrative_events (
          character_id,
          event_type,
          event_description,
          stat_changes,
          event_context
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        characterId,
        'health_activity',
        narrative,
        primaryStat && xpEarned > 0 ? JSON.stringify({ [primaryStat]: xpEarned }) : '{}',
        JSON.stringify({
          activityType,
          intensity,
          durationMinutes,
          title,
          isStreak,
          streakDays
        })
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('[NarrativeActivityService] Failed to create narrative event:', error);
      throw error;
    }
  }

  /**
   * Get recent health activity events for a character
   * Used by Story Coordinator to include fitness context in narratives
   */
  async getRecentActivityEvents(characterId, limit = 5) {
    const result = await pool.query(`
      SELECT * FROM narrative_events
      WHERE character_id = $1
        AND event_type = 'health_activity'
      ORDER BY created_at DESC
      LIMIT $2
    `, [characterId, limit]);

    return result.rows;
  }

  /**
   * Get activity summary for narrative context
   * Provides DM with context about player's recent fitness activity
   */
  async getActivitySummaryForNarrative(characterId) {
    // Get this week's activity count by type
    const weeklyActivities = await pool.query(`
      SELECT activity_type, COUNT(*) as count, SUM(xp_earned) as total_xp
      FROM health_activities
      WHERE character_id = $1
        AND completed_at >= NOW() - INTERVAL '7 days'
      GROUP BY activity_type
    `, [characterId]);

    // Get active streaks
    const activeStreaks = await pool.query(`
      SELECT activity_type, current_streak, current_level
      FROM health_streaks
      WHERE character_id = $1
        AND current_streak > 0
    `, [characterId]);

    // Get recent narrative events
    const recentEvents = await this.getRecentActivityEvents(characterId, 3);

    // Determine fitness engagement level
    const totalActivities = weeklyActivities.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    let engagementLevel;
    if (totalActivities === 0) engagementLevel = 'inactive';
    else if (totalActivities <= 2) engagementLevel = 'light';
    else if (totalActivities <= 5) engagementLevel = 'moderate';
    else if (totalActivities <= 10) engagementLevel = 'active';
    else engagementLevel = 'highly_active';

    // Generate narrative context string for AI prompt
    let contextDescription = '';

    if (engagementLevel === 'inactive') {
      contextDescription = "The player has not engaged in any health activities this week. Consider gentle encouragement or a story prompt that motivates without shaming.";
    } else {
      const activityDescriptions = weeklyActivities.rows.map(row =>
        `${row.count}x ${row.activity_type} (+${row.total_xp} XP)`
      ).join(', ');

      contextDescription = `This week's training: ${activityDescriptions}. `;

      if (activeStreaks.rows.length > 0) {
        const streakDescriptions = activeStreaks.rows.map(row =>
          `${row.activity_type} ${row.current_streak}-day ${row.current_level} streak`
        ).join(', ');
        contextDescription += `Active streaks: ${streakDescriptions}. `;
      }

      if (engagementLevel === 'highly_active') {
        contextDescription += "The player is highly dedicated - acknowledge their commitment in the narrative.";
      } else if (engagementLevel === 'active') {
        contextDescription += "Good consistency - the narrative can reference their growing strength.";
      }
    }

    return {
      engagementLevel,
      weeklyActivityCount: totalActivities,
      activitiesByType: weeklyActivities.rows,
      activeStreaks: activeStreaks.rows,
      recentNarrativeEvents: recentEvents,
      narrativeContext: contextDescription
    };
  }

  /**
   * Check if player's fitness state should trigger story events
   * Returns suggested story triggers based on fitness activity
   */
  async checkActivityTriggers(characterId) {
    const summary = await this.getActivitySummaryForNarrative(characterId);
    const triggers = [];

    // Streak milestone triggers
    for (const streak of summary.activeStreaks) {
      if (streak.current_streak === 7) {
        triggers.push({
          type: 'streak_milestone',
          stat: this.getStatForActivity(streak.activity_type),
          milestone: 7,
          suggestion: `Player reached 7-day ${streak.activity_type} streak - consider NPC acknowledgment or small reward`
        });
      } else if (streak.current_streak === 30) {
        triggers.push({
          type: 'streak_milestone',
          stat: this.getStatForActivity(streak.activity_type),
          milestone: 30,
          suggestion: `Legendary 30-day ${streak.activity_type} streak! This deserves major narrative recognition.`
        });
      }
    }

    // Activity level triggers
    if (summary.engagementLevel === 'highly_active') {
      triggers.push({
        type: 'high_engagement',
        suggestion: "Player is highly active - consider unlocking advanced content or challenging quest"
      });
    } else if (summary.engagementLevel === 'inactive' && summary.weeklyActivityCount === 0) {
      triggers.push({
        type: 'welcome_back',
        suggestion: "Player has been inactive - offer encouraging narrative that motivates return"
      });
    }

    return triggers;
  }

  /**
   * Get the primary stat for an activity type
   */
  getStatForActivity(activityType) {
    const mapping = {
      strength: 'STR',
      resistance: 'STR',
      cardio: 'CON',
      endurance: 'CON',
      sleep: 'CON',
      flexibility: 'DEX',
      yoga: 'DEX',
      coordination: 'DEX',
      meditation: 'WIS',
      mindfulness: 'WIS',
      journaling: 'WIS',
      learning: 'INT',
      reading: 'INT',
      social: 'CHA',
      community: 'CHA'
    };
    return mapping[activityType] || 'STR';
  }

  /**
   * Generate a narrative recap of recent activity for the journal
   */
  async generateActivityRecap(characterId, days = 7) {
    const activities = await pool.query(`
      SELECT activity_type, title, intensity, xp_earned, completed_at
      FROM health_activities
      WHERE character_id = $1
        AND completed_at >= NOW() - INTERVAL '${days} days'
      ORDER BY completed_at DESC
      LIMIT 10
    `, [characterId]);

    if (activities.rows.length === 0) {
      return {
        hasActivity: false,
        narrative: "The past days have been quiet. Your training awaits, hero.",
        activities: []
      };
    }

    // Generate a narrative summary
    const totalActivities = activities.rows.length;
    const totalXP = activities.rows.reduce((sum, row) => sum + (row.xp_earned || 0), 0);

    let narrative = `Over the past ${days} days, you've completed ${totalActivities} training sessions`;
    if (totalXP > 0) {
      narrative += `, earning ${totalXP} XP`;
    }
    narrative += ". ";

    // Add flavor based on most common activity
    const activityCounts = {};
    activities.rows.forEach(row => {
      activityCounts[row.activity_type] = (activityCounts[row.activity_type] || 0) + 1;
    });
    const mostCommon = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];

    if (mostCommon) {
      const statNarrative = STAT_NARRATIVES[this.getStatForActivity(mostCommon[0])];
      narrative += statNarrative;
    }

    return {
      hasActivity: true,
      narrative,
      totalActivities,
      totalXP,
      activities: activities.rows
    };
  }
}

module.exports = new NarrativeActivityService();
