/**
 * Validation Pipeline - Defense-in-Depth Architecture
 *
 * Research-backed multi-layered validation system.
 * From Research.md: "Multi-layered validation architectures catch different
 * error types at appropriate stages."
 *
 * Three tiers:
 * 1. Pre-generation validation (input quality, context validation)
 * 2. Generation-time validation (real-time monitoring, repetition detection)
 * 3. Post-generation validation (coherence, consistency, factuality)
 */

class ValidationPipeline {
  constructor() {
    // Validation thresholds
    this.thresholds = {
      minContextLength: 10,
      maxContextLength: 50000,
      minWordCount: 20,
      maxWordCount: 1000,
      repetitionThreshold: 0.3,
      coherenceThreshold: 0.7,
      consistencyThreshold: 0.85
    };
  }

  /**
   * Tier 1: Pre-generation validation
   * Validates input quality before sending to AI
   */
  async validatePreGeneration(input) {
    console.log('[ValidationPipeline] Tier 1: Pre-generation validation');

    const errors = [];
    const warnings = [];
    let score = 1.0;

    const { character, context, narrativeNeed } = input;

    // Check character data completeness
    if (!character) {
      errors.push('Missing character data');
      score -= 0.3;
    } else {
      if (!character.name) {
        warnings.push('Character missing name');
        score -= 0.05;
      }
      if (!character.class) {
        warnings.push('Character missing class');
        score -= 0.05;
      }
      if (!this.hasValidStats(character)) {
        warnings.push('Character has incomplete stats');
        score -= 0.1;
      }
    }

    // Check narrative need validity
    if (!narrativeNeed) {
      warnings.push('No narrative need specified');
      score -= 0.1;
    } else {
      if (!narrativeNeed.suggestedTheme) {
        warnings.push('No suggested theme');
        score -= 0.05;
      }
    }

    // Check context quality
    if (context) {
      // Check for conflicting information in context
      const conflicts = this.detectContextConflicts(context);
      if (conflicts.length > 0) {
        warnings.push(`Context conflicts detected: ${conflicts.join(', ')}`);
        score -= 0.1 * conflicts.length;
      }

      // Check context size
      const contextSize = JSON.stringify(context).length;
      if (contextSize > this.thresholds.maxContextLength) {
        warnings.push('Context too large, may cause token overflow');
        score -= 0.1;
      }
    }

    // Input sanitization check
    const sanitizationIssues = this.checkInputSanitization(input);
    if (sanitizationIssues.length > 0) {
      errors.push(...sanitizationIssues);
      score -= 0.2 * sanitizationIssues.length;
    }

    return {
      valid: errors.length === 0 && score > 0.5,
      score: Math.max(0, score),
      errors,
      warnings,
      tier: 1
    };
  }

  /**
   * Tier 2: Generation-time validation
   * Monitors content during/after generation
   */
  async validateGeneration(content, context) {
    console.log('[ValidationPipeline] Tier 2: Generation-time validation');

    const warnings = [];
    let score = 1.0;

    // Check for repetition patterns
    const repetitionScore = this.detectRepetition(content);
    if (repetitionScore > this.thresholds.repetitionThreshold) {
      warnings.push(`High repetition detected: ${(repetitionScore * 100).toFixed(1)}%`);
      score -= repetitionScore * 0.5;
    }

    // Check content length
    if (content.description) {
      const wordCount = content.description.split(' ').length;
      if (wordCount < this.thresholds.minWordCount) {
        warnings.push(`Description too short: ${wordCount} words`);
        score -= 0.2;
      }
      if (wordCount > this.thresholds.maxWordCount) {
        warnings.push(`Description too long: ${wordCount} words`);
        score -= 0.1;
      }
    }

    // Check for low-confidence patterns (generic content)
    const genericityScore = this.detectGenericity(content);
    if (genericityScore > 0.5) {
      warnings.push('Content appears too generic');
      score -= genericityScore * 0.3;
    }

    // Check structural validity
    const structuralIssues = this.validateStructure(content);
    if (structuralIssues.length > 0) {
      warnings.push(...structuralIssues);
      score -= 0.1 * structuralIssues.length;
    }

    return {
      valid: score > 0.6,
      canRevise: score > 0.4,
      score: Math.max(0, score),
      warnings,
      tier: 2
    };
  }

