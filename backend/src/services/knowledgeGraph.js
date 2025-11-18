/**
 * Knowledge Graph Service
 *
 * Research-backed temporal knowledge graph for entity/relationship tracking.
 * From Research.md: "Graph nodes represent entities...edges capture relationships
 * that are spatial, temporal, causal, or emotional. The temporal dimension proves
 * crucial for narratives."
 *
 * Key features:
 * - Track entities (characters, objects, locations, concepts)
 * - Track relationships with timestamps (when formed/changed)
 * - Support targeted retrieval queries ("What did protagonist know before betrayal?")
 * - Combine with vector stores for hybrid structural + semantic retrieval
 */

const pool = require('../config/database');

class KnowledgeGraph {
  /**
   * Get entity graph for a character
   *
   * @param {number} characterId - Character ID
   * @returns {Object} - Graph of entities and relationships
   */
  async getEntityGraph(characterId) {
    try {
      const [entities, relationships] = await Promise.all([
        this.getEntities(characterId),
        this.getRelationships(characterId)
      ]);

      return {
        entities: this.organizeEntitiesByType(entities),
        relationships: this.organizeRelationshipsByType(relationships),
        summary: this.generateGraphSummary(entities, relationships)
      };
    } catch (error) {
      console.warn('[KnowledgeGraph] Failed to get entity graph:', error.message);
      return {
        entities: {},
        relationships: [],
        summary: ''
      };
    }
  }

  /**
   * Get all entities for a character
   */
  async getEntities(characterId) {
    const query = `
      SELECT
        id,
        entity_type,
        entity_name,
        attributes,
        first_mentioned,
        last_updated,
        importance_score
      FROM knowledge_entities
      WHERE character_id = $1
      ORDER BY importance_score DESC, last_updated DESC
    `;

    try {
      const result = await pool.query(query, [characterId]);
      return result.rows.map(row => ({
        id: row.id,
        type: row.entity_type,
        name: row.entity_name,
        attributes: row.attributes || {},
        firstMentioned: row.first_mentioned,
        lastUpdated: row.last_updated,
        importanceScore: row.importance_score
      }));
    } catch (error) {
      // Table might not exist yet
      console.warn('[KnowledgeGraph] Entities table not available');
      return [];
    }
  }

  /**
   * Get all relationships for a character
   */
  async getRelationships(characterId) {
    const query = `
      SELECT
        id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        relationship_strength,
        context,
        established_at,
        last_interaction
      FROM entity_relationships
      WHERE character_id = $1
      ORDER BY last_interaction DESC
    `;

    try {
      const result = await pool.query(query, [characterId]);
      return result.rows.map(row => ({
        id: row.id,
        sourceId: row.source_entity_id,
        targetId: row.target_entity_id,
        type: row.relationship_type,
        strength: row.relationship_strength,
        context: row.context,
        establishedAt: row.established_at,
        lastInteraction: row.last_interaction
      }));
    } catch (error) {
      console.warn('[KnowledgeGraph] Relationships table not available');
      return [];
    }
  }

  /**
   * Update knowledge graph from quest data
   * Extract NPCs, locations, objects mentioned in quest
   */
  async updateFromQuest(characterId, quest) {
    console.log('[KnowledgeGraph] Updating from quest:', quest.title);

    try {
      // Extract entities from quest
      const entities = this.extractEntitiesFromQuest(quest);

      for (const entity of entities) {
        await this.upsertEntity(characterId, entity);
      }

      // Extract and store relationships
      const relationships = this.extractRelationshipsFromQuest(quest);
      for (const rel of relationships) {
        await this.upsertRelationship(characterId, rel);
      }

      console.log(`[KnowledgeGraph] Updated ${entities.length} entities, ${relationships.length} relationships`);
    } catch (error) {
      console.error('[KnowledgeGraph] Update failed:', error.message);
    }
  }

