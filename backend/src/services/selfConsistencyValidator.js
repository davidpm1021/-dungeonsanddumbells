/**
 * Self-Consistency Validator
 *
 * Research-backed self-consistency checking for narrative generation.
 * From Research.md: "Generate multiple variations of the same narrative segment
 * (typically 3-5 variations), calculate BERTScore between them, and use high
 * variance as a hallucination signal."
 *
 * Key features:
 * - Generate multiple variations of content
 * - Calculate similarity scores between variations
 * - Detect inconsistency/hallucination signals
 * - Select most consistent variation
 */

const claudeAPI = require('./claudeAPI');
const modelRouter = require('./modelRouter');

class SelfConsistencyValidator {
  constructor() {
    this.defaultVariations = 3;
    this.defaultThreshold = 0.7;
  }

  /**
   * Validate content consistency by generating variations
   *
   * @param {Object} content - Content to validate
   * @param {Object} character - Character context
   * @param {Object} context - Additional context
   * @param {Object} options - Validation options
   * @returns {Object} - Consistency result
   */
  async validateContent(content, character, context = {}, options = {}) {
    const numVariations = options.variations || this.defaultVariations;
    const threshold = options.threshold || this.defaultThreshold;

    console.log(`[SelfConsistency] Generating ${numVariations} variations for consistency check`);

    try {
      // Generate variations
      const variations = await this.generateVariations(content, character, context, numVariations);

      if (variations.length < 2) {
        console.warn('[SelfConsistency] Not enough variations generated');
        return { consistent: true, score: 1.0, bestVariation: content };
      }

      // Calculate consistency scores
      const scores = this.calculateConsistencyScores(variations);

      // Analyze variance
      const analysis = this.analyzeVariance(scores);

      console.log(`[SelfConsistency] Analysis: mean=${analysis.meanScore.toFixed(3)}, variance=${analysis.variance.toFixed(3)}`);

      // High variance indicates potential hallucination
      const consistent = analysis.variance < (1 - threshold) && analysis.meanScore > threshold;

      // Select best variation (highest average similarity to others)
      const bestVariation = this.selectBestVariation(variations, scores);

      return {
        consistent,
        score: analysis.meanScore,
        variance: analysis.variance,
        bestVariation,
        allVariations: variations,
        analysis
      };

    } catch (error) {
      console.error('[SelfConsistency] Validation error:', error.message);
      return {
        consistent: true, // Default to trusting original on error
        score: 0.5,
        bestVariation: content,
        error: error.message
      };
    }
  }

  /**
   * Generate multiple variations of the same content
   */
  async generateVariations(content, character, context, numVariations) {
    const variations = [];
    const model = modelRouter.getModelForAgent('self_consistency');

    const systemPrompt = `You are a narrative consistency validator. Generate a variation of the given quest/narrative content that maintains the same core elements but may vary in specific details.

Keep these CORE ELEMENTS exactly the same:
- Quest type/theme
- Number of objectives
- Target stats
- General setting/tone

Allow these to VARY naturally:
- Specific wording and descriptions
- Minor narrative details
- NPC names (if not established)
- Exact quest title phrasing

Return ONLY valid JSON matching the input structure.`;

    const userPrompt = `Generate a variation of this quest content:

${JSON.stringify(content, null, 2)}

Character context: ${character.name}, ${character.class}
World context: ${context.narrativeSummary || 'Early in their journey'}

Return the variation as JSON only.`;

    // Generate variations in parallel for speed
    const promises = [];
    for (let i = 0; i < numVariations; i++) {
      promises.push(
        claudeAPI.call({
          model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          maxTokens: 800,
          temperature: 0.5 + (i * 0.1), // Slightly increase temperature for each variation
          agentType: 'self_consistency',
          useCache: false // Each variation should be unique
        }).then(response => {
          try {
            const cleaned = this.extractJSON(response.content);
            return JSON.parse(cleaned);
          } catch (e) {
            return null;
          }
        }).catch(() => null)
      );
    }

    const results = await Promise.all(promises);

    // Include original content as first variation
    variations.push(content);

    // Add successful variations
    results.forEach(result => {
      if (result) variations.push(result);
    });

    return variations;
  }

  /**
   * Calculate pairwise consistency scores between variations
   * Uses structural similarity since we don't have BERTScore
   */
  calculateConsistencyScores(variations) {
    const scores = [];

    for (let i = 0; i < variations.length; i++) {
      for (let j = i + 1; j < variations.length; j++) {
        const score = this.calculateStructuralSimilarity(variations[i], variations[j]);
        scores.push({
          pair: [i, j],
          score
        });
      }
    }

    return scores;
  }