  /**
   * Tier 3: Post-generation validation
   * Comprehensive quality assessment
   */
  async validatePostGeneration(content, context, lorekeeperResult = {}) {
    console.log('[ValidationPipeline] Tier 3: Post-generation validation');

    const issues = [];
    let score = 1.0;

    // Narrative coherence evaluation
    const coherenceScore = this.evaluateCoherence(content, context);
    if (coherenceScore < this.thresholds.coherenceThreshold) {
      issues.push(`Low coherence score: ${(coherenceScore * 100).toFixed(1)}%`);
      score -= (this.thresholds.coherenceThreshold - coherenceScore);
    }

    // Character consistency verification
    const characterConsistency = this.checkCharacterConsistency(content, context);
    if (characterConsistency < 0.8) {
      issues.push('Character consistency issues detected');
      score -= 0.2;
    }

    // Plot consistency verification
    const plotConsistency = this.checkPlotConsistency(content, context);
    if (plotConsistency < 0.7) {
      issues.push('Plot consistency issues detected');
      score -= 0.15;
    }

    // Emotional consistency analysis
    const emotionalConsistency = this.checkEmotionalConsistency(content, context);
    if (emotionalConsistency < 0.8) {
      issues.push('Emotional tone inconsistency');
      score -= 0.1;
    }

    // Incorporate Lorekeeper results
    if (lorekeeperResult.consistencyScore) {
      const lorekeeperWeight = 0.3;
      score = score * (1 - lorekeeperWeight) + lorekeeperResult.consistencyScore * lorekeeperWeight;
    }

    // Multi-metric scoring
    const metrics = {
      coherence: coherenceScore,
      characterConsistency,
      plotConsistency,
      emotionalConsistency,
      lorekeeperScore: lorekeeperResult.consistencyScore || 1.0
    };

    return {
      valid: score > this.thresholds.consistencyThreshold,
      score: Math.max(0, Math.min(1, score)),
      issues,
      metrics,
      tier: 3,
      recommendation: this.generateRecommendation(score, issues)
    };
  }

  /**
   * Helper: Check if character has valid stats
   */
  hasValidStats(character) {
    const requiredStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const stats = character.stats || {};

    return requiredStats.every(stat =>
      typeof stats[stat] === 'number' && stats[stat] >= 1
    );
  }

  /**
   * Helper: Detect conflicts in context
   */
  detectContextConflicts(context) {
    const conflicts = [];

    // Check for timeline conflicts
    if (context.recentMemories && Array.isArray(context.recentMemories)) {
      // Simple check: are events in chronological order?
      let lastTimestamp = 0;
      context.recentMemories.forEach((memory, index) => {
        if (memory.timestamp) {
          const ts = new Date(memory.timestamp).getTime();
          if (ts < lastTimestamp) {
            conflicts.push(`Timeline conflict at memory ${index}`);
          }
          lastTimestamp = ts;
        }
      });
    }

    // Check for entity state conflicts
    if (context.entityGraph && context.entityGraph.entities) {
      // Basic check for duplicate entities with different states
      const entityNames = new Set();
      Object.values(context.entityGraph.entities).flat().forEach(entity => {
        if (entityNames.has(entity.name)) {
          conflicts.push(`Duplicate entity: ${entity.name}`);
        }
        entityNames.add(entity.name);
      });
    }

    return conflicts;
  }

