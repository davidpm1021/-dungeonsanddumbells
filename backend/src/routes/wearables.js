const express = require('express');
const router = express.Router();
const healthDataAggregator = require('../services/healthDataAggregator');
const ouraAdapter = require('../services/adapters/ouraAdapter');
const healthConnectAdapter = require('../services/adapters/healthConnectAdapter');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/wearables
 * Get all connected wearables for the user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const wearables = await healthDataAggregator.getConnectedWearables(req.user.userId);

    res.json({
      wearables,
      supportedPlatforms: [
        { id: 'oura', name: 'Oura Ring', icon: '💍', capabilities: ['sleep', 'activity', 'heart', 'recovery'] },
        { id: 'apple_health', name: 'Apple Health', icon: '🍎', capabilities: ['sleep', 'activity', 'heart', 'workout'] },
        { id: 'fitbit', name: 'Fitbit', icon: '⌚', capabilities: ['sleep', 'activity', 'heart', 'workout'] },
        { id: 'garmin', name: 'Garmin', icon: '🏃', capabilities: ['sleep', 'activity', 'heart', 'workout', 'recovery'] },
        { id: 'google_fit', name: 'Google Fit', icon: '🤖', capabilities: ['activity', 'heart', 'workout'] },
        { id: 'samsung_health', name: 'Samsung Health', icon: '📱', capabilities: ['sleep', 'activity', 'heart', 'workout'] }
      ]
    });
  } catch (error) {
    console.error('Get wearables error:', error);
    res.status(500).json({ error: 'Failed to get wearables' });
  }
});

/**
 * POST /api/wearables/connect
 * Initiate connection to a wearable platform
 * In production, this would redirect to OAuth flow
 */
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const { platform, credentials, permissions } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const validPlatforms = ['oura', 'apple_health', 'fitbit', 'garmin', 'google_fit', 'samsung_health'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // In production, this would handle OAuth callback
    // For now, accept mock credentials for testing
    const wearable = await healthDataAggregator.connectWearable(
      req.user.userId,
      platform,
      credentials || {
        platformUserId: `mock_${platform}_${req.user.userId}`,
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      permissions || ['sleep', 'activity', 'heart', 'workout']
    );

    res.status(201).json({
      message: `Connected to ${platform}`,
      wearable: {
        id: wearable.id,
        platform: wearable.platform,
        status: wearable.status,
        permissions: wearable.permissions,
        connectedAt: wearable.connected_at
      }
    });
  } catch (error) {
    console.error('Connect wearable error:', error);
    res.status(500).json({ error: 'Failed to connect wearable', message: error.message });
  }
});

/**
 * DELETE /api/wearables/:platform
 * Disconnect a wearable platform
 */
router.delete('/:platform', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;

    await healthDataAggregator.disconnectWearable(req.user.userId, platform);

    res.json({ message: `Disconnected from ${platform}` });
  } catch (error) {
    console.error('Disconnect wearable error:', error);
    res.status(500).json({ error: 'Failed to disconnect wearable' });
  }
});

/**
 * POST /api/wearables/sync
 * Manually trigger sync for a platform (or simulate data for testing)
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { platform, date, data } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const syncDate = date ? new Date(date) : new Date();

    // For testing: accept mock data directly
    // In production: this would fetch from the platform's API
    const healthData = data || generateMockHealthData(platform);

    const dailyData = await healthDataAggregator.aggregateFromSource(
      req.user.userId,
      platform,
      syncDate,
      healthData
    );

    // Log the sync
    await healthDataAggregator.logSync(req.user.userId, null, platform, {
      syncType: 'manual',
      status: 'success',
      dateRangeStart: syncDate,
      dateRangeEnd: syncDate,
      recordsFetched: 1,
      recordsProcessed: 1
    });

    res.json({
      message: 'Sync completed',
      dailyData,
      gameConditions: healthDataAggregator.deriveGameConditions(dailyData)
    });
  } catch (error) {
    console.error('Sync wearable error:', error);
    res.status(500).json({ error: 'Failed to sync wearable data', message: error.message });
  }
});

/**
 * GET /api/wearables/daily/:date?
 * Get aggregated daily health data
 */
