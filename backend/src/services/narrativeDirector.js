/**
 * Narrative Director - Master DM Orchestrator
 *
 * Research-backed multi-agent coordination system implementing:
 * - Sequential orchestration for dependent tasks (Research.md: "chains agents in linear order")
 * - Parallel orchestration for independent tasks (maximize throughput)
 * - Hierarchical patterns (manager-worker structure)
 * - Indirect drama management (manipulate world state, not script agents)
 *
 * Key insight from research: "Director agent manipulates the world state...
 * individual character agents interpret these changes through their own personalities"
 */

const storyCoordinator = require('./agents/storyCoordinator');
const questCreator = require('./agents/questCreator');
const lorekeeper = require('./agents/lorekeeper');
const consequenceEngine = require('./agents/consequenceEngine');
const memoryManagerAgent = require('./agents/memoryManagerAgent');
const narrativeRAG = require('./narrativeRAG');
const memoryManager = require('./memoryManager');
const knowledgeGraph = require('./knowledgeGraph');
const selfConsistency = require('./selfConsistencyValidator');
const validationPipeline = require('./validationPipeline');
const storyletSystem = require('./storyletSystem');

class NarrativeDirector {
  constructor() {
    // Track orchestration metrics
    this.metrics = {
      totalSessions: 0,
      successfulOrchestrations: 0,
      validationFailures: 0,
      averageLatency: 0
    };
  }

