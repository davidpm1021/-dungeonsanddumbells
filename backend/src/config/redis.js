const { createClient } = require('redis');

/**
 * Redis Client Configuration
 *
 * Provides a singleton Redis client for L1 and L3 caching.
 * Falls back gracefully if Redis is unavailable.
 */

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      return this.client;
    }

    this.isConnecting = true;

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('[Redis] Too many reconnection attempts, giving up');
              return new Error('Redis reconnection failed');
            }
            // Exponential backoff: 100ms, 200ms, 400ms, etc.
            return Math.min(retries * 100, 3000);
          }
        }
      });

      // Error handling
      this.client.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
      });

      this.client.on('ready', () => {
        console.log('[Redis] Client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('[Redis] Connection closed');
        this.isConnected = false;
      });

      // Connect
      await this.client.connect();

      this.isConnecting = false;
      return this.client;

    } catch (error) {
      console.error('[Redis] Failed to connect:', error.message);
      console.warn('[Redis] Continuing without Redis - will use PostgreSQL fallback');
      this.isConnecting = false;
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Get the Redis client (auto-connect if needed)
   */
  async getClient() {
    if (!this.client && !this.isConnecting) {
      await this.connect();
    }
    return this.client;
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('[Redis] Disconnected gracefully');
      } catch (error) {
        console.error('[Redis] Error during disconnect:', error.message);
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