router.get('/daily/:date?', authenticateToken, async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : new Date();

    const dailyData = await healthDataAggregator.getDailyData(req.user.userId, date);

    if (!dailyData) {
      return res.json({
        date: date.toISOString().split('T')[0],
        data: null,
        gameConditions: [],
        message: 'No health data for this date'
      });
    }

    res.json({
      date: dailyData.date,
      data: dailyData,
      gameConditions: healthDataAggregator.deriveGameConditions(dailyData),
      sources: dailyData.data_sources,
      confidence: dailyData.confidence_score
    });
  } catch (error) {
    console.error('Get daily data error:', error);
    res.status(500).json({ error: 'Failed to get daily health data' });
  }
});

/**
 * GET /api/wearables/weekly
 * Get weekly health averages and trends
 */
router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const averages = await healthDataAggregator.getWeeklyAverages(req.user.userId);

    // Get daily data for the week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const dailyData = await healthDataAggregator.getDateRange(req.user.userId, startDate, endDate);

    res.json({
      period: 'week',
      averages: {
        sleepMinutes: Math.round(averages.avg_sleep_minutes) || 0,
        sleepQuality: parseFloat(averages.avg_sleep_quality) || 0,
        steps: Math.round(averages.avg_steps) || 0,
        activeMinutes: Math.round(averages.avg_active_minutes) || 0,
        restingHeartRate: Math.round(averages.avg_resting_hr) || 0,
        hrv: parseFloat(averages.avg_hrv) || 0,
        totalWorkouts: parseInt(averages.total_workouts) || 0,
        totalWorkoutMinutes: parseInt(averages.total_workout_minutes) || 0,
        totalMeditationMinutes: parseInt(averages.total_meditation_minutes) || 0,
        stressScore: parseFloat(averages.avg_stress) || 0,
        recoveryScore: parseFloat(averages.avg_recovery) || 0,
        daysTracked: parseInt(averages.days_tracked) || 0
      },
      dailyBreakdown: dailyData
    });
  } catch (error) {
    console.error('Get weekly data error:', error);
    res.status(500).json({ error: 'Failed to get weekly health data' });
  }
});

/**
 * GET /api/wearables/priorities
 * Get user's data source priorities
 */
router.get('/priorities', authenticateToken, async (req, res) => {
  try {
    const priorities = await healthDataAggregator.getUserPriorities(req.user.userId);

    res.json({
      priorities,
      defaultPriorities: healthDataAggregator.defaultPriorities,
      metricCategories: healthDataAggregator.metricCategories
    });
  } catch (error) {
    console.error('Get priorities error:', error);
    res.status(500).json({ error: 'Failed to get priorities' });
  }
});

/**
 * PUT /api/wearables/priorities/:category
 * Update data source priorities for a category
 */
router.put('/priorities/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { priorities, strategy } = req.body;

    const validCategories = healthDataAggregator.metricCategories;
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const validStrategies = ['highest_priority', 'average', 'highest_value', 'lowest_value', 'most_recent'];
    if (strategy && !validStrategies.includes(strategy)) {
      return res.status(400).json({ error: 'Invalid resolution strategy' });
    }

    await healthDataAggregator.setUserPriority(
      req.user.userId,
      category,
      priorities || healthDataAggregator.defaultPriorities,
      strategy || 'highest_priority'
    );

    res.json({ message: `Updated priorities for ${category}` });
  } catch (error) {
    console.error('Update priorities error:', error);
    res.status(500).json({ error: 'Failed to update priorities' });
  }
});

/**
 * Generate mock health data for testing
 * @param {string} platform - Platform name
 * @returns {Object} Mock health data
 */
