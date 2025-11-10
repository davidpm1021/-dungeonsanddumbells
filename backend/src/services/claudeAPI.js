const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const pool = require('../config/database');

/**
 * Claude API Service
 *
 * Handles all communication with Claude AI with:
 * - Retry logic with exponential backoff
 * - Rate limiting
 * - Error handling and timeouts
 * - Token counting and cost tracking
 * - Response caching
 * - Agent logging
 */

class ClaudeAPI {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Model pricing (cost per million tokens)
    this.pricing = {
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
      'claude-3-5-sonnet-20250131': { input: 3.00, output: 15.00 },
      'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 }
    };

    // Rate limiting state
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxRequestsPerMinute = 50; // Claude's typical limit
    this.requestTimestamps = [];
  }

  /**
   * Main entry point for calling Claude API
   *
   * @param {Object} options
   * @param {string} options.model - Model to use
   * @param {Array} options.messages - Messages array
   * @param {Object} options.system - System prompt (optional)
   * @param {number} options.maxTokens - Max output tokens
   * @param {number} options.temperature - Temperature (0-1)
   * @param {string} options.agentType - Agent type for logging
   * @param {number} options.characterId - Character ID (optional)
   * @param {boolean} options.useCache - Whether to check cache
   * @returns {Promise<Object>} - API response with metadata
   */
  async call(options) {
    const {
      model = process.env.CLAUDE_MODEL_DEFAULT || 'claude-3-5-sonnet-20241022',
      messages,
      system = null,
      maxTokens = 1024,
      temperature = 0.7,
      agentType = 'unknown',
      characterId = null,
      useCache = true
    } = options;

    const startTime = Date.now();

    // Validate inputs
    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required and cannot be empty');
    }

    // Check cache first
    if (useCache) {
      const cached = await this.checkCache(messages, system, model);
      if (cached) {
        console.log(`[ClaudeAPI] Cache hit for ${agentType}`);

        // Log cache hit
        await this.logAgentCall({
          characterId,
          agentType,
          input: { messages, system },
          output: cached.response,
          success: true,
          model,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          costUsd: 0,
          cacheHit: true
        });

        return {
          ...cached.response,
          cached: true,
          latency: Date.now() - startTime
        };
      }
    }

    // Rate limit check
    await this.waitForRateLimit();

    // Make API call with retry logic
    let attempt = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempt < maxAttempts) {
      try {
        const apiOptions = {
          model,
          max_tokens: maxTokens,
          temperature,
          messages
        };

        if (system) {
          apiOptions.system = system;
        }

        console.log(`[ClaudeAPI] Calling ${model} for ${agentType} (attempt ${attempt + 1}/${maxAttempts})`);

        const response = await this.client.messages.create(apiOptions);

        const latencyMs = Date.now() - startTime;
        const tokensUsed = {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens
        };
        const costUsd = this.calculateCost(model, tokensUsed.input, tokensUsed.output);

        console.log(`[ClaudeAPI] Success - ${tokensUsed.total} tokens, $${costUsd.toFixed(4)}, ${latencyMs}ms`);

        // Extract text content
        const content = response.content[0].text;

        // Store in cache
        if (useCache) {
          await this.storeInCache(messages, system, model, {
            content,
            role: response.role,
            model: response.model,
            usage: response.usage
          });
        }

        // Log successful call
        await this.logAgentCall({
          characterId,
          agentType,
          input: { messages, system },
          output: { content, usage: response.usage },
          success: true,
          model,
          tokensUsed: tokensUsed.total,
          latencyMs,
          costUsd,
          cacheHit: false
        });

        return {
          content,
          role: response.role,
          model: response.model,
          usage: tokensUsed,
          cost: costUsd,
          latency: latencyMs,
          cached: false
        };

      } catch (error) {
        lastError = error;
        attempt++;

        console.error(`[ClaudeAPI] Attempt ${attempt} failed:`, error.message);

        // Don't retry on certain errors
        if (error.status === 400 || error.status === 401 || error.status === 403) {
          break; // Bad request, auth error, or forbidden - don't retry
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[ClaudeAPI] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || 'Unknown error';
    console.error(`[ClaudeAPI] All attempts failed for ${agentType}:`, errorMessage);

    // Log failed call
    await this.logAgentCall({
      characterId,
      agentType,
      input: { messages, system },
      output: null,
      success: false,
      errorMessage,
      model,
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      costUsd: 0,
      cacheHit: false
    });

    throw new Error(`Claude API call failed after ${maxAttempts} attempts: ${errorMessage}`);
  }

  /**
   * Rate limiting - wait if we've hit the limit
   */
  async waitForRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    // If we're at the limit, wait
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = oldestTimestamp + 60000 - now;

      if (waitTime > 0) {
        console.log(`[ClaudeAPI] Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }

    // Add current timestamp
    this.requestTimestamps.push(now);
  }

  /**
   * Calculate cost based on token usage and model
   */
  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.pricing[model];

    if (!pricing) {
      console.warn(`[ClaudeAPI] Unknown model pricing: ${model}, using Sonnet pricing`);
      return (inputTokens / 1000000 * 3.00) + (outputTokens / 1000000 * 15.00);
    }

    return (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output);
  }

  /**
   * Check cache for existing response
   */
  async checkCache(messages, system, model) {
    const cacheKey = this.generateCacheKey(messages, system, model);

    try {
      const result = await pool.query(
        `SELECT response_data, hit_count
         FROM response_cache
         WHERE cache_key_hash = $1 AND expires_at > NOW()`,
        [cacheKey]
      );

      if (result.rows.length > 0) {
        // Update hit count and last hit time
        await pool.query(
          `UPDATE response_cache
           SET hit_count = hit_count + 1, last_hit_at = NOW()
           WHERE cache_key_hash = $1`,
          [cacheKey]
        );

        return {
          response: result.rows[0].response_data,
          hitCount: result.rows[0].hit_count + 1
        };
      }

      return null;
    } catch (error) {
      console.error('[ClaudeAPI] Cache check failed:', error.message);
      return null; // Don't fail if cache is unavailable
    }
  }

  /**
   * Store response in cache
   */
  async storeInCache(messages, system, model, response) {
    const cacheKey = this.generateCacheKey(messages, system, model);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour TTL

    try {
      await pool.query(
        `INSERT INTO response_cache (cache_key_hash, response_data, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (cache_key_hash)
         DO UPDATE SET response_data = $2, expires_at = $3, hit_count = 0`,
        [cacheKey, JSON.stringify(response), expiresAt]
      );
    } catch (error) {
      console.error('[ClaudeAPI] Cache store failed:', error.message);
      // Don't throw - caching failures shouldn't break the flow
    }
  }

  /**
   * Generate cache key from messages and system prompt
   */
  generateCacheKey(messages, system, model) {
    const payload = JSON.stringify({ messages, system, model });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Log agent call to database
   */
  async logAgentCall(data) {
    const {
      characterId,
      agentType,
      input,
      output,
      success,
      errorMessage = null,
      model,
      tokensUsed,
      latencyMs,
      costUsd,
      cacheHit
    } = data;

    try {
      await pool.query(
        `INSERT INTO agent_logs (
          character_id, agent_type, input_data, output_data,
          success, error_message, model_used, tokens_used,
          latency_ms, cost_usd, cache_hit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          characterId,
          agentType,
          JSON.stringify(input),
          output ? JSON.stringify(output) : null,
          success,
          errorMessage,
          model,
          tokensUsed,
          latencyMs,
          costUsd,
          cacheHit
        ]
      );
    } catch (error) {
      console.error('[ClaudeAPI] Failed to log agent call:', error.message);
      // Don't throw - logging failures shouldn't break the flow
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(characterId = null, days = 7) {
    const query = characterId
      ? `SELECT agent_type,
                COUNT(*) as total_calls,
                SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
                AVG(latency_ms) as avg_latency,
                SUM(tokens_used) as total_tokens,
                SUM(cost_usd) as total_cost,
                SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
         FROM agent_logs
         WHERE character_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
         GROUP BY agent_type`
      : `SELECT agent_type,
                COUNT(*) as total_calls,
                SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
                AVG(latency_ms) as avg_latency,
                SUM(tokens_used) as total_tokens,
                SUM(cost_usd) as total_cost,
                SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
         FROM agent_logs
         WHERE created_at > NOW() - INTERVAL '${days} days'
         GROUP BY agent_type`;

    const result = await pool.query(query, characterId ? [characterId] : []);
    return result.rows;
  }
}

module.exports = new ClaudeAPI();
