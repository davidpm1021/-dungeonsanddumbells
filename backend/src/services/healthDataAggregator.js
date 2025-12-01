const db = require('../config/database');

/**
 * Health Data Aggregation Service
 * Aggregates health data from multiple wearable sources into unified daily metrics.
 * Handles conflict resolution when multiple sources provide the same data.
 */
class HealthDataAggregator {

  // Default priority order for data sources (lower index = higher priority)
  static DEFAULT_PRIORITIES = [
    'oura',           // Best sleep/recovery data
    'apple_health',   // Good all-around, native iOS
    'garmin',         // Best activity/workout data
    'fitbit',         // Good all-around
    'google_fit',     // Android aggregator
    'samsung_health', // Samsung devices
    'self_report'     // Manual entry (lowest priority)
  ];

  // Metric categories and their associated fields
  static METRIC_FIELDS = {
    sleep: [
      'sleep_duration_minutes', 'sleep_quality_score', 'sleep_deep_minutes',
      'sleep_rem_minutes', 'sleep_light_minutes', 'sleep_awake_minutes',
      'sleep_start_time', 'sleep_end_time'
    ],
    activity: [
      'steps', 'active_minutes', 'calories_burned', 'distance_meters', 'floors_climbed'
    ],
    heart: [
      'resting_heart_rate', 'avg_heart_rate', 'max_heart_rate', 'hrv_avg'
    ],
    workout: [
      'workout_count', 'workout_minutes', 'workout_types'
    ],
    mindfulness: [
      'meditation_minutes'
    ],
    recovery: [
      'stress_score', 'recovery_score', 'readiness_score'
    ]
  };

  // Instance getters for accessing static properties
  get defaultPriorities() {
    return HealthDataAggregator.DEFAULT_PRIORITIES;
  }

  get metricFields() {
    return HealthDataAggregator.METRIC_FIELDS;
  }

  get metricCategories() {
    return Object.keys(HealthDataAggregator.METRIC_FIELDS);
  }