function generateMockHealthData(platform) {
  const baseData = {
    sleep_duration_minutes: 420 + Math.floor(Math.random() * 120), // 7-9 hours
    sleep_quality_score: 0.7 + Math.random() * 0.25,
    sleep_deep_minutes: 60 + Math.floor(Math.random() * 60),
    sleep_rem_minutes: 90 + Math.floor(Math.random() * 30),
    sleep_light_minutes: 180 + Math.floor(Math.random() * 60),
    steps: 6000 + Math.floor(Math.random() * 8000),
    active_minutes: 30 + Math.floor(Math.random() * 60),
    calories_burned: 1800 + Math.floor(Math.random() * 800),
    resting_heart_rate: 55 + Math.floor(Math.random() * 20),
    avg_heart_rate: 70 + Math.floor(Math.random() * 20),
    hrv_avg: 30 + Math.floor(Math.random() * 40)
  };

  // Add platform-specific data
  if (platform === 'oura' || platform === 'garmin') {
    baseData.recovery_score = 0.6 + Math.random() * 0.35;
    baseData.readiness_score = 0.6 + Math.random() * 0.35;
    baseData.stress_score = Math.random() * 0.5;
  }

  return baseData;
}

// ==========================================
// OURA RING ROUTES
// ==========================================

/**
 * GET /api/wearables/oura/auth
 * Get Oura OAuth authorization URL
 */
router.get('/oura/auth', authenticateToken, async (req, res) => {
  try {
    if (!ouraAdapter.isConfigured()) {
      return res.status(503).json({
        error: 'Oura integration not configured',
        message: 'Set OURA_CLIENT_ID and OURA_CLIENT_SECRET environment variables'
      });
    }

    const authUrl = ouraAdapter.getAuthorizationUrl(req.user.userId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Oura auth error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL', message: error.message });
  }
});

/**
 * GET /api/wearables/callback/oura
 * Oura OAuth callback handler
 */
router.get('/callback/oura', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/settings?wearable_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect('/settings?wearable_error=missing_params');
    }

    const result = await ouraAdapter.handleCallback(code, state);

    // Redirect back to settings with success
    res.redirect(`/settings?wearable_connected=oura`);
  } catch (error) {
    console.error('Oura callback error:', error);
    res.redirect(`/settings?wearable_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/wearables/oura/sync
 * Trigger manual Oura sync
 */
router.post('/oura/sync', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const result = await ouraAdapter.syncData(
      req.user.userId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json(result);
  } catch (error) {
    console.error('Oura sync error:', error);
    res.status(500).json({ error: 'Failed to sync Oura data', message: error.message });
  }
});

// ==========================================
// HEALTH CONNECT ROUTES (Android)
// ==========================================

/**
 * POST /api/wearables/health-connect/register
 * Register Health Connect connection from mobile app
 */
router.post('/health-connect/register', authenticateToken, async (req, res) => {
  try {
    const { deviceId, permissions } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const result = await healthConnectAdapter.registerConnection(
      req.user.userId,
      deviceId,
      permissions || []
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Health Connect register error:', error);
    res.status(500).json({ error: 'Failed to register Health Connect', message: error.message });
  }
});

/**
 * POST /api/wearables/health-connect/push
 * Receive health data push from mobile app
 */
router.post('/health-connect/push', authenticateToken, async (req, res) => {
  try {
    const { deviceId, date, data, sourceApps } = req.body;

    if (!date || !data) {
      return res.status(400).json({ error: 'Date and data are required' });
    }

    const result = await healthConnectAdapter.receiveDataPush(req.user.userId, {
      deviceId,
      date,
      data,
      sourceApps
    });

    res.json(result);
  } catch (error) {
    console.error('Health Connect push error:', error);
    res.status(500).json({ error: 'Failed to process health data', message: error.message });
  }
});

/**
 * POST /api/wearables/health-connect/batch
 * Receive batch health data sync from mobile app
 */
router.post('/health-connect/batch', authenticateToken, async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const result = await healthConnectAdapter.receiveBatchSync(req.user.userId, records);

    res.json(result);
  } catch (error) {
    console.error('Health Connect batch error:', error);
    res.status(500).json({ error: 'Failed to process batch sync', message: error.message });
  }
});

/**
 * GET /api/wearables/health-connect/status
 * Get Health Connect sync status for mobile app
 */
router.get('/health-connect/status', authenticateToken, async (req, res) => {
  try {
    const status = await healthConnectAdapter.getSyncStatus(req.user.userId);
    res.json(status);
  } catch (error) {
    console.error('Health Connect status error:', error);
    res.status(500).json({ error: 'Failed to get sync status', message: error.message });
  }
});

module.exports = router;
