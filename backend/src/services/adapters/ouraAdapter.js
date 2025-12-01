/**
 * Oura Ring API Adapter
 * Handles OAuth 2.0 authentication and data fetching from Oura Cloud API v2
 * https://cloud.ouraring.com/v2/docs
 */

const db = require('../../config/database');
const healthDataAggregator = require('../healthDataAggregator');

class OuraAdapter {
  constructor() {
    this.platform = 'oura';
    this.baseUrl = 'https://api.ouraring.com/v2';
    this.authUrl = 'https://cloud.ouraring.com/oauth/authorize';
    this.tokenUrl = 'https://api.ouraring.com/oauth/token';

    // Load from environment
    this.clientId = process.env.OURA_CLIENT_ID;
    this.clientSecret = process.env.OURA_CLIENT_SECRET;
    this.redirectUri = process.env.OURA_REDIRECT_URI || 'http://localhost:3000/api/wearables/callback/oura';
  }

  /**
   * Check if Oura is configured
   * @returns {boolean} Whether client credentials are set
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Generate OAuth authorization URL
   * @param {number} userId - User ID for state parameter
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(userId) {
    if (!this.isConfigured()) {
      throw new Error('Oura API not configured. Set OURA_CLIENT_ID and OURA_CLIENT_SECRET.');
    }

    const scopes = [
      'daily',      // Daily activity, readiness, sleep scores
      'heartrate',  // Heart rate data
      'workout',    // Workout data
      'personal'    // Personal info (for user ID)
    ];

    const state = Buffer.from(JSON.stringify({
      userId,
      platform: this.platform,
      timestamp: Date.now()
    })).toString('base64');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForTokens(code) {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Oura token exchange failed: ${error}`);
    }

    const tokens = await response.json();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000)
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshAccessToken(refreshToken) {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Oura token refresh failed: ${error}`);
    }

    const tokens = await response.json();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000)
    };
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {string} accessToken - Access token
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async apiRequest(endpoint, accessToken, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const error = await response.text();
      throw new Error(`Oura API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Get valid access token, refreshing if necessary
   * @param {number} userId - User ID
   * @returns {Promise<string>} Valid access token
   */
  async getValidToken(userId) {
    const result = await db.query(`
      SELECT * FROM connected_wearables
      WHERE user_id = $1 AND platform = $2 AND status = 'active'
    `, [userId, this.platform]);

    if (result.rows.length === 0) {
      throw new Error('Oura not connected');
    }

    const wearable = result.rows[0];

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(wearable.token_expires_at);
    if (expiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
      // Token expired or about to expire, refresh it
      try {
        const newTokens = await this.refreshAccessToken(wearable.refresh_token);

        await db.query(`
          UPDATE connected_wearables
          SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW()
          WHERE id = $4
        `, [newTokens.accessToken, newTokens.refreshToken, newTokens.tokenExpiresAt, wearable.id]);

        return newTokens.accessToken;
      } catch (error) {
        // Mark as expired if refresh fails
        await db.query(`
          UPDATE connected_wearables
          SET status = 'expired', last_error = $1, updated_at = NOW()
          WHERE id = $2
        `, [error.message, wearable.id]);
        throw error;
      }
    }

    return wearable.access_token;
  }

  /**
   * Fetch sleep data for a date range
   * @param {string} accessToken - Access token
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Sleep data
   */
  async fetchSleepData(accessToken, startDate, endDate) {
    const response = await this.apiRequest('/usercollection/daily_sleep', accessToken, {
      start_date: startDate,
      end_date: endDate
    });
    return response.data || [];
  }

  /**
   * Fetch readiness data for a date range
   * @param {string} accessToken - Access token
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Readiness data
   */
  async fetchReadinessData(accessToken, startDate, endDate) {
    const response = await this.apiRequest('/usercollection/daily_readiness', accessToken, {
      start_date: startDate,
      end_date: endDate
    });
    return response.data || [];
  }

  /**
   * Fetch activity data for a date range
   * @param {string} accessToken - Access token
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Activity data
   */
  async fetchActivityData(accessToken, startDate, endDate) {
    const response = await this.apiRequest('/usercollection/daily_activity', accessToken, {
      start_date: startDate,
      end_date: endDate
    });
    return response.data || [];
  }

  /**
   * Fetch heart rate data for a date range
   * @param {string} accessToken - Access token
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Heart rate data
   */
  async fetchHeartRateData(accessToken, startDate, endDate) {
    const response = await this.apiRequest('/usercollection/heartrate', accessToken, {
      start_datetime: `${startDate}T00:00:00+00:00`,
      end_datetime: `${endDate}T23:59:59+00:00`
    });
    return response.data || [];
  }