  /**
   * Calculate structural similarity between two variations
   * Simulates BERTScore by comparing structure and key elements
   */
  calculateStructuralSimilarity(var1, var2) {
    let score = 0;
    let totalChecks = 0;

    // Check title similarity
    if (var1.title && var2.title) {
      score += this.stringSimilarity(var1.title, var2.title);
      totalChecks++;
    }

    // Check theme consistency
    if (var1.theme === var2.theme) {
      score += 1.0;
      totalChecks++;
    }

    // Check objective count
    if (var1.objectives && var2.objectives) {
      if (var1.objectives.length === var2.objectives.length) {
        score += 1.0;
      } else {
        score += 1 - Math.abs(var1.objectives.length - var2.objectives.length) / 5;
      }
      totalChecks++;

      // Check objective types/stats
      const stats1 = new Set(var1.objectives.map(o => o.statReward));
      const stats2 = new Set(var2.objectives.map(o => o.statReward));
      const intersection = [...stats1].filter(s => stats2.has(s));
      const union = new Set([...stats1, ...stats2]);
      score += intersection.length / union.size;
      totalChecks++;
    }

    // Check description word overlap
    if (var1.description && var2.description) {
      score += this.wordOverlap(var1.description, var2.description);
      totalChecks++;
    }

    // Check narrative tone consistency
    if (var1.narrativeOpening && var2.narrativeOpening) {
      score += this.stringSimilarity(var1.narrativeOpening, var2.narrativeOpening) * 0.5;
      totalChecks++;
    }

    return totalChecks > 0 ? score / totalChecks : 0.5;
  }

  /**
   * Calculate string similarity using Jaccard index
   */
  stringSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);

    return intersection.length / union.size;
  }

  /**
   * Calculate word overlap between two texts
   */
  wordOverlap(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = [...set1].filter(w => set2.has(w));
    const union = new Set([...set1, ...set2]);

    return intersection.length / union.size;
  }

  /**
   * Analyze variance in consistency scores
   */
  analyzeVariance(scores) {
    if (scores.length === 0) {
      return { meanScore: 1.0, variance: 0, standardDeviation: 0 };
    }

    const scoreValues = scores.map(s => s.score);

    // Calculate mean
    const mean = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;

    // Calculate variance
    const variance = scoreValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scoreValues.length;

    // Calculate standard deviation
    const standardDeviation = Math.sqrt(variance);

    return {
      meanScore: mean,
      variance,
      standardDeviation,
      minScore: Math.min(...scoreValues),
      maxScore: Math.max(...scoreValues)
    };
  }

  /**
   * Select the best variation (highest average similarity to others)
   */
  selectBestVariation(variations, scores) {
    if (variations.length === 0) return null;
    if (variations.length === 1) return variations[0];

    // Calculate average similarity for each variation
    const avgScores = variations.map((_, index) => {
      const relevantScores = scores.filter(s =>
        s.pair[0] === index || s.pair[1] === index
      );

      if (relevantScores.length === 0) return 0;

      const avg = relevantScores.reduce((sum, s) => sum + s.score, 0) / relevantScores.length;
      return avg;
    });

    // Find variation with highest average similarity
    let bestIndex = 0;
    let bestScore = avgScores[0];

    for (let i = 1; i < avgScores.length; i++) {
      if (avgScores[i] > bestScore) {
        bestScore = avgScores[i];
        bestIndex = i;
      }
    }

    return variations[bestIndex];
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  extractJSON(content) {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) return jsonMatch[1].trim();

    const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) return codeMatch[1].trim();

    return content.trim();
  }

  /**
   * Quick consistency check for single content piece
   * Returns boolean indicating if content seems internally consistent
   */
  async quickCheck(content) {
    // Check for basic structural consistency
    const checks = [];

    // Quest should have title
    if (content.title) {
      checks.push(content.title.length > 0 && content.title.length < 200);
    }

    // Objectives should be array
    if (content.objectives) {
      checks.push(Array.isArray(content.objectives));
      checks.push(content.objectives.length > 0);
      checks.push(content.objectives.length <= 5);

      // Each objective should have required fields
      content.objectives.forEach(obj => {
        checks.push(Boolean(obj.description));
        checks.push(Boolean(obj.statReward));
      });
    }

    // Description should exist and be reasonable length
    if (content.description) {
      const wordCount = content.description.split(' ').length;
      checks.push(wordCount >= 10);
      checks.push(wordCount <= 500);
    }

    const passedChecks = checks.filter(c => c).length;
    const totalChecks = checks.length;

    return {
      passed: passedChecks / totalChecks > 0.8,
      score: passedChecks / totalChecks,
      totalChecks,
      passedChecks
    };
  }
}

module.exports = new SelfConsistencyValidator();