  /**
   * Update knowledge graph from outcome data
   */
  async updateFromOutcome(characterId, outcome) {
    console.log('[KnowledgeGraph] Updating from outcome');

    try {
      // Update NPC relationships based on interactions
      if (outcome.npcInteractions) {
        for (const interaction of outcome.npcInteractions) {
          await this.updateNPCRelationship(characterId, interaction);
        }
      }

      // Update world state changes
      if (outcome.worldStateChanges) {
        for (const change of outcome.worldStateChanges) {
          await this.recordWorldStateChange(characterId, change);
        }
      }
    } catch (error) {
      console.error('[KnowledgeGraph] Outcome update failed:', error.message);
    }
  }

  /**
   * Extract entities from quest content
   */
  extractEntitiesFromQuest(quest) {
    const entities = [];

    // Extract NPCs mentioned
    if (quest.description) {
      const npcMatches = quest.description.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g);
      if (npcMatches) {
        const uniqueNames = [...new Set(npcMatches)];
        uniqueNames.forEach(name => {
          if (this.isLikelyNPC(name)) {
            entities.push({
              type: 'npc',
              name,
              attributes: { mentionedIn: quest.title },
              importance: 0.5
            });
          }
        });
      }
    }

    // Extract locations
    if (quest.objectives) {
      quest.objectives.forEach(obj => {
        if (obj.location) {
          entities.push({
            type: 'location',
            name: obj.location,
            attributes: { questObjective: obj.description },
            importance: 0.6
          });
        }
      });
    }

    // Extract quest-related concepts
    entities.push({
      type: 'quest',
      name: quest.title,
      attributes: {
        theme: quest.theme,
        difficulty: quest.difficulty,
        objectives: quest.objectives?.length || 0
      },
      importance: 0.8
    });