  /**
   * Transform Oura data to normalized format
   * @param {Object} data - Raw Oura data for a day
   * @returns {Object} Normalized health data
   */
  transformToNormalizedFormat(data) {
    const { sleep, readiness, activity, heartRate } = data;
    const normalized = {};

    // Sleep data
    if (sleep) {
      normalized.sleep_duration_minutes = sleep.contributors?.total_sleep
        ? Math.round(sleep.contributors.total_sleep / 60)
        : null;
      normalized.sleep_quality_score = sleep.score ? sleep.score / 100 : null;
      normalized.sleep_deep_minutes = sleep.contributors?.deep_sleep
        ? Math.round(sleep.contributors.deep_sleep / 60)
        : null;
      normalized.sleep_rem_minutes = sleep.contributors?.rem_sleep
        ? Math.round(sleep.contributors.rem_sleep / 60)
        : null;
      normalized.sleep_light_minutes = sleep.contributors?.light_sleep
        ? Math.round(sleep.contributors.light_sleep / 60)
        : null;
    }

    // Readiness/Recovery data
    if (readiness) {
      normalized.readiness_score = readiness.score ? readiness.score / 100 : null;
      normalized.recovery_score = readiness.score ? readiness.score / 100 : null;
      // Stress is inverse of recovery in Oura's model
      normalized.stress_score = readiness.score ? (100 - readiness.score) / 100 : null;
    }

    // Activity data
    if (activity) {
      normalized.steps = activity.steps || null;
      normalized.active_minutes = activity.high_activity_time
        ? Math.round(activity.high_activity_time / 60)
        : null;
      normalized.calories_burned = activity.total_calories || null;
      normalized.distance_meters = activity.equivalent_walking_distance || null;
    }

    // Heart rate data
    if (heartRate && heartRate.length > 0) {
      // Calculate averages from samples
      const bpms = heartRate.map(h => h.bpm);
      normalized.avg_heart_rate = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
      normalized.resting_heart_rate = Math.min(...bpms);
      normalized.max_heart_rate = Math.max(...bpms);
    }

    return normalized;
  }

  /**
   * Sync data from Oura for a user
   * @param {number} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Sync result
   */
  async syncData(userId, startDate = null, endDate = null) {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    console.log(`[OuraAdapter] Syncing data for user ${userId} from ${startStr} to ${endStr}`);

    const syncStartTime = Date.now();
    let recordsProcessed = 0;

    try {
      const accessToken = await this.getValidToken(userId);

      // Fetch all data types in parallel
      const [sleepData, readinessData, activityData, heartRateData] = await Promise.all([
        this.fetchSleepData(accessToken, startStr, endStr),
        this.fetchReadinessData(accessToken, startStr, endStr),
        this.fetchActivityData(accessToken, startStr, endStr),
        this.fetchHeartRateData(accessToken, startStr, endStr)
      ]);

      // Group heart rate data by day
      const heartRateByDay = {};
      heartRateData.forEach(hr => {
        const day = hr.timestamp.split('T')[0];
        if (!heartRateByDay[day]) heartRateByDay[day] = [];
        heartRateByDay[day].push(hr);
      });

      // Process each day
      const dates = new Set([
        ...sleepData.map(s => s.day),
        ...readinessData.map(r => r.day),
        ...activityData.map(a => a.day)
      ]);

      for (const day of dates) {
        const dayData = {
          sleep: sleepData.find(s => s.day === day),
          readiness: readinessData.find(r => r.day === day),
          activity: activityData.find(a => a.day === day),
          heartRate: heartRateByDay[day] || []
        };

        const normalized = this.transformToNormalizedFormat(dayData);

        // Aggregate into daily health data
        await healthDataAggregator.aggregateFromSource(
          userId,
          this.platform,
          new Date(day),
          normalized
        );

        recordsProcessed++;
      }

      // Update last sync time
      await db.query(`
        UPDATE connected_wearables
        SET last_sync_at = NOW(), status = 'active', last_error = NULL
        WHERE user_id = $1 AND platform = $2
      `, [userId, this.platform]);

      // Log sync
      await healthDataAggregator.logSync(userId, null, this.platform, {
        syncType: 'incremental',
        status: 'success',
        dateRangeStart: start,
        dateRangeEnd: end,
        recordsFetched: sleepData.length + activityData.length + readinessData.length,
        recordsProcessed,
        durationMs: Date.now() - syncStartTime
      });

      console.log(`[OuraAdapter] Sync complete: ${recordsProcessed} days processed`);

      return {
        success: true,
        daysProcessed: recordsProcessed,
        dateRange: { start: startStr, end: endStr }
      };

    } catch (error) {
      console.error(`[OuraAdapter] Sync error for user ${userId}:`, error);

      // Log failed sync
      await healthDataAggregator.logSync(userId, null, this.platform, {
        syncType: 'incremental',
        status: 'failed',
        dateRangeStart: start,
        dateRangeEnd: end,
        recordsProcessed,
        errorMessage: error.message,
        durationMs: Date.now() - syncStartTime
      });

      throw error;
    }
  }

  /**
   * Handle OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter (base64 encoded JSON)
   * @returns {Promise<Object>} Connection result
   */
  async handleCallback(code, state) {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId } = stateData;

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);

    // Get user info to get platform user ID
    let platformUserId = null;
    try {
      const userInfo = await this.apiRequest('/usercollection/personal_info', tokens.accessToken);
      platformUserId = userInfo.id;
    } catch (e) {
      console.warn('[OuraAdapter] Could not fetch user info:', e.message);
    }

    // Store connection
    const wearable = await healthDataAggregator.connectWearable(
      userId,
      this.platform,
      {
        platformUserId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt
      },
      ['sleep', 'activity', 'heart', 'recovery']
    );

    // Trigger initial sync (last 7 days)
    try {
      await this.syncData(userId);
    } catch (e) {
      console.warn('[OuraAdapter] Initial sync failed:', e.message);
    }

    return {
      success: true,
      userId,
      platform: this.platform,
      wearableId: wearable.id
    };
  }
}

module.exports = new OuraAdapter();
