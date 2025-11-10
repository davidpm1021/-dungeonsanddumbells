const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const cachingLayer = require('../services/cachingLayer');
const claudeAPI = require('../services/claudeAPI');
const redisClient = require('../config/redis');

/**
 * Monitoring & Analytics Endpoints
 *
 * Provides visibility into:
 * - Cache hit rates (L1, L2, L3, combined)
 * - Lorekeeper validation pass rate
 * - Cost per active user by agent
 * - API latency P50/P95/P99
 * - Agent performance metrics
 */

/**
 * GET /api/monitoring/health
 * Comprehensive health check with system status
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await pool.query('SELECT NOW()');
    const dbStatus = dbCheck.rows.length > 0 ? 'healthy' : 'unhealthy';

    // Check Redis connection
    const redisStatus = redisClient.isAvailable() ? 'connected' : 'disconnected';

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus
      },
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/cache-stats
 * Get multi-tier cache statistics
 */
router.get('/cache-stats', (req, res) => {
  try {
    const stats = cachingLayer.getStats();

    res.json({
      timestamp: new Date().toISOString(),
      caching: stats,
      target: {
        l1HitRate: '30-40%',
        l2HitRate: '20-30%',
        combinedHitRate: '60-90%'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cache stats',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/agent-stats
 * Get agent performance statistics
 */
router.get('/agent-stats', async (req, res) => {
  try {
    const { characterId, days = 7 } = req.query;

    // Get stats from claudeAPI
    const agentStats = await claudeAPI.getAgentStats(
      characterId ? parseInt(characterId) : null,
      parseInt(days)
    );

    // Calculate totals
    const totals = agentStats.reduce((acc, stat) => {
      acc.totalCalls += parseInt(stat.total_calls);
      acc.successfulCalls += parseInt(stat.successful_calls);
      acc.totalTokens += parseInt(stat.total_tokens || 0);
      acc.totalCost += parseFloat(stat.total_cost || 0);
      acc.cacheHits += parseInt(stat.cache_hits || 0);
      return acc;
    }, {
      totalCalls: 0,
      successfulCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      cacheHits: 0
    });

    const successRate = totals.totalCalls > 0
      ? ((totals.successfulCalls / totals.totalCalls) * 100).toFixed(2)
      : 'N/A';

    const cacheHitRate = totals.totalCalls > 0
      ? ((totals.cacheHits / totals.totalCalls) * 100).toFixed(2)
      : 'N/A';

    res.json({
      timestamp: new Date().toISOString(),
      period: `Last ${days} days`,
      characterId: characterId || 'all',
      byAgent: agentStats.map(stat => ({
        agentType: stat.agent_type,
        totalCalls: parseInt(stat.total_calls),
        successfulCalls: parseInt(stat.successful_calls),
        successRate: ((parseInt(stat.successful_calls) / parseInt(stat.total_calls)) * 100).toFixed(2) + '%',
        avgLatencyMs: parseFloat(stat.avg_latency).toFixed(2),
        totalTokens: parseInt(stat.total_tokens || 0),
        totalCost: parseFloat(stat.total_cost || 0).toFixed(4),
        cacheHits: parseInt(stat.cache_hits || 0),
        cacheHitRate: ((parseInt(stat.cache_hits) / parseInt(stat.total_calls)) * 100).toFixed(2) + '%'
      })),
      totals: {
        ...totals,
        successRate: successRate + '%',
        cacheHitRate: cacheHitRate + '%',
        avgCostPerCall: totals.totalCalls > 0
          ? (totals.totalCost / totals.totalCalls).toFixed(4)
          : 'N/A'
      },
      targets: {
        successRate: '>99%',
        cacheHitRate: '60-90%',
        costPerActiveUserPerDay: '<$0.10',
        questGenerationLatency: '<3000ms',
        agentFailureRate: '<1%'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve agent stats',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/lorekeeper-validation
 * Get Lorekeeper validation statistics
 */
router.get('/lorekeeper-validation', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_validations,
        SUM(CASE WHEN consistency_score >= 85 THEN 1 ELSE 0 END) as passed_validations,
        AVG(consistency_score) as avg_score,
        MIN(consistency_score) as min_score,
        MAX(consistency_score) as max_score
       FROM agent_logs
       WHERE agent_type = 'lorekeeper'
         AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
         AND consistency_score IS NOT NULL`
    );

    const stats = result.rows[0];
    const totalValidations = parseInt(stats.total_validations);
    const passedValidations = parseInt(stats.passed_validations);

    const passRate = totalValidations > 0
      ? ((passedValidations / totalValidations) * 100).toFixed(2)
      : 'N/A';

    res.json({
      timestamp: new Date().toISOString(),
      period: `Last ${days} days`,
      totalValidations,
      passedValidations,
      passRate: passRate === 'N/A' ? passRate : passRate + '%',
      avgScore: stats.avg_score ? parseFloat(stats.avg_score).toFixed(2) : 'N/A',
      minScore: stats.min_score ? parseFloat(stats.min_score).toFixed(2) : 'N/A',
      maxScore: stats.max_score ? parseFloat(stats.max_score).toFixed(2) : 'N/A',
      target: {
        passRate: '85%+',
        avgScore: '85+'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve Lorekeeper validation stats',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/latency
 * Get API latency percentiles (P50, P95, P99)
 */
router.get('/latency', async (req, res) => {
  try {
    const { days = 7, agentType } = req.query;

    const agentFilter = agentType ? `AND agent_type = $1` : '';
    const params = agentType ? [agentType] : [];

    const result = await pool.query(
      `SELECT
        agent_type,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99,
        AVG(latency_ms) as avg_latency,
        COUNT(*) as sample_size
       FROM agent_logs
       WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days'
         AND latency_ms IS NOT NULL
         ${agentFilter}
       GROUP BY agent_type
       ORDER BY agent_type`,
      params
    );

    res.json({
      timestamp: new Date().toISOString(),
      period: `Last ${days} days`,
      byAgent: result.rows.map(row => ({
        agentType: row.agent_type,
        p50: parseFloat(row.p50).toFixed(2) + 'ms',
        p95: parseFloat(row.p95).toFixed(2) + 'ms',
        p99: parseFloat(row.p99).toFixed(2) + 'ms',
        avg: parseFloat(row.avg_latency).toFixed(2) + 'ms',
        sampleSize: parseInt(row.sample_size)
      })),
      target: {
        questGenerationP95: '<3000ms'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve latency stats',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/cost-per-user
 * Get cost per active user
 */
router.get('/cost-per-user', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const result = await pool.query(
      `SELECT
        character_id,
        SUM(cost_usd) as total_cost,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        COUNT(*) as total_calls
       FROM agent_logs
       WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days'
         AND character_id IS NOT NULL
       GROUP BY character_id`
    );

    const userCosts = result.rows.map(row => ({
      characterId: row.character_id,
      totalCost: parseFloat(row.total_cost).toFixed(4),
      activeDays: parseInt(row.active_days),
      costPerDay: (parseFloat(row.total_cost) / parseInt(row.active_days)).toFixed(4),
      totalCalls: parseInt(row.total_calls)
    }));

    const avgCostPerDay = userCosts.length > 0
      ? (userCosts.reduce((sum, u) => sum + parseFloat(u.costPerDay), 0) / userCosts.length).toFixed(4)
      : 'N/A';

    res.json({
      timestamp: new Date().toISOString(),
      period: `Last ${days} days`,
      activeUsers: userCosts.length,
      avgCostPerUserPerDay: avgCostPerDay === 'N/A' ? avgCostPerDay : '$' + avgCostPerDay,
      byUser: userCosts,
      target: {
        costPerUserPerDay: '<$0.10'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cost per user stats',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * Comprehensive dashboard with all metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Get all metrics in parallel
    const [
      cacheStats,
      agentStats,
      lorekeeperStats,
      latencyStats,
      costStats
    ] = await Promise.all([
      Promise.resolve(cachingLayer.getStats()),
      claudeAPI.getAgentStats(null, parseInt(days)),
      pool.query(
        `SELECT
          COUNT(*) as total_validations,
          SUM(CASE WHEN consistency_score >= 85 THEN 1 ELSE 0 END) as passed_validations,
          AVG(consistency_score) as avg_score
         FROM agent_logs
         WHERE agent_type = 'lorekeeper'
           AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
           AND consistency_score IS NOT NULL`
      ),
      pool.query(
        `SELECT
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
         FROM agent_logs
         WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days'
           AND latency_ms IS NOT NULL`
      ),
      pool.query(
        `SELECT
          COUNT(DISTINCT character_id) as active_users,
          SUM(cost_usd) as total_cost
         FROM agent_logs
         WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days'
           AND character_id IS NOT NULL`
      )
    ]);

    // Calculate summary metrics
    const totalCalls = agentStats.reduce((sum, s) => sum + parseInt(s.total_calls), 0);
    const totalCost = agentStats.reduce((sum, s) => sum + parseFloat(s.total_cost || 0), 0);
    const cacheHits = agentStats.reduce((sum, s) => sum + parseInt(s.cache_hits || 0), 0);

    const lorekeeperData = lorekeeperStats.rows[0];
    const lorekeeperPassRate = parseInt(lorekeeperData.total_validations) > 0
      ? ((parseInt(lorekeeperData.passed_validations) / parseInt(lorekeeperData.total_validations)) * 100).toFixed(2)
      : 'N/A';

    const activeUsers = parseInt(costStats.rows[0].active_users || 0);
    const avgCostPerUser = activeUsers > 0 && totalCost > 0
      ? (totalCost / activeUsers / parseInt(days)).toFixed(4)
      : 'N/A';

    res.json({
      timestamp: new Date().toISOString(),
      period: `Last ${days} days`,
      summary: {
        cacheHitRate: cacheStats.combined.hitRate,
        lorekeeperPassRate: lorekeeperPassRate === 'N/A' ? lorekeeperPassRate : lorekeeperPassRate + '%',
        avgCostPerUserPerDay: avgCostPerUser === 'N/A' ? avgCostPerUser : '$' + avgCostPerUser,
        p95Latency: latencyStats.rows[0]?.p95 ? parseFloat(latencyStats.rows[0].p95).toFixed(2) + 'ms' : 'N/A',
        activeUsers,
        totalCalls,
        totalCost: '$' + totalCost.toFixed(4)
      },
      targets: {
        cacheHitRate: '60-90%',
        lorekeeperPassRate: '85%+',
        costPerUserPerDay: '<$0.10',
        p95Latency: '<3000ms'
      },
      redisStatus: redisClient.isAvailable() ? 'connected' : 'disconnected',
      detailedStats: {
        cache: cacheStats,
        agents: agentStats,
        lorekeeper: lorekeeperData,
        latency: latencyStats.rows[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

/**
 * POST /api/monitoring/cache/reset
 * Reset cache statistics (for testing)
 */
router.post('/cache/reset', (req, res) => {
  try {
    cachingLayer.resetStats();

    res.json({
      message: 'Cache statistics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset cache stats',
      message: error.message
    });
  }
});

module.exports = router;