    return entities;
  }

  /**
   * Extract relationships from quest
   */
  extractRelationshipsFromQuest(quest) {
    const relationships = [];

    // Quest involves certain NPCs
    if (quest.description) {
      const npcMatches = quest.description.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g);
      if (npcMatches) {
        npcMatches.forEach(npc => {
          if (this.isLikelyNPC(npc)) {
            relationships.push({
              sourceType: 'quest',
              sourceName: quest.title,
              targetType: 'npc',
              targetName: npc,
              relationshipType: 'involves',
              strength: 0.7,
              context: 'Quest NPC'
            });
          }
        });
      }
    }

    return relationships;
  }

  /**
   * Simple heuristic to identify likely NPC names
   */
  isLikelyNPC(name) {
    // Filter out common words that aren't names
    const commonWords = ['The', 'This', 'That', 'When', 'Where', 'What', 'How', 'Your', 'Their'];
    if (commonWords.includes(name)) return false;

    // Check if it looks like a proper name (capitalized, reasonable length)
    return name.length > 2 && name.length < 30 && /^[A-Z][a-z]+/.test(name);
  }

  /**
   * Upsert entity into graph
   */
  async upsertEntity(characterId, entity) {
    const query = `
      INSERT INTO knowledge_entities (
        character_id,
        entity_type,
        entity_name,
        attributes,
        importance_score
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (character_id, entity_type, entity_name)
      DO UPDATE SET
        attributes = knowledge_entities.attributes || $4,
        last_updated = NOW(),
        importance_score = GREATEST(knowledge_entities.importance_score, $5)
      RETURNING id
    `;

    try {
      await pool.query(query, [
        characterId,
        entity.type,
        entity.name,
        entity.attributes,
        entity.importance
      ]);
    } catch (error) {
      // Table might not exist - create it
      if (error.code === '42P01') {
        await this.createKnowledgeTables();
        // Retry once
        await pool.query(query, [
          characterId,
          entity.type,
          entity.name,
          entity.attributes,
          entity.importance
        ]);
      }
    }
  }

  /**
   * Upsert relationship into graph
   */
  async upsertRelationship(characterId, rel) {
    // First get entity IDs
    const sourceId = await this.getOrCreateEntityId(characterId, rel.sourceType, rel.sourceName);
    const targetId = await this.getOrCreateEntityId(characterId, rel.targetType, rel.targetName);

    if (!sourceId || !targetId) return;

    const query = `
      INSERT INTO entity_relationships (
        character_id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        relationship_strength,
        context
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (character_id, source_entity_id, target_entity_id, relationship_type)
      DO UPDATE SET
        relationship_strength = $5,
        context = $6,
        last_interaction = NOW()
    `;

    try {
      await pool.query(query, [
        characterId,
        sourceId,
        targetId,
        rel.relationshipType,
        rel.strength,
        rel.context
      ]);
    } catch (error) {
      console.warn('[KnowledgeGraph] Failed to upsert relationship:', error.message);
    }
  }

  /**
   * Get or create entity ID
   */
  async getOrCreateEntityId(characterId, type, name) {
    const getQuery = `
      SELECT id FROM knowledge_entities
      WHERE character_id = $1 AND entity_type = $2 AND entity_name = $3
    `;

    try {
      let result = await pool.query(getQuery, [characterId, type, name]);

      if (result.rows.length === 0) {
        // Create the entity
        await this.upsertEntity(characterId, { type, name, attributes: {}, importance: 0.5 });
        result = await pool.query(getQuery, [characterId, type, name]);
      }

      return result.rows[0]?.id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update NPC relationship strength
   */
  async updateNPCRelationship(characterId, interaction) {
    const { npcName, sentiment, context } = interaction;

    // Update the NPC's relationship with player character
    const playerEntityId = await this.getOrCreateEntityId(characterId, 'player', 'Player Character');
    const npcEntityId = await this.getOrCreateEntityId(characterId, 'npc', npcName);

    if (!playerEntityId || !npcEntityId) return;

    // Calculate strength delta based on sentiment
    let strengthDelta = 0;
    if (sentiment === 'positive') strengthDelta = 0.1;
    if (sentiment === 'negative') strengthDelta = -0.1;
    if (sentiment === 'neutral') strengthDelta = 0.02;

    const query = `
      INSERT INTO entity_relationships (
        character_id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        relationship_strength,
        context
      ) VALUES ($1, $2, $3, 'knows', $4, $5)
      ON CONFLICT (character_id, source_entity_id, target_entity_id, relationship_type)
      DO UPDATE SET
        relationship_strength = LEAST(1.0, GREATEST(0.0,
          entity_relationships.relationship_strength + $4
        )),
        context = $5,
        last_interaction = NOW()
    `;

    try {
      await pool.query(query, [characterId, playerEntityId, npcEntityId, strengthDelta, context]);
    } catch (error) {
      console.warn('[KnowledgeGraph] Failed to update NPC relationship');
    }
  }

  /**
   * Record world state change
   */
  async recordWorldStateChange(characterId, change) {
    const entity = {
      type: 'world_state',
      name: change.key || 'unknown_change',
      attributes: {
        change: change.description || change,
        timestamp: new Date().toISOString()
      },
      importance: 0.7
    };

    await this.upsertEntity(characterId, entity);
  }

  /**
   * Organize entities by type for easier consumption
   */
  organizeEntitiesByType(entities) {
    const organized = {
      npcs: [],
      locations: [],
      quests: [],
      items: [],
      concepts: [],
      other: []
    };

    entities.forEach(entity => {
      switch (entity.type) {
        case 'npc':
          organized.npcs.push(entity);
          break;
        case 'location':
          organized.locations.push(entity);
          break;
        case 'quest':
          organized.quests.push(entity);
          break;
        case 'item':
          organized.items.push(entity);
          break;
        case 'concept':
          organized.concepts.push(entity);
          break;
        default:
          organized.other.push(entity);
      }
    });

    return organized;
  }

  /**
   * Organize relationships by type
   */
  organizeRelationshipsByType(relationships) {
    return relationships.reduce((acc, rel) => {
      if (!acc[rel.type]) acc[rel.type] = [];
      acc[rel.type].push(rel);
      return acc;
    }, {});
  }

  /**
   * Generate human-readable summary of the graph
   */
  generateGraphSummary(entities, relationships) {
    if (entities.length === 0) return 'No entities tracked yet.';

    const npcCount = entities.filter(e => e.type === 'npc').length;
    const locationCount = entities.filter(e => e.type === 'location').length;
    const questCount = entities.filter(e => e.type === 'quest').length;

    let summary = `Knowledge graph contains ${entities.length} entities: `;
    const parts = [];
    if (npcCount > 0) parts.push(`${npcCount} NPCs`);
    if (locationCount > 0) parts.push(`${locationCount} locations`);
    if (questCount > 0) parts.push(`${questCount} quests`);
    summary += parts.join(', ');

    if (relationships.length > 0) {
      summary += `. ${relationships.length} relationships tracked.`;
    }

    return summary;
  }

  /**
   * Query specific relationships (temporal queries)
   * Example: "What did character know about X before event Y?"
   */
  async queryRelationships(characterId, query) {
    const { entityName, beforeTimestamp, relationshipType } = query;

    let sql = `
      SELECT
        ke1.entity_name as source,
        ke2.entity_name as target,
        er.relationship_type,
        er.relationship_strength,
        er.context,
        er.established_at
      FROM entity_relationships er
      JOIN knowledge_entities ke1 ON er.source_entity_id = ke1.id
      JOIN knowledge_entities ke2 ON er.target_entity_id = ke2.id
      WHERE er.character_id = $1
    `;

    const params = [characterId];
    let paramCount = 1;

    if (entityName) {
      paramCount++;
      sql += ` AND (ke1.entity_name = $${paramCount} OR ke2.entity_name = $${paramCount})`;
      params.push(entityName);
    }

    if (beforeTimestamp) {
      paramCount++;
      sql += ` AND er.established_at < $${paramCount}`;
      params.push(beforeTimestamp);
    }

    if (relationshipType) {
      paramCount++;
      sql += ` AND er.relationship_type = $${paramCount}`;
      params.push(relationshipType);
    }

    sql += ' ORDER BY er.established_at DESC';

    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.warn('[KnowledgeGraph] Query failed:', error.message);
      return [];
    }
  }

  /**
   * Create knowledge graph tables if they don't exist
   */
  async createKnowledgeTables() {
    const entityTable = `
      CREATE TABLE IF NOT EXISTS knowledge_entities (
        id SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_name VARCHAR(255) NOT NULL,
        attributes JSONB DEFAULT '{}',
        first_mentioned TIMESTAMP DEFAULT NOW(),
        last_updated TIMESTAMP DEFAULT NOW(),
        importance_score DECIMAL(3,2) DEFAULT 0.5,
        UNIQUE(character_id, entity_type, entity_name)
      )
    `;

    const relationshipTable = `
      CREATE TABLE IF NOT EXISTS entity_relationships (
        id SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL,
        source_entity_id INTEGER REFERENCES knowledge_entities(id),
        target_entity_id INTEGER REFERENCES knowledge_entities(id),
        relationship_type VARCHAR(50) NOT NULL,
        relationship_strength DECIMAL(3,2) DEFAULT 0.5,
        context TEXT,
        established_at TIMESTAMP DEFAULT NOW(),
        last_interaction TIMESTAMP DEFAULT NOW(),
        UNIQUE(character_id, source_entity_id, target_entity_id, relationship_type)
      )
    `;

    try {
      await pool.query(entityTable);
      await pool.query(relationshipTable);
      console.log('[KnowledgeGraph] Tables created successfully');
    } catch (error) {
      console.error('[KnowledgeGraph] Failed to create tables:', error.message);
    }
  }
}

module.exports = new KnowledgeGraph();
