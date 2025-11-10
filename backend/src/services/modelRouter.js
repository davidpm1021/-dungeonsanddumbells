/**
 * Model Router
 *
 * Intelligently routes queries to appropriate Claude models based on:
 * - Task complexity
 * - Query type
 * - Cost optimization
 *
 * Tiering Strategy:
 * - Haiku: Fast, cheap validation and simple tasks
 * - Sonnet 3.5: Routine content generation
 * - Sonnet 4.5: Critical narrative decisions and complex reasoning
 */

class ModelRouter {
  constructor() {
    // Model capabilities and pricing
    this.models = {
      haiku: {
        id: 'claude-3-haiku-20240307',
        speed: 'fastest',
        cost: 'lowest',
        quality: 'good',
        use_for: ['validation', 'simple_summaries', 'formatting', 'classification']
      },
      sonnet35: {
        id: 'claude-3-5-sonnet-20241022',
        speed: 'fast',
        cost: 'medium',
        quality: 'excellent',
        use_for: ['content_generation', 'quest_creation', 'npc_dialogue', 'memory_summaries']
      },
      sonnet45: {
        id: 'claude-sonnet-4-20250514',
        speed: 'moderate',
        cost: 'medium',
        quality: 'best',
        use_for: ['story_coordination', 'critical_decisions', 'complex_reasoning', 'lorekeeper_validation']
      }
    };

    // Query type mappings
    this.queryTypeMap = {
      // Validation & simple tasks -> Haiku
      'validate_quest': 'haiku',
      'validate_npc_dialogue': 'haiku',
      'format_output': 'haiku',
      'classify_content': 'haiku',
      'check_prerequisites': 'haiku',

      // Content generation -> Sonnet 3.5
      'generate_quest': 'sonnet35',
      'generate_npc_dialogue': 'sonnet35',
      'generate_event_description': 'sonnet35',
      'compress_memory': 'sonnet35',
      'summarize_episode': 'sonnet35',

      // Strategic decisions -> Sonnet 4.5
      'story_coordination': 'sonnet45',
      'evaluate_quest_need': 'sonnet45',
      'decide_content_type': 'sonnet45',
      'lorekeeper_deep_validation': 'sonnet45',
      'consequence_evaluation': 'sonnet45'
    };
  }

  /**
   * Route query to appropriate model
   *
   * @param {string} queryType - Type of query (e.g., 'generate_quest', 'validate_quest')
   * @param {string} complexity - Complexity override ('simple', 'moderate', 'complex')
   * @returns {string} - Model ID
   */
  route(queryType, complexity = null) {
    // Handle complexity override
    if (complexity) {
      if (complexity === 'simple') return this.models.haiku.id;
      if (complexity === 'moderate') return this.models.sonnet35.id;
      if (complexity === 'complex') return this.models.sonnet45.id;
    }

    // Default routing by query type
    const tier = this.queryTypeMap[queryType];

    if (!tier) {
      console.warn(`[ModelRouter] Unknown query type: ${queryType}, defaulting to sonnet35`);
      return this.models.sonnet35.id;
    }

    return this.models[tier].id;
  }

  /**
   * Get model tier name from model ID
   */
  getTier(modelId) {
    for (const [tier, config] of Object.entries(this.models)) {
      if (config.id === modelId) {
        return tier;
      }
    }
    return 'unknown';
  }

  /**
   * Get model info
   */
  getModelInfo(modelId) {
    for (const [tier, config] of Object.entries(this.models)) {
      if (config.id === modelId) {
        return { tier, ...config };
      }
    }
    return null;
  }

  /**
   * Get recommended model for agent type
   */
  getModelForAgent(agentType) {
    const agentMap = {
      'story_coordinator': this.models.sonnet45.id,
      'quest_creator': this.models.sonnet45.id, // Use Sonnet 4 since 3.5 not available in API
      'lorekeeper': this.models.sonnet45.id,
      'memory_manager': this.models.sonnet45.id, // Use Sonnet 4 since 3.5 not available in API
      'consequence_engine': this.models.sonnet45.id,
      'npc_generator': this.models.sonnet45.id // Use Sonnet 4 since 3.5 not available in API
    };

    return agentMap[agentType] || this.models.sonnet45.id;
  }

  /**
   * Estimate cost for a query
   * @param {number} inputTokens - Estimated input tokens
   * @param {number} outputTokens - Estimated output tokens
   * @param {string} modelId - Model ID
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(inputTokens, outputTokens, modelId) {
    const pricing = {
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
      'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 }
    };

    const model = pricing[modelId] || pricing['claude-3-5-sonnet-20241022'];

    return (inputTokens / 1000000 * model.input) + (outputTokens / 1000000 * model.output);
  }

  /**
   * Get all available models
   */
  getAvailableModels() {
    return Object.entries(this.models).map(([tier, config]) => ({
      tier,
      ...config
    }));
  }
}

module.exports = new ModelRouter();