  /**
   * Main orchestration entry point - generates new narrative content
   *
   * Flow (from Research.md):
   * 1. Evaluate narrative need via Story Coordinator
   * 2. Retrieve relevant memories via RAG (top 5)
   * 3. Generate content via Quest Creator
   * 4. Validate via multi-tier validation pipeline
   * 5. Self-consistency check (generate variations, calculate scores)
   * 6. Lorekeeper validation against world rules
   * 7. Update knowledge graph and memory systems
   * 8. Apply storylet effects to world state
   */
  async orchestrateNarrativeGeneration(characterId, character, worldContext = {}) {
    const startTime = Date.now();
    this.metrics.totalSessions++;

    console.log('[NarrativeDirector] Starting orchestration for character:', characterId);

    try {
      // ===== PHASE 1: Context Gathering (Parallel) =====
      console.log('[NarrativeDirector] Phase 1: Context gathering...');

      const [
        recentMemories,
        episodeSummaries,
        narrativeSummary,
        entityGraph,
        characterQualities
      ] = await Promise.all([
        this.getWorkingMemory(characterId),
        this.getEpisodeMemories(characterId),
        this.getNarrativeSummary(characterId),
        knowledgeGraph.getEntityGraph(characterId),
        this.getCharacterQualities(characterId)
      ]);

      const fullContext = {
        recentMemories,
        episodeSummaries,
        narrativeSummary,
        entityGraph,
        characterQualities,
        ...worldContext
      };

      // ===== PHASE 2: Story Coordination (Sequential) =====
      console.log('[NarrativeDirector] Phase 2: Story coordination...');

      const narrativeNeed = await storyCoordinator.evaluateNeed(
        character,
        fullContext.activeQuestCount || 0,
        characterId,
        fullContext.recentMemories
      );

      if (!narrativeNeed.needsNewContent) {
        console.log('[NarrativeDirector] No new content needed');
        return {
          action: 'none',
          reason: narrativeNeed.reasoning,
          metadata: { latency: Date.now() - startTime }
        };
      }

      // ===== PHASE 3: RAG-Enhanced Context Retrieval =====
      console.log('[NarrativeDirector] Phase 3: RAG context retrieval...');

      // Build query from narrative need
      const ragQuery = this.buildRAGQuery(narrativeNeed, character);
      const relevantMemories = await narrativeRAG.retrieveContext(
        characterId,
        ragQuery,
        { k: 5, includeEpisodes: true }
      );

      // Add RAG results to context
      fullContext.ragContext = relevantMemories;

      // ===== PHASE 4: Content Generation with Validation Pipeline =====
      console.log('[NarrativeDirector] Phase 4: Content generation...');

      // Pre-generation validation (Defense Layer 1)
      const preValidation = await validationPipeline.validatePreGeneration({
        character,
        context: fullContext,
        narrativeNeed
      });

      if (!preValidation.valid) {
        console.error('[NarrativeDirector] Pre-generation validation failed:', preValidation.errors);
        return {
          action: 'error',
          reason: 'Pre-generation validation failed',
          errors: preValidation.errors
        };
      }

      // Generate quest content
      const questDecision = {
        suggestedTheme: narrativeNeed.suggestedTheme,
        urgency: narrativeNeed.urgency || 'normal',
        emotionalTone: narrativeNeed.emotionalTone || 'neutral'
      };

      // Check storylet prerequisites before generation
      const availableStorylets = await storyletSystem.getAvailableStorylets(
        characterId,
        characterQualities
      );

      // Generate quest with storylet constraints
      const generatedQuest = await questCreator.generateQuest(
        character,
        questDecision,
        characterId,
        {
          ragContext: relevantMemories,
          narrativeSummary: fullContext.narrativeSummary,
          availableStorylets,
          entityGraph
        }
      );

      // ===== PHASE 5: Multi-Tier Validation =====
      console.log('[NarrativeDirector] Phase 5: Multi-tier validation...');

      // Generation-time validation (Defense Layer 2)
      const generationValidation = await validationPipeline.validateGeneration(
        generatedQuest,
        fullContext
      );

      if (!generationValidation.valid) {
        console.warn('[NarrativeDirector] Generation validation issues:', generationValidation.warnings);
        // Attempt revision if issues are minor
        if (generationValidation.canRevise) {
          // Self-consistency check with multiple variations
          const consistentQuest = await this.ensureConsistency(
            generatedQuest,
            character,
            fullContext
          );
          Object.assign(generatedQuest, consistentQuest);
        }
      }

      // Lorekeeper validation (Defense Layer 3)
      const lorekeeperResult = await lorekeeper.validateContent(
        generatedQuest,
        character,
        characterId
      );

      if (!lorekeeperResult.isValid || lorekeeperResult.consistencyScore < 0.85) {
        console.warn('[NarrativeDirector] Lorekeeper validation below threshold:', lorekeeperResult.consistencyScore);

        // Retry with feedback (up to 2 attempts)
        const revisedQuest = await this.reviseWithFeedback(
          generatedQuest,
          lorekeeperResult,
          character,
          characterId,
          fullContext
        );

        if (revisedQuest) {
          Object.assign(generatedQuest, revisedQuest);
        } else {
          this.metrics.validationFailures++;
          return {
            action: 'validation_failed',
            reason: 'Could not achieve 85% consistency score',
            lorekeeperScore: lorekeeperResult.consistencyScore,
            issues: lorekeeperResult.issues
          };
        }
      }

      // Post-generation validation (Defense Layer 4)
      const postValidation = await validationPipeline.validatePostGeneration(
        generatedQuest,
        fullContext,
        lorekeeperResult
      );

      // ===== PHASE 6: State Updates (Sequential - order matters) =====
      console.log('[NarrativeDirector] Phase 6: State updates...');

      // Update knowledge graph with new entities/relationships
      await knowledgeGraph.updateFromQuest(characterId, generatedQuest);

      // Store event in narrative memory
      await this.storeNarrativeEvent(characterId, {
        type: 'quest_generated',
        quest: generatedQuest,
        context: narrativeNeed
      });

      // Apply storylet effects (prerequisites/effects system)
      if (generatedQuest.storyletId) {
        await storyletSystem.applyEffects(
          characterId,
          generatedQuest.storyletId,
          generatedQuest
        );
      }

      // Update narrative summary (rolling 500-word summary)
      await this.updateNarrativeSummary(characterId, generatedQuest);

      // ===== PHASE 7: Finalization =====
      const latency = Date.now() - startTime;
      this.metrics.successfulOrchestrations++;
      this.metrics.averageLatency =
        (this.metrics.averageLatency * (this.metrics.successfulOrchestrations - 1) + latency) /
        this.metrics.successfulOrchestrations;

      console.log('[NarrativeDirector] Orchestration complete. Latency:', latency, 'ms');

      return {
        action: 'quest_generated',
        quest: generatedQuest,
        validation: {
          lorekeeperScore: lorekeeperResult.consistencyScore,
          preValidation: preValidation.score,
          postValidation: postValidation.score
        },
        metadata: {
          latency,
          ragContextUsed: relevantMemories.length,
          storyletApplied: generatedQuest.storyletId || null
        }
      };

    } catch (error) {
      console.error('[NarrativeDirector] Orchestration error:', error.message);
      this.metrics.validationFailures++;

      return {
        action: 'error',
        reason: error.message,
        metadata: { latency: Date.now() - startTime }
      };
    }
  }

