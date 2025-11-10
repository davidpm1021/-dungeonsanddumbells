const crypto = require('crypto');
const redisClient = require('../config/redis');
const pool = require('../config/database');

/**
 * Multi-Tier Caching Layer
 *
 * Implements the research-informed caching strategy:
 * - L1 (Exact Match): Redis hash-based, 24hr TTL, targets 30-40% hit rate
 * - L2 (Semantic): Vector similarity (TODO: Phase 6 with pgvector)
 * - L3 (Prompt Components): Static parts cached in Redis, 1hr TTL
 *
 * Falls back to PostgreSQL if Redis is unavailable.
 */

class CachingLayer {
  constructor() {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      l3Hits: 0,
      l3Misses: 0,
      postgresHits: 0,
      postgresMisses: 0,
      errors: 0
    };
  }

  /**
   * Generate cache key from input
   */
  generateCacheKey(messages, system, model) {
    const payload = JSON.stringify({ messages, system, model });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * L1 Cache - Exact match from Redis (or PostgreSQL fallback)
   *
   * @param {Array} messages - Messages array
   * @param {Object} system - System prompt
   * @param {string} model - Model name
   * @returns {Promise<Object|null>} - Cached response or null
   */
  async getL1(messages, system, model) {
    const cacheKey = this.generateCacheKey(messages, system, model);

    // Try Redis first
    if (redisClient.isAvailable()) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          const cached = await redis.get(`l1:${cacheKey}`);

          if (cached) {
            this.stats.l1Hits++;
            console.log('[CachingLayer] L1 cache hit (Redis)');

            // Update hit count in background (don't await)
            this.incrementHitCount(cacheKey, 'redis').catch(err =>
              console.error('[CachingLayer] Failed to update hit count:', err.message)
            );

            return JSON.parse(cached);
          }
        }
      } catch (error) {
        console.error('[CachingLayer] L1 Redis lookup failed:', error.message);
        this.stats.errors++;
      }
    }

    // Fallback to PostgreSQL
    try {
      const result = await pool.query(
        `SELECT response_data, hit_count
         FROM response_cache
         WHERE cache_key_hash = $1 AND expires_at > NOW()`,
        [cacheKey]
      );

      if (result.rows.length > 0) {
        this.stats.postgresHits++;
        console.log('[CachingLayer] L1 cache hit (PostgreSQL fallback)');

        // Update hit count
        await pool.query(
          `UPDATE response_cache
           SET hit_count = hit_count + 1, last_hit_at = NOW()
           WHERE cache_key_hash = $1`,
          [cacheKey]
        );

        return result.rows[0].response_data;
      }

      this.stats.l1Misses++;
      this.stats.postgresMisses++;
      return null;

    } catch (error) {
      console.error('[CachingLayer] L1 PostgreSQL lookup failed:', error.message);
      this.stats.errors++;
      this.stats.l1Misses++;
      return null;
    }
  }

  /**
   * Store in L1 cache (Redis + PostgreSQL)
   *
   * @param {Array} messages - Messages array
   * @param {Object} system - System prompt
   * @param {string} model - Model name
   * @param {Object} response - Response to cache
   * @param {number} ttlHours - Time to live in hours (default 24)
   */
  async setL1(messages, system, model, response, ttlHours = 24) {
    const cacheKey = this.generateCacheKey(messages, system, model);
    const responseData = JSON.stringify(response);

    // Store in Redis
    if (redisClient.isAvailable()) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          await redis.setEx(
            `l1:${cacheKey}`,
            ttlHours * 3600, // Convert to seconds
            responseData
          );
          console.log(`[CachingLayer] Stored in L1 cache (Redis, TTL ${ttlHours}h)`);
        }
      } catch (error) {
        console.error('[CachingLayer] Failed to store in Redis:', error.message);
        this.stats.errors++;
      }
    }

    // Also store in PostgreSQL as backup
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      await pool.query(
        `INSERT INTO response_cache (cache_key_hash, response_data, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (cache_key_hash)
         DO UPDATE SET response_data = $2, expires_at = $3, created_at = NOW()`,
        [cacheKey, response, expiresAt]
      );

      console.log(`[CachingLayer] Stored in L1 cache (PostgreSQL, TTL ${ttlHours}h)`);

    } catch (error) {
      console.error('[CachingLayer] Failed to store in PostgreSQL:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * L3 Cache - Static prompt components (World Bible, NPC profiles, etc.)
   *
   * @param {string} componentType - Type of component (e.g., 'world_bible', 'npc_profile')
   * @param {string} identifier - Specific identifier (e.g., NPC name)
   * @returns {Promise<Object|null>} - Cached component or null
   */
  async getL3(componentType, identifier = 'default') {
    const cacheKey = `l3:${componentType}:${identifier}`;

    if (redisClient.isAvailable()) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          const cached = await redis.get(cacheKey);

          if (cached) {
            this.stats.l3Hits++;
            console.log(`[CachingLayer] L3 cache hit: ${componentType}:${identifier}`);
            return JSON.parse(cached);
          }
        }
      } catch (error) {
        console.error('[CachingLayer] L3 lookup failed:', error.message);
        this.stats.errors++;
      }
    }

    this.stats.l3Misses++;
    return null;
  }

  /**
   * Store in L3 cache
   *
   * @param {string} componentType - Type of component
   * @param {string} identifier - Specific identifier
   * @param {Object} data - Data to cache
   * @param {number} ttlHours - Time to live in hours (default 1)
   */
  async setL3(componentType, identifier = 'default', data, ttlHours = 1) {
    const cacheKey = `l3:${componentType}:${identifier}`;

    if (redisClient.isAvailable()) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          await redis.setEx(
            cacheKey,
            ttlHours * 3600,
            JSON.stringify(data)
          );
          console.log(`[CachingLayer] Stored in L3 cache: ${componentType}:${identifier} (TTL ${ttlHours}h)`);
        }
      } catch (error) {
        console.error('[CachingLayer] Failed to store in L3:', error.message);
        this.stats.errors++;
      }
    } else {
      console.warn('[CachingLayer] Redis unavailable, L3 cache not stored');
    }
  }

  /**
   * Invalidate specific cache entries
   *
   * @param {string} pattern - Redis key pattern (e.g., 'l3:world_bible:*')
   */
  async invalidate(pattern) {
    if (redisClient.isAvailable()) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(keys);
            console.log(`[CachingLayer] Invalidated ${keys.length} cache entries matching: ${pattern}`);
          }
        }
      } catch (error) {
        console.error('[CachingLayer] Failed to invalidate cache:', error.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Increment hit count (for metrics)
   */
  async incrementHitCount(cacheKey, source) {
    if (source === 'redis' && redisClient.isAvailable()) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          await redis.incr(`hitcount:${cacheKey}`);
        }
      } catch (error) {
        // Don't throw, this is non-critical
        console.error('[CachingLayer] Failed to increment hit count:', error.message);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const l1Total = this.stats.l1Hits + this.stats.l1Misses;
    const l2Total = this.stats.l2Hits + this.stats.l2Misses;
    const l3Total = this.stats.l3Hits + this.stats.l3Misses;
    const postgresTotal = this.stats.postgresHits + this.stats.postgresMisses;
    const total = l1Total + l2Total + l3Total;

    return {
      l1: {
        hits: this.stats.l1Hits,
        misses: this.stats.l1Misses,
        hitRate: l1Total > 0 ? (this.stats.l1Hits / l1Total * 100).toFixed(2) + '%' : 'N/A'
      },
      l2: {
        hits: this.stats.l2Hits,
        misses: this.stats.l2Misses,
        hitRate: l2Total > 0 ? (this.stats.l2Hits / l2Total * 100).toFixed(2) + '%' : 'N/A',
        note: 'Not implemented yet (Phase 6 - vector embeddings)'
      },
      l3: {
        hits: this.stats.l3Hits,
        misses: this.stats.l3Misses,
        hitRate: l3Total > 0 ? (this.stats.l3Hits / l3Total * 100).toFixed(2) + '%' : 'N/A'
      },
      postgres: {
        hits: this.stats.postgresHits,
        misses: this.stats.postgresMisses,
        hitRate: postgresTotal > 0 ? (this.stats.postgresHits / postgresTotal * 100).toFixed(2) + '%' : 'N/A'
      },
      combined: {
        hits: this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits,
        misses: this.stats.l1Misses + this.stats.l2Misses + this.stats.l3Misses,
        hitRate: total > 0 ? ((this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) / total * 100).toFixed(2) + '%' : 'N/A'
      },
      errors: this.stats.errors,
      redisAvailable: redisClient.isAvailable()
    };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats() {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      l3Hits: 0,
      l3Misses: 0,
      postgresHits: 0,
      postgresMisses: 0,
      errors: 0
    };
  }
}

// Export singleton instance
const cachingLayer = new CachingLayer();

module.exports = cachingLayer;
