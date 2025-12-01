/**
 * Stat Decay Service
 * Implements realistic stat regression when inactive
 * Based on research: activity builds stats, inactivity decays them
 *
 * Rules:
 * - Grace Period: 1 free miss per week per stat category
 * - After Grace: -5 XP per day of inactivity
 * - Minimum Floor: Stats cannot drop below base (XP >= 0)
 * - Vacation Mode: Pause all decay for up to 14 days
 */

const pool = require('../config/database');

// Default configuration values
const DEFAULT_CONFIG = {
  xpDecayPerDay: 5,
  gracePeriodDays: 1,
  vacationMaxDays: 14,
  vacationUsesPerMonth: 2,
  minimumXpFloor: 0,
  absenceDetectionDays: 7
};

// Stat to activity type mapping
const STAT_ACTIVITY_MAP = {
  STR: ['strength', 'resistance'],
  DEX: ['flexibility', 'coordination', 'yoga'],
  CON: ['cardio', 'endurance', 'sleep'],
  INT: ['learning', 'reading', 'skill_development'],
  WIS: ['meditation', 'mindfulness', 'journaling', 'reflection'],
  CHA: ['social', 'community', 'group_activities']
};

class StatDecayService {
  /**
   * Get decay configuration from database or use defaults
   */
  async getConfig() {
    try {
      const result = await pool.query('SELECT config_key, config_value FROM decay_config');
      const config = { ...DEFAULT_CONFIG };

      for (const row of result.rows) {
        switch (row.config_key) {
          case 'xp_decay_per_day':
            config.xpDecayPerDay = row.config_value;
            break;
          case 'grace_period_days':
            config.gracePeriodDays = row.config_value;
            break;
          case 'vacation_max_days':
            config.vacationMaxDays = row.config_value;
            break;
          case 'vacation_uses_per_month':
            config.vacationUsesPerMonth = row.config_value;
            break;
          case 'minimum_xp_floor':
            config.minimumXpFloor = row.config_value;
            break;
          case 'absence_detection_days':
            config.absenceDetectionDays = row.config_value;
            break;
        }
      }

      return config;
    } catch (error) {
      console.warn('Could not load decay config, using defaults:', error.message);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Check if user is in vacation mode
   */
  async isVacationModeActive(userId) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM vacation_mode
         WHERE user_id = $1
           AND is_active = TRUE
           AND NOW() BETWEEN started_at AND ends_at
         LIMIT 1`,
        [userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking vacation mode:', error);
      return false;
    }
  }

  /**
   * Activate vacation mode for a user
   */
  async activateVacationMode(userId, characterId, durationDays, reason = null) {
    const config = await this.getConfig();

    // Validate duration
    if (durationDays > config.vacationMaxDays) {
      throw new Error(`Vacation cannot exceed ${config.vacationMaxDays} days`);
    }

    // Check monthly limit
    const usedThisMonth = await pool.query(
      `SELECT COUNT(*) as count FROM vacation_mode
       WHERE user_id = $1
         AND started_at >= date_trunc('month', NOW())`,
      [userId]
    );

    if (parseInt(usedThisMonth.rows[0].count) >= config.vacationUsesPerMonth) {
      throw new Error(`Maximum ${config.vacationUsesPerMonth} vacation periods per month`);
    }

    // Deactivate any existing vacation
    await pool.query(
      `UPDATE vacation_mode SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Create new vacation period
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + durationDays);

    const result = await pool.query(
      `INSERT INTO vacation_mode (user_id, character_id, ends_at, duration_days, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, characterId, endsAt, durationDays, reason]
    );

    return result.rows[0];
  }

  /**
   * Deactivate vacation mode
   */
  async deactivateVacationMode(userId) {
    await pool.query(
      `UPDATE vacation_mode SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
  }

  /**
   * Get or create stat activity tracking for a character
   */
  async getStatTracking(characterId) {
    let result = await pool.query(
      `SELECT * FROM stat_activity_tracking WHERE character_id = $1`,
      [characterId]
    );

    if (result.rows.length === 0) {
      // Create new tracking record
      result = await pool.query(
        `INSERT INTO stat_activity_tracking (character_id)
         VALUES ($1)
         RETURNING *`,
        [characterId]
      );
    }

    return result.rows[0];
  }

  /**
   * Record activity for a stat (resets decay timer)
   */
  async recordStatActivity(characterId, statCode) {
    const statColumn = `${statCode.toLowerCase()}_last_activity`;
    const graceColumn = `${statCode.toLowerCase()}_grace_used_this_week`;

    await pool.query(
      `INSERT INTO stat_activity_tracking (character_id, ${statColumn})
       VALUES ($1, NOW())
       ON CONFLICT (character_id) DO UPDATE
       SET ${statColumn} = NOW(),
           ${graceColumn} = FALSE,
           updated_at = NOW()`,
      [characterId]
    );
  }

  /**
   * Check if grace period is available for a stat
   */
  async hasGraceAvailable(characterId, statCode) {
    const tracking = await this.getStatTracking(characterId);
    const graceColumn = `${statCode.toLowerCase()}_grace_used_this_week`;

    // Check if week has changed
    const weekStart = new Date(tracking.grace_week_start);
    const currentWeekStart = this.getWeekStart(new Date());

    if (weekStart < currentWeekStart) {
      // Reset grace for new week
      await pool.query(
        `UPDATE stat_activity_tracking
         SET str_grace_used_this_week = FALSE,
             dex_grace_used_this_week = FALSE,
             con_grace_used_this_week = FALSE,
             int_grace_used_this_week = FALSE,
             wis_grace_used_this_week = FALSE,
             cha_grace_used_this_week = FALSE,
             grace_week_start = $2,
             updated_at = NOW()
         WHERE character_id = $1`,
        [characterId, currentWeekStart]
      );
      return true;
    }

    return !tracking[graceColumn];
  }

  /**
   * Use grace period for a stat
   */
  async useGrace(characterId, statCode) {
    const graceColumn = `${statCode.toLowerCase()}_grace_used_this_week`;

    await pool.query(
      `UPDATE stat_activity_tracking
       SET ${graceColumn} = TRUE, updated_at = NOW()
       WHERE character_id = $1`,
      [characterId]
    );
  }

  /**
   * Calculate decay for a specific stat
   */
  async calculateStatDecay(characterId, statCode, config = null) {
    if (!config) config = await this.getConfig();

    const tracking = await this.getStatTracking(characterId);
    const lastActivityColumn = `${statCode.toLowerCase()}_last_activity`;
    const lastActivity = tracking[lastActivityColumn];

    if (!lastActivity) {
      return { daysInactive: 0, decayAmount: 0, graceUsed: false };
    }

    const now = new Date();
    const daysInactive = Math.floor((now - new Date(lastActivity)) / (1000 * 60 * 60 * 24));

    if (daysInactive <= 0) {
      return { daysInactive: 0, decayAmount: 0, graceUsed: false };
    }

    // Check grace period
    const hasGrace = await this.hasGraceAvailable(characterId, statCode);
    if (hasGrace && daysInactive <= config.gracePeriodDays) {
      return { daysInactive, decayAmount: 0, graceUsed: true };
    }

    // Calculate decay after grace
    const decayDays = daysInactive - (hasGrace ? config.gracePeriodDays : 0);
    const decayAmount = Math.max(0, decayDays * config.xpDecayPerDay);

    return { daysInactive, decayAmount, graceUsed: hasGrace };
  }

  /**
   * Apply decay to a character's stats
   * Returns array of decay events
   */
  async applyDecay(characterId, userId) {
    // Check vacation mode
    if (await this.isVacationModeActive(userId)) {
      return { decayed: false, reason: 'vacation_mode', events: [] };
    }

    const config = await this.getConfig();
    const decayEvents = [];

    // Get current character XP values
    const charResult = await pool.query(
      `SELECT str_xp, dex_xp, con_xp, int_xp, wis_xp, cha_xp FROM characters WHERE id = $1`,
      [characterId]
    );

    if (charResult.rows.length === 0) {
      throw new Error('Character not found');
    }

    const character = charResult.rows[0];
    const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    for (const stat of stats) {
      const decay = await this.calculateStatDecay(characterId, stat, config);

      if (decay.decayAmount > 0) {
        const xpColumn = `${stat.toLowerCase()}_xp`;
        const currentXp = character[xpColumn];
        const newXp = Math.max(config.minimumXpFloor, currentXp - decay.decayAmount);
        const actualDecay = currentXp - newXp;

        if (actualDecay > 0) {
          // Apply decay
          await pool.query(
            `UPDATE characters SET ${xpColumn} = $1 WHERE id = $2`,
            [newXp, characterId]
          );

          // Get narrative hint
          const hint = await this.getDecayNarrativeHint(stat, decay.daysInactive);

          // Log decay event
          await pool.query(
            `INSERT INTO stat_decay_log
             (character_id, stat_code, xp_before, xp_after, xp_decayed, days_inactive, grace_used, narrative_hint)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [characterId, stat, currentXp, newXp, actualDecay, decay.daysInactive, decay.graceUsed, hint]
          );

          decayEvents.push({
            stat,
            xpBefore: currentXp,
            xpAfter: newXp,
            xpDecayed: actualDecay,
            daysInactive: decay.daysInactive,
            narrativeHint: hint
          });
        }

        // Use grace if applicable
        if (decay.graceUsed) {
          await this.useGrace(characterId, stat);
        }
      }
    }

    return {
      decayed: decayEvents.length > 0,
      reason: decayEvents.length > 0 ? 'inactivity' : 'none',
      events: decayEvents
    };
  }

  /**
   * Get narrative hint for decay notification
   */
  async getDecayNarrativeHint(statCode, daysInactive) {
    let severity;
    if (daysInactive <= 3) severity = 'warning';
    else if (daysInactive <= 7) severity = 'mild';
    else if (daysInactive <= 14) severity = 'moderate';
    else severity = 'severe';

    try {
      const result = await pool.query(
        `SELECT hint_text FROM decay_narrative_hints
         WHERE stat_code = $1 AND severity = $2
         LIMIT 1`,
        [statCode, severity]
      );

      return result.rows[0]?.hint_text || `Your ${statCode} feels diminished from lack of practice.`;
    } catch (error) {
      return `Your ${statCode} feels diminished from lack of practice.`;
    }
  }

  /**
   * Get decay status for a character (for UI display)
   */
  async getDecayStatus(characterId, userId) {
    const isVacation = await this.isVacationModeActive(userId);
    const config = await this.getConfig();
    const statuses = {};

    const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    for (const stat of stats) {
      const decay = await this.calculateStatDecay(characterId, stat, config);
      const hasGrace = await this.hasGraceAvailable(characterId, stat);

      statuses[stat] = {
        daysInactive: decay.daysInactive,
        potentialDecay: isVacation ? 0 : decay.decayAmount,
        graceAvailable: hasGrace,
        status: decay.daysInactive === 0 ? 'active' :
                decay.daysInactive <= config.gracePeriodDays ? 'grace' :
                isVacation ? 'vacation' : 'decaying'
      };
    }

    return {
      vacationMode: isVacation,
      stats: statuses
    };
  }

  /**
   * Auto-detect absence and offer gentle welcome back
   */
  async checkForAbsence(characterId, userId) {
    const config = await this.getConfig();
    const tracking = await this.getStatTracking(characterId);

    // Find most recent activity across all stats
    const lastActivities = [
      tracking.str_last_activity,
      tracking.dex_last_activity,
      tracking.con_last_activity,
      tracking.int_last_activity,
      tracking.wis_last_activity,
      tracking.cha_last_activity
    ].filter(Boolean);

    if (lastActivities.length === 0) {
      return { absent: false };
    }

    const mostRecent = new Date(Math.max(...lastActivities.map(d => new Date(d))));
    const daysSinceActivity = Math.floor((new Date() - mostRecent) / (1000 * 60 * 60 * 24));

    if (daysSinceActivity >= config.absenceDetectionDays) {
      return {
        absent: true,
        daysSinceActivity,
        message: `We noticed you've been away for ${daysSinceActivity} days. Life happens. Welcome back, hero.`,
        offerVacationMode: true
      };
    }

    return { absent: false };
  }

  /**
   * Get week start date (Monday)
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}

module.exports = new StatDecayService();