  /**
   * Orchestrate outcome generation when quest is completed
   *
   * Flow:
   * 1. Retrieve quest context and memories
   * 2. Generate narrative outcome via Consequence Engine
   * 3. Validate outcome consistency
   * 4. Update knowledge graph with effects
   * 5. Compress old memories if threshold reached
   * 6. Update narrative summary
   */
  async orchestrateQuestCompletion(characterId, character, quest) {
    console.log('[NarrativeDirector] Orchestrating quest completion:', quest.title);

    try {
      // Phase 1: Context gathering
      const [recentMemories, entityGraph] = await Promise.all([
        this.getWorkingMemory(characterId),
        knowledgeGraph.getEntityGraph(characterId)
      ]);

      // Phase 2: Generate outcome
      const outcome = await consequenceEngine.generateOutcome(
        quest,
        character,
        characterId,
        recentMemories
      );

      // Phase 3: Validate outcome
      const validation = await lorekeeper.validateContent(
        { ...quest, outcome },
        character,
        characterId
      );

      if (validation.consistencyScore < 0.85) {
        console.warn('[NarrativeDirector] Outcome validation below threshold');
        // For outcomes, we accept lower thresholds but log it
      }

      // Phase 4: Update knowledge graph
      await knowledgeGraph.updateFromOutcome(characterId, outcome);

      // Phase 5: Store completion event
      await this.storeNarrativeEvent(characterId, {
        type: 'quest_completed',
        quest,
        outcome,
        rewards: this.extractRewards(quest)
      });

      // Phase 6: Check if memory compression needed
      const eventCount = await this.getEventCount(characterId);
      if (eventCount > 20) {
        console.log('[NarrativeDirector] Triggering memory compression...');
        await this.compressOldMemories(characterId);
      }

      // Phase 7: Update narrative summary
      await this.updateNarrativeSummary(characterId, outcome);

      // Phase 8: Apply storylet effects
      if (quest.effects) {
        await storyletSystem.applyQuestEffects(characterId, quest);
      }

      return {
        outcome,
        validation: {
          score: validation.consistencyScore,
          passed: validation.isValid
        },
        memoryUpdated: true
      };

    } catch (error) {
      console.error('[NarrativeDirector] Quest completion error:', error.message);
      throw error;
    }
  }

  /**
   * Ensure consistency through self-consistency checking
   * (Research.md: Generate multiple variations, calculate BERTScore)
   */
  async ensureConsistency(generatedContent, character, context) {
    console.log('[NarrativeDirector] Running self-consistency check...');

    const result = await selfConsistency.validateContent(
      generatedContent,
      character,
      context,
      { variations: 3, threshold: 0.7 }
    );

    if (result.consistent) {
      return generatedContent;
    }

    // If inconsistent, return the most consistent variation
    return result.bestVariation || generatedContent;
  }

  /**
   * Revise content based on Lorekeeper feedback
   * (Research.md: Iterative refinement based on validation)
   */
  async reviseWithFeedback(content, validationResult, character, characterId, context, attempt = 1) {
    if (attempt > 2) {
      console.error('[NarrativeDirector] Max revision attempts reached');
      return null;
    }

    console.log(`[NarrativeDirector] Revision attempt ${attempt} based on Lorekeeper feedback`);

    // Build revision prompt with explicit issues
    const revisionContext = {
      ...context,
      validationIssues: validationResult.issues,
      suggestions: validationResult.suggestions,
      previousAttempt: content
    };

    // Regenerate with lower temperature for consistency
    const revisedContent = await questCreator.generateQuest(
      character,
      { suggestedTheme: content.theme || 'skill_test', urgency: 'normal' },
      characterId,
      revisionContext,
      { temperature: 0.3 } // Lower temperature for consistency-critical generation
    );

    // Revalidate
    const revalidation = await lorekeeper.validateContent(
      revisedContent,
      character,
      characterId
    );

    if (revalidation.consistencyScore >= 0.85) {
      console.log('[NarrativeDirector] Revision successful. New score:', revalidation.consistencyScore);
      return revisedContent;
    }

    // Recursively attempt revision
    return this.reviseWithFeedback(
      revisedContent,
      revalidation,
      character,
      characterId,
      context,
      attempt + 1
    );
  }

