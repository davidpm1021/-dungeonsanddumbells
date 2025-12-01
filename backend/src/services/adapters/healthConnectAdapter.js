/**
 * Health Connect Adapter (Android)
 *
 * Health Connect is Google's unified health data platform for Android.
 * Unlike Oura which has a cloud API, Health Connect data lives on-device.
 *
 * This adapter provides:
 * 1. Webhook endpoint for receiving data pushed from mobile app
 * 2. Data normalization for Health Connect format
 * 3. Support for Samsung Health, Google Fit, Fitbit (Android), etc.
 *
 * The mobile app uses Android's Health Connect SDK to read data and
 * sends it to our backend via authenticated API calls.
 */

const db = require('../../config/database');
const healthDataAggregator = require('../healthDataAggregator');

class HealthConnectAdapter {
  constructor() {
    this.platform = 'health_connect';

    // Health Connect data types we support
    this.supportedTypes = [
      'steps',
      'distance',
      'active_calories_burned',
      'total_calories_burned',
      'heart_rate',
      'resting_heart_rate',
      'heart_rate_variability',
      'sleep_session',
      'exercise_session',
      'weight',
      'oxygen_saturation',
      'respiratory_rate'
    ];
  }

  /**
   * Register a Health Connect connection from mobile app
   * Called when user grants Health Connect permissions in the app
   * @param {number} userId - User ID
   * @param {string} deviceId - Unique device identifier
   * @param {Array} grantedPermissions - List of granted data types
   * @returns {Promise<Object>} Connection result
   */
  async registerConnection(userId, deviceId, grantedPermissions = []) {
    const result = await db.query(`
      INSERT INTO connected_wearables (
        user_id, platform, platform_user_id, status, permissions, sync_enabled
      )
      VALUES ($1, $2, $3, 'active', $4, true)
      ON CONFLICT (user_id, platform)
      DO UPDATE SET
        platform_user_id = $3,
        status = 'active',
        permissions = $4,
        updated_at = NOW()
      RETURNING *
    `, [userId, this.platform, deviceId, JSON.stringify(grantedPermissions)]);

    // Initialize default priorities
    await healthDataAggregator.initializeDefaultPriorities(userId);

    console.log(`[HealthConnectAdapter] Registered connection for user ${userId}, device ${deviceId}`);

    return {
      success: true,
      wearable: result.rows[0],
      supportedTypes: this.supportedTypes
    };
  }

  /**
   * Receive health data push from mobile app
   * This is the main entry point for data from the Android app
   * @param {number} userId - User ID
   * @param {Object} payload - Health data payload from app
   * @returns {Promise<Object>} Processing result
   */
  async receiveDataPush(userId, payload) {
    const { deviceId, date, data, sourceApps } = payload;

    console.log(`[HealthConnectAdapter] Receiving data push for user ${userId}, date ${date}`);

    // Verify connection exists
    const connection = await db.query(`
      SELECT * FROM connected_wearables
      WHERE user_id = $1 AND platform = $2 AND status = 'active'
    `, [userId, this.platform]);

    if (connection.rows.length === 0) {
      throw new Error('Health Connect not registered. Please connect from the mobile app.');
    }

    // Transform Health Connect format to normalized format
    const normalized = this.transformToNormalizedFormat(data);

    // Store source apps info in raw data
    normalized._sourceApps = sourceApps;

    // Aggregate into daily health data
    const dailyData = await healthDataAggregator.aggregateFromSource(
      userId,
      this.platform,
      new Date(date),
      normalized
    );

    // Update last sync time
    await db.query(`
      UPDATE connected_wearables
      SET last_sync_at = NOW()
      WHERE user_id = $1 AND platform = $2
    `, [userId, this.platform]);

    // Log sync
    await healthDataAggregator.logSync(userId, connection.rows[0].id, this.platform, {
      syncType: 'push',
      status: 'success',
      dateRangeStart: new Date(date),
      dateRangeEnd: new Date(date),
      recordsFetched: 1,
      recordsProcessed: 1
    });

    return {
      success: true,
      date,
      dailyData,
      gameConditions: healthDataAggregator.deriveGameConditions(dailyData)
    };
  }