  /**
   * Get or create daily health data record for a user
   * @param {number} userId - User ID
   * @param {Date} date - Date for the record
   * @returns {Promise<Object>} Daily health data record
   */
  async getOrCreateDailyRecord(userId, date) {
    const dateStr = date.toISOString().split('T')[0];

    // Try to get existing record
    let result = await db.query(`
      SELECT * FROM daily_health_data
      WHERE user_id = $1 AND date = $2
    `, [userId, dateStr]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new record
    result = await db.query(`
      INSERT INTO daily_health_data (user_id, date)
      VALUES ($1, $2)
      RETURNING *
    `, [userId, dateStr]);

    return result.rows[0];
  }

  /**
   * Aggregate data from a wearable source into daily health data
   * Applies conflict resolution based on user preferences
   * @param {number} userId - User ID
   * @param {string} source - Source platform (e.g., 'oura', 'fitbit')
   * @param {Date} date - Date for the data
   * @param {Object} data - Health data from the source
   * @returns {Promise<Object>} Updated daily health data
   */
  async aggregateFromSource(userId, source, date, data) {
    const dailyRecord = await this.getOrCreateDailyRecord(userId, date);
    const priorities = await this.getUserPriorities(userId);

    // Track which fields were updated
    const updates = {};
    const rawDataUpdate = dailyRecord.raw_data || {};
    rawDataUpdate[source] = data;

    // Process each metric category
    for (const [category, fields] of Object.entries(HealthDataAggregator.METRIC_FIELDS)) {
      const strategy = await this.getResolutionStrategy(userId, category);
      const categoryPriorities = priorities[category] || HealthDataAggregator.DEFAULT_PRIORITIES;

      for (const field of fields) {
        if (data[field] !== undefined && data[field] !== null) {
          const shouldUpdate = await this.shouldUpdateField(
            dailyRecord, field, data[field], source, categoryPriorities, strategy, rawDataUpdate
          );

          if (shouldUpdate) {
            updates[field] = data[field];
          }
        }
      }
    }

    // Update data sources array
    const dataSources = dailyRecord.data_sources || [];
    if (!dataSources.includes(source)) {
      dataSources.push(source);
    }

    // Calculate confidence score based on number of sources
    const confidenceScore = Math.min(1.0, 0.5 + (dataSources.length * 0.1));

    // Build update query
    if (Object.keys(updates).length > 0 || !dailyRecord.data_sources?.includes(source)) {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const [field, value] of Object.entries(updates)) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      setClauses.push(`data_sources = $${paramIndex}`);
      values.push(JSON.stringify(dataSources));
      paramIndex++;

      setClauses.push(`confidence_score = $${paramIndex}`);
      values.push(confidenceScore);
      paramIndex++;

      setClauses.push(`raw_data = $${paramIndex}`);
      values.push(JSON.stringify(rawDataUpdate));
      paramIndex++;

      setClauses.push(`updated_at = NOW()`);

      values.push(dailyRecord.id);

      const result = await db.query(`
        UPDATE daily_health_data
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      console.log(`[HealthDataAggregator] Updated daily data for user ${userId} from ${source}:`, Object.keys(updates));
      return result.rows[0];
    }

    return dailyRecord;
  }

  /**
   * Determine if a field should be updated based on conflict resolution
   * @param {Object} existing - Existing daily record
   * @param {string} field - Field name
   * @param {*} newValue - New value from source
   * @param {string} source - Source platform
   * @param {Array} priorities - Priority order for this category
   * @param {string} strategy - Resolution strategy
   * @param {Object} rawData - Raw data from all sources
   * @returns {Promise<boolean>} Whether to update
   */
  async shouldUpdateField(existing, field, newValue, source, priorities, strategy, rawData) {
    const existingValue = existing[field];

    // If no existing value, always update
    if (existingValue === null || existingValue === undefined) {
      return true;
    }

    // Apply resolution strategy
    switch (strategy) {
      case 'highest_priority':
        return this.resolveByPriority(field, source, priorities, rawData);

      case 'average':
        // For averaging, we always accept new data (aggregation happens at read time)
        return true;

      case 'highest_value':
        return newValue > existingValue;

      case 'lowest_value':
        return newValue < existingValue;

      case 'most_recent':
        // Most recent always wins
        return true;

      default:
        return this.resolveByPriority(field, source, priorities, rawData);
    }
  }

  /**
   * Resolve conflict by priority - higher priority source wins
   * @param {string} field - Field name
   * @param {string} newSource - New source
   * @param {Array} priorities - Priority order
   * @param {Object} rawData - Raw data from all sources
   * @returns {boolean} Whether new source has higher priority
   */
  resolveByPriority(field, newSource, priorities, rawData) {
    // Find existing source for this field
    let existingSource = null;
    let existingPriority = Infinity;

    for (const [source, data] of Object.entries(rawData)) {
      if (source !== newSource && data[field] !== undefined && data[field] !== null) {
        const priority = priorities.indexOf(source);
        if (priority !== -1 && priority < existingPriority) {
          existingSource = source;
          existingPriority = priority;
        }
      }
    }

    // If no existing source, accept new
    if (!existingSource) return true;

    // Compare priorities (lower index = higher priority)
    const newPriority = priorities.indexOf(newSource);
    if (newPriority === -1) return false; // Unknown source, reject

    return newPriority <= existingPriority;
  }

  /**
   * Get user's priority preferences for a metric category
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Priority map by category
   */
  async getUserPriorities(userId) {
    const result = await db.query(`
      SELECT metric_type, priorities
      FROM data_source_priority
      WHERE user_id = $1
    `, [userId]);

    const priorities = {};
    for (const row of result.rows) {
      priorities[row.metric_type] = row.priorities;
    }

    return priorities;
  }

  /**
   * Get resolution strategy for a metric category
   * @param {number} userId - User ID
   * @param {string} category - Metric category
   * @returns {Promise<string>} Resolution strategy
   */
  async getResolutionStrategy(userId, category) {
    const result = await db.query(`
      SELECT resolution_strategy
      FROM data_source_priority
      WHERE user_id = $1 AND metric_type = $2
    `, [userId, category]);

    return result.rows[0]?.resolution_strategy || 'highest_priority';
  }

  /**
   * Set user's priority preferences for a metric category
   * @param {number} userId - User ID
   * @param {string} category - Metric category
   * @param {Array} priorities - Priority order
   * @param {string} strategy - Resolution strategy
   */
  async setUserPriority(userId, category, priorities, strategy = 'highest_priority') {
    await db.query(`
      INSERT INTO data_source_priority (user_id, metric_type, priorities, resolution_strategy)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, metric_type)
      DO UPDATE SET priorities = $3, resolution_strategy = $4, updated_at = NOW()
    `, [userId, category, JSON.stringify(priorities), strategy]);
  }

  /**
   * Get daily health data for a user
   * @param {number} userId - User ID
   * @param {Date} date - Date to retrieve
   * @returns {Promise<Object|null>} Daily health data or null
   */
  async getDailyData(userId, date) {
    const dateStr = date.toISOString().split('T')[0];

    const result = await db.query(`
      SELECT * FROM daily_health_data
      WHERE user_id = $1 AND date = $2
    `, [userId, dateStr]);

    return result.rows[0] || null;
  }

  /**
   * Get health data for a date range
   * @param {number} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of daily health data
   */
  async getDateRange(userId, startDate, endDate) {
    const result = await db.query(`
      SELECT * FROM daily_health_data
      WHERE user_id = $1
        AND date >= $2
        AND date <= $3
      ORDER BY date DESC
    `, [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

    return result.rows;
  }

  /**
   * Calculate weekly averages for health metrics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Weekly averages
   */
  async getWeeklyAverages(userId) {
    const result = await db.query(`
      SELECT
        AVG(sleep_duration_minutes) as avg_sleep_minutes,
        AVG(sleep_quality_score) as avg_sleep_quality,
        AVG(steps) as avg_steps,
        AVG(active_minutes) as avg_active_minutes,
        AVG(resting_heart_rate) as avg_resting_hr,
        AVG(hrv_avg) as avg_hrv,
        SUM(workout_count) as total_workouts,
        SUM(workout_minutes) as total_workout_minutes,
        SUM(meditation_minutes) as total_meditation_minutes,
        AVG(stress_score) as avg_stress,
        AVG(recovery_score) as avg_recovery,
        COUNT(*) as days_tracked
      FROM daily_health_data
      WHERE user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '7 days'
    `, [userId]);

    return result.rows[0];
  }

  /**
   * Get connected wearables for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Connected wearables
   */
  async getConnectedWearables(userId) {
    const result = await db.query(`
      SELECT id, platform, status, last_sync_at, permissions, sync_enabled, connected_at
      FROM connected_wearables
      WHERE user_id = $1
      ORDER BY connected_at DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Connect a new wearable platform
   * @param {number} userId - User ID
   * @param {string} platform - Platform name
   * @param {Object} credentials - OAuth tokens and platform user ID
   * @param {Array} permissions - Granted permissions
   * @returns {Promise<Object>} Created wearable connection
   */
  async connectWearable(userId, platform, credentials, permissions = []) {
    const result = await db.query(`
      INSERT INTO connected_wearables (
        user_id, platform, platform_user_id, access_token, refresh_token,
        token_expires_at, status, permissions
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
      ON CONFLICT (user_id, platform)
      DO UPDATE SET
        platform_user_id = $3,
        access_token = $4,
        refresh_token = $5,
        token_expires_at = $6,
        status = 'active',
        permissions = $7,
        updated_at = NOW()
      RETURNING *
    `, [
      userId,
      platform,
      credentials.platformUserId,
      credentials.accessToken,
      credentials.refreshToken,
      credentials.tokenExpiresAt,
      JSON.stringify(permissions)
    ]);

    // Initialize default priorities for this user if first wearable
    await this.initializeDefaultPriorities(userId);

    console.log(`[HealthDataAggregator] Connected ${platform} for user ${userId}`);
    return result.rows[0];
  }

  /**
   * Initialize default data source priorities for a user
   * @param {number} userId - User ID
   */
  async initializeDefaultPriorities(userId) {
    const categories = Object.keys(HealthDataAggregator.METRIC_FIELDS);

    for (const category of categories) {
      await db.query(`
        INSERT INTO data_source_priority (user_id, metric_type, priorities, resolution_strategy)
        VALUES ($1, $2, $3, 'highest_priority')
        ON CONFLICT (user_id, metric_type) DO NOTHING
      `, [userId, category, JSON.stringify(HealthDataAggregator.DEFAULT_PRIORITIES)]);
    }
  }

  /**
   * Disconnect a wearable platform
   * @param {number} userId - User ID
   * @param {string} platform - Platform name
   */
  async disconnectWearable(userId, platform) {
    await db.query(`
      UPDATE connected_wearables
      SET status = 'revoked', access_token = NULL, refresh_token = NULL, updated_at = NOW()
      WHERE user_id = $1 AND platform = $2
    `, [userId, platform]);

    console.log(`[HealthDataAggregator] Disconnected ${platform} for user ${userId}`);
  }

  /**
   * Update wearable sync status
   * @param {number} wearableId - Wearable connection ID
   * @param {string} status - New status
   * @param {string} error - Error message if failed
   */
  async updateWearableStatus(wearableId, status, error = null) {
    await db.query(`
      UPDATE connected_wearables
      SET status = $1, last_error = $2, last_sync_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [status, error, wearableId]);
  }

  /**
   * Log a sync operation
   * @param {number} userId - User ID
   * @param {number} wearableId - Wearable connection ID
   * @param {string} platform - Platform name
   * @param {Object} details - Sync details
   * @returns {Promise<number>} Sync log ID
   */
  async logSync(userId, wearableId, platform, details) {
    const result = await db.query(`
      INSERT INTO wearable_sync_log (
        user_id, wearable_id, platform, sync_type, status,
        date_range_start, date_range_end, records_fetched, records_processed,
        error_message, error_details, completed_at, duration_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      userId,
      wearableId,
      platform,
      details.syncType || 'incremental',
      details.status,
      details.dateRangeStart,
      details.dateRangeEnd,
      details.recordsFetched || 0,
      details.recordsProcessed || 0,
      details.errorMessage,
      details.errorDetails ? JSON.stringify(details.errorDetails) : null,
      details.status !== 'started' ? new Date() : null,
      details.durationMs
    ]);

    return result.rows[0].id;
  }

  /**
   * Convert daily health data to game conditions
   * Returns conditions that should be applied based on health data
   * @param {Object} dailyData - Daily health data record
   * @returns {Array} Conditions to apply
   */
  deriveGameConditions(dailyData) {
    const conditions = [];

    // Sleep-based conditions
    if (dailyData.sleep_duration_minutes) {
      const sleepHours = dailyData.sleep_duration_minutes / 60;
      if (sleepHours >= 7) {
        conditions.push({
          name: 'Well-Rested',
          type: 'buff',
          source: 'wearable_sleep',
          statModifiers: { all: 2 },
          description: 'Quality sleep has restored your vitality.'
        });
      } else if (sleepHours < 6) {
        conditions.push({
          name: 'Fatigued',
          type: 'debuff',
          source: 'wearable_sleep',
          statModifiers: { STR: -2, DEX: -2, CON: -2 },
          description: 'Insufficient rest weighs on your body and mind.'
        });
      }
    }

    // Recovery-based conditions (from Oura, Garmin, etc.)
    if (dailyData.recovery_score !== null && dailyData.recovery_score !== undefined) {
      if (dailyData.recovery_score >= 0.85) {
        conditions.push({
          name: 'Peak Recovery',
          type: 'buff',
          source: 'wearable_recovery',
          statModifiers: { CON: 2, STR: 1 },
          description: 'Your body is fully recovered and ready for challenge.'
        });
      } else if (dailyData.recovery_score < 0.5) {
        conditions.push({
          name: 'Recovering',
          type: 'debuff',
          source: 'wearable_recovery',
          statModifiers: { CON: -1 },
          description: 'Your body needs more time to recover from recent exertion.'
        });
      }
    }

    // Activity-based conditions
    if (dailyData.steps && dailyData.steps >= 10000) {
      conditions.push({
        name: 'Active Lifestyle',
        type: 'buff',
        source: 'wearable_activity',
        statModifiers: { DEX: 1, CON: 1 },
        description: 'Your consistent movement keeps you agile and resilient.'
      });
    }

    // HRV-based conditions (stress indicator)
    if (dailyData.hrv_avg) {
      if (dailyData.hrv_avg >= 50) {
        conditions.push({
          name: 'Balanced',
          type: 'buff',
          source: 'wearable_hrv',
          statModifiers: { WIS: 1 },
          description: 'Your nervous system is well-regulated, mind clear.'
        });
      }
    }

    return conditions;
  }
}

module.exports = new HealthDataAggregator();