  /**
   * Build RAG query from narrative need
   * (Research.md: "Query expansion with generated answers")
   */
  buildRAGQuery(narrativeNeed, character) {
    const queries = [];

    // Theme-based query
    if (narrativeNeed.suggestedTheme) {
      queries.push(`${character.name} ${narrativeNeed.suggestedTheme} quest`);
    }

    // Character progression query
    queries.push(`${character.class} character development`);

    // Recent activity query
    if (narrativeNeed.reasoning) {
      queries.push(narrativeNeed.reasoning);
    }

    return queries.join(' ');
  }

  /**
   * Memory system helpers
   */
  async getWorkingMemory(characterId) {
    try {
      return await memoryManager.getWorkingMemory(characterId, 10);
    } catch (error) {
      console.warn('[NarrativeDirector] Working memory unavailable:', error.message);
      return [];
    }
  }

  async getEpisodeMemories(characterId) {
    try {
      return await memoryManager.getEpisodeMemories(characterId);
    } catch (error) {
      console.warn('[NarrativeDirector] Episode memories unavailable:', error.message);
      return [];
    }
  }

  async getNarrativeSummary(characterId) {
    try {
      const worldState = await memoryManager.getWorldState(characterId);
      return worldState?.narrativeSummary || '';
    } catch (error) {
      console.warn('[NarrativeDirector] Narrative summary unavailable:', error.message);
      return '';
    }
  }

  async getCharacterQualities(characterId) {
    try {
      return await storyletSystem.getCharacterQualities(characterId);
    } catch (error) {
      console.warn('[NarrativeDirector] Character qualities unavailable:', error.message);
      return {};
    }
  }

  async storeNarrativeEvent(characterId, event) {
    try {
      await memoryManager.storeEvent(characterId, event);
    } catch (error) {
      console.warn('[NarrativeDirector] Failed to store event:', error.message);
    }
  }

  async getEventCount(characterId) {
    try {
      return await memoryManager.getEventCount(characterId);
    } catch (error) {
      return 0;
    }
  }

  async compressOldMemories(characterId) {
    try {
      const oldEvents = await memoryManager.getOldEvents(characterId, 10);
      if (oldEvents.length > 0) {
        const summary = await memoryManagerAgent.compressEvents(oldEvents, characterId);
        await memoryManager.storeEpisodeSummary(characterId, summary);
        await memoryManager.archiveEvents(characterId, oldEvents.map(e => e.id));
      }
    } catch (error) {
      console.warn('[NarrativeDirector] Memory compression failed:', error.message);
    }
  }

  async updateNarrativeSummary(characterId, content) {
    try {
      await memoryManager.updateNarrativeSummary(characterId, content);
    } catch (error) {
      console.warn('[NarrativeDirector] Failed to update narrative summary:', error.message);
    }
  }

  extractRewards(quest) {
    const rewards = {};
    if (quest.objectives) {
      quest.objectives.forEach(obj => {
        const stat = obj.statReward || 'STR';
        const xp = obj.xpReward || 0;
        rewards[stat] = (rewards[stat] || 0) + xp;
      });
    }
    return rewards;
  }

  /**
   * Get orchestration metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalSessions > 0
        ? (this.metrics.successfulOrchestrations / this.metrics.totalSessions * 100).toFixed(2) + '%'
        : '0%',
      validationFailureRate: this.metrics.totalSessions > 0
        ? (this.metrics.validationFailures / this.metrics.totalSessions * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

module.exports = new NarrativeDirector();