  /**
   * Transform Health Connect data format to normalized format
   * @param {Object} data - Health Connect data from mobile app
   * @returns {Object} Normalized health data
   */
  transformToNormalizedFormat(data) {
    const normalized = {};

    // Steps
    if (data.steps !== undefined) {
      normalized.steps = data.steps;
    }

    // Distance (Health Connect uses meters)
    if (data.distance !== undefined) {
      normalized.distance_meters = Math.round(data.distance);
    }

    // Calories
    if (data.activeCalories !== undefined) {
      normalized.calories_burned = data.activeCalories;
    } else if (data.totalCalories !== undefined) {
      normalized.calories_burned = data.totalCalories;
    }

    // Heart rate
    if (data.heartRate) {
      if (data.heartRate.average !== undefined) {
        normalized.avg_heart_rate = Math.round(data.heartRate.average);
      }
      if (data.heartRate.min !== undefined) {
        normalized.resting_heart_rate = data.heartRate.min;
      }
      if (data.heartRate.max !== undefined) {
        normalized.max_heart_rate = data.heartRate.max;
      }
    }

    // HRV (Heart Rate Variability)
    if (data.hrv !== undefined) {
      normalized.hrv_avg = data.hrv;
    }

    // Sleep data
    if (data.sleep) {
      // Total sleep time in minutes
      if (data.sleep.totalMinutes !== undefined) {
        normalized.sleep_duration_minutes = data.sleep.totalMinutes;
      }

      // Sleep stages (if available from Samsung Health, etc.)
      if (data.sleep.deepMinutes !== undefined) {
        normalized.sleep_deep_minutes = data.sleep.deepMinutes;
      }
      if (data.sleep.remMinutes !== undefined) {
        normalized.sleep_rem_minutes = data.sleep.remMinutes;
      }
      if (data.sleep.lightMinutes !== undefined) {
        normalized.sleep_light_minutes = data.sleep.lightMinutes;
      }
      if (data.sleep.awakeMinutes !== undefined) {
        normalized.sleep_awake_minutes = data.sleep.awakeMinutes;
      }

      // Sleep times
      if (data.sleep.startTime) {
        normalized.sleep_start_time = data.sleep.startTime;
      }
      if (data.sleep.endTime) {
        normalized.sleep_end_time = data.sleep.endTime;
      }

      // Calculate sleep quality score if we have stage data
      if (normalized.sleep_duration_minutes && normalized.sleep_deep_minutes) {
        const deepPercent = normalized.sleep_deep_minutes / normalized.sleep_duration_minutes;
        const remPercent = (normalized.sleep_rem_minutes || 0) / normalized.sleep_duration_minutes;
        // Good sleep: 15-20% deep, 20-25% REM
        const deepScore = Math.min(1, deepPercent / 0.15);
        const remScore = Math.min(1, remPercent / 0.20);
        normalized.sleep_quality_score = Math.round((deepScore * 0.5 + remScore * 0.5) * 100) / 100;
      }
    }

    // Exercise/Workout sessions
    if (data.exercise) {
      normalized.workout_count = data.exercise.count || 1;
      normalized.workout_minutes = data.exercise.totalMinutes || 0;
      normalized.active_minutes = data.exercise.totalMinutes || 0;

      if (data.exercise.types) {
        normalized.workout_types = data.exercise.types;
      }
    }

    // Oxygen saturation
    if (data.oxygenSaturation !== undefined) {
      normalized.oxygen_saturation = data.oxygenSaturation;
    }

    // Respiratory rate
    if (data.respiratoryRate !== undefined) {
      normalized.respiratory_rate = data.respiratoryRate;
    }

    return normalized;
  }

  /**
   * Handle batch data sync from mobile app
   * For syncing historical data or catching up after offline period
   * @param {number} userId - User ID
   * @param {Array} records - Array of { date, data } records
   * @returns {Promise<Object>} Sync result
   */
  async receiveBatchSync(userId, records) {
    console.log(`[HealthConnectAdapter] Receiving batch sync: ${records.length} records for user ${userId}`);

    const syncStartTime = Date.now();
    let processed = 0;
    const errors = [];

    for (const record of records) {
      try {
        await this.receiveDataPush(userId, {
          date: record.date,
          data: record.data,
          sourceApps: record.sourceApps
        });
        processed++;
      } catch (error) {
        errors.push({ date: record.date, error: error.message });
      }
    }

    // Log batch sync
    const connection = await db.query(`
      SELECT id FROM connected_wearables
      WHERE user_id = $1 AND platform = $2
    `, [userId, this.platform]);

    if (connection.rows.length > 0) {
      await healthDataAggregator.logSync(userId, connection.rows[0].id, this.platform, {
        syncType: 'batch',
        status: errors.length === 0 ? 'success' : 'partial',
        recordsFetched: records.length,
        recordsProcessed: processed,
        errorMessage: errors.length > 0 ? `${errors.length} records failed` : null,
        errorDetails: errors.length > 0 ? { errors } : null,
        durationMs: Date.now() - syncStartTime
      });
    }

    return {
      success: errors.length === 0,
      processed,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get sync status for mobile app
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Sync status
   */
  async getSyncStatus(userId) {
    const connection = await db.query(`
      SELECT * FROM connected_wearables
      WHERE user_id = $1 AND platform = $2
    `, [userId, this.platform]);

    if (connection.rows.length === 0) {
      return {
        connected: false,
        message: 'Health Connect not registered'
      };
    }

    const wearable = connection.rows[0];

    // Get last few sync logs
    const recentSyncs = await db.query(`
      SELECT status, started_at, records_processed, error_message
      FROM wearable_sync_log
      WHERE user_id = $1 AND platform = $2
      ORDER BY started_at DESC
      LIMIT 5
    `, [userId, this.platform]);

    return {
      connected: true,
      status: wearable.status,
      lastSync: wearable.last_sync_at,
      permissions: wearable.permissions,
      recentSyncs: recentSyncs.rows
    };
  }

  /**
   * Disconnect Health Connect
   * @param {number} userId - User ID
   */
  async disconnect(userId) {
    await db.query(`
      UPDATE connected_wearables
      SET status = 'revoked', updated_at = NOW()
      WHERE user_id = $1 AND platform = $2
    `, [userId, this.platform]);

    console.log(`[HealthConnectAdapter] Disconnected for user ${userId}`);
  }
}

module.exports = new HealthConnectAdapter();