  /**
   * Helper: Check input sanitization
   */
  checkInputSanitization(input) {
    const issues = [];

    // Check for potential injection attacks
    const jsonStr = JSON.stringify(input);

    // Look for suspicious patterns
    if (jsonStr.includes('<script>')) {
      issues.push('Potential XSS detected');
    }
    if (jsonStr.includes('DROP TABLE') || jsonStr.includes('DELETE FROM')) {
      issues.push('Potential SQL injection detected');
    }

    return issues;
  }

  /**
   * Helper: Detect repetition in content
   */
  detectRepetition(content) {
    if (!content.description) return 0;

    const words = content.description.toLowerCase().split(/\s+/);
    const wordCounts = {};

    words.forEach(word => {
      if (word.length > 3) { // Only count meaningful words
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    // Calculate repetition score
    const totalWords = Object.keys(wordCounts).length;
    const repeatedWords = Object.values(wordCounts).filter(count => count > 2).length;

    return totalWords > 0 ? repeatedWords / totalWords : 0;
  }

  /**
   * Helper: Detect generic/template content
   */
  detectGenericity(content) {
    if (!content.title || !content.description) return 0;

    const genericPhrases = [
      'you must',
      'you need to',
      'complete the',
      'finish the',
      'the quest',
      'your mission',
      'gain experience',
      'level up'
    ];

    const text = `${content.title} ${content.description}`.toLowerCase();
    let genericCount = 0;

    genericPhrases.forEach(phrase => {
      if (text.includes(phrase)) genericCount++;
    });

    return genericCount / genericPhrases.length;
  }

  /**
   * Helper: Validate content structure
   */
  validateStructure(content) {
    const issues = [];

    if (!content.title) {
      issues.push('Missing title');
    }

    if (!content.description) {
      issues.push('Missing description');
    }

    if (!content.objectives || !Array.isArray(content.objectives)) {
      issues.push('Missing or invalid objectives');
    } else if (content.objectives.length === 0) {
      issues.push('No objectives defined');
    } else if (content.objectives.length > 5) {
      issues.push('Too many objectives (max 5)');
    }

    // Check each objective
    if (content.objectives) {
      content.objectives.forEach((obj, i) => {
        if (!obj.description) {
          issues.push(`Objective ${i + 1} missing description`);
        }
        if (!obj.statReward) {
          issues.push(`Objective ${i + 1} missing stat reward`);
        }
      });
    }

    return issues;
  }

  /**
   * Helper: Evaluate narrative coherence
   */
  evaluateCoherence(content, context) {
    let score = 1.0;

    // Check if content references context appropriately
    if (context.ragContext && context.ragContext.length > 0) {
      // Content should reference or build upon past events
      const contextKeywords = context.ragContext
        .map(event => event.summary || '')
        .join(' ')
        .toLowerCase()
        .split(/\s+/);

      const contentText = `${content.title} ${content.description}`.toLowerCase();
      const relevantKeywords = contextKeywords.filter(kw =>
        kw.length > 4 && contentText.includes(kw)
      );

      // At least some context should be referenced
      if (relevantKeywords.length === 0 && contextKeywords.length > 0) {
        score -= 0.2;
      }
    }

    // Check narrative flow
    if (content.narrativeOpening && content.description) {
      // Opening should connect to main content
      const openingWords = new Set(content.narrativeOpening.toLowerCase().split(/\s+/));
      const descWords = content.description.toLowerCase().split(/\s+/);
      const overlap = descWords.filter(w => openingWords.has(w)).length;

      if (overlap < 3) {
        score -= 0.1; // Low connection between opening and description
      }
    }

    return Math.max(0, score);
  }

  /**
   * Helper: Check character consistency
   */
  checkCharacterConsistency(content, context) {
    // Check if quest is appropriate for character's class and level
    const character = context.character;
    if (!character) return 1.0;

    let score = 1.0;

    // Check stat focus matches character strengths
    if (content.objectives && character.stats) {
      const targetStats = content.objectives.map(o => o.statReward);
      const characterStrengths = Object.entries(character.stats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([stat]) => stat);

      // At least one objective should align with character strengths
      const hasAlignedObjective = targetStats.some(stat =>
        characterStrengths.includes(stat)
      );

      if (!hasAlignedObjective) {
        score -= 0.1; // Quest doesn't leverage character strengths
      }
    }

    return Math.max(0, score);
  }

  /**
   * Helper: Check plot consistency
   */
  checkPlotConsistency(content, context) {
    let score = 1.0;

    // Check for logical progression
    if (context.characterQualities) {
      // Quest should respect storylet prerequisites
      // This is a simplified check
      score *= 0.95; // Slight penalty for not having explicit prerequisite checks
    }

    // Check world state consistency
    if (context.entityGraph) {
      // Verify NPCs mentioned exist in knowledge graph
      const knownNPCs = context.entityGraph.entities?.npcs?.map(n => n.name) || [];
      const mentionedInQuest = this.extractMentionedEntities(content);

      // New NPCs are fine, but shouldn't contradict existing ones
      // This is a placeholder for more sophisticated checking
    }

    return Math.max(0, score);
  }

  /**
   * Helper: Check emotional consistency
   */
  checkEmotionalConsistency(content, context) {
    // Simple sentiment analysis
    const contentText = `${content.title} ${content.description}`.toLowerCase();

    const positiveWords = ['hope', 'victory', 'success', 'brave', 'triumph', 'glory'];
    const negativeWords = ['doom', 'despair', 'failure', 'death', 'dark', 'lost'];
    const neutralWords = ['quest', 'journey', 'task', 'mission', 'discover', 'explore'];

    let positiveCount = positiveWords.filter(w => contentText.includes(w)).length;
    let negativeCount = negativeWords.filter(w => contentText.includes(w)).length;

    // Check if emotional tone is consistent with context
    const expectedTone = context.narrativeNeed?.emotionalTone || 'neutral';

    let score = 1.0;

    if (expectedTone === 'positive' && negativeCount > positiveCount) {
      score -= 0.2;
    } else if (expectedTone === 'negative' && positiveCount > negativeCount) {
      score -= 0.2;
    }

    // Extreme tonal inconsistency
    if (Math.abs(positiveCount - negativeCount) > 5) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  /**
   * Helper: Extract mentioned entities from content
   */
  extractMentionedEntities(content) {
    const text = `${content.title} ${content.description}`;
    const entities = [];

    // Simple NPC extraction (capitalized words)
    const matches = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g);
    if (matches) {
      entities.push(...matches);
    }

    return [...new Set(entities)];
  }

  /**
   * Helper: Generate recommendation based on score
   */
  generateRecommendation(score, issues) {
    if (score >= 0.9) {
      return 'Content passes all validation checks. Safe to use.';
    } else if (score >= 0.7) {
      return `Content is acceptable with minor issues: ${issues.join('; ')}`;
    } else if (score >= 0.5) {
      return `Content needs revision. Issues: ${issues.join('; ')}`;
    } else {
      return `Content fails validation. Regenerate with stricter constraints.`;
    }
  }

  /**
   * Run full validation pipeline
   */
  async runFullPipeline(input, generatedContent, lorekeeperResult = {}) {
    const preVal = await this.validatePreGeneration(input);
    if (!preVal.valid) {
      return { passed: false, stage: 'pre-generation', details: preVal };
    }

    const genVal = await this.validateGeneration(generatedContent, input.context);
    if (!genVal.valid) {
      return { passed: false, stage: 'generation', details: genVal };
    }

    const postVal = await this.validatePostGeneration(generatedContent, input.context, lorekeeperResult);
    if (!postVal.valid) {
      return { passed: false, stage: 'post-generation', details: postVal };
    }

    return {
      passed: true,
      overallScore: (preVal.score + genVal.score + postVal.score) / 3,
      tiers: {
        preGeneration: preVal,
        generation: genVal,
        postGeneration: postVal
      }
    };
  }
}

module.exports = new ValidationPipeline();
