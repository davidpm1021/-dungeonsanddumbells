const pool = require('../config/database');
const { transformKeysToCamel } = require('../utils/caseTransform');

class CharacterService {
  /**
   * Create a new character for a user
   */
  async createCharacter(userId, name, characterClass) {
    // Validate class
    const validClasses = ['Fighter', 'Mage', 'Rogue'];
    if (!validClasses.includes(characterClass)) {
      throw new Error(`Invalid character class. Must be one of: ${validClasses.join(', ')}`);
    }

    // Validate name
    if (!name || name.trim().length < 2 || name.trim().length > 50) {
      throw new Error('Character name must be between 2 and 50 characters');
    }

    // Check if user already has a character
    const existing = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already has a character. Only one character per user is allowed.');
    }

    // Create character
    const result = await pool.query(
      `INSERT INTO characters (user_id, name, class)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, name.trim(), characterClass]
    );

    const characterId = result.rows[0].id;

    // Initialize character qualities for progression tracking
    const characterQualitiesService = require('./characterQualitiesService');
    try {
      await characterQualitiesService.initializeNewCharacter(characterId);
      console.log(`[CharacterService] Initialized progression qualities for character ${characterId}`);
    } catch (qualityError) {
      console.error('[CharacterService] Failed to initialize qualities (non-fatal):', qualityError.message);
    }

    // Initialize combat stats for combat system
    try {
      const baseHP = 30; // Starting HP for all characters
      const baseAC = 12 + (characterClass === 'Fighter' ? 3 : characterClass === 'Rogue' ? 2 : 0); // Fighters get +3 AC, Rogues +2

      await pool.query(
        `INSERT INTO character_combat_stats (character_id, armor_class, max_hit_points, current_hit_points)
         VALUES ($1, $2, $3, $4)`,
        [characterId, baseAC, baseHP, baseHP]
      );
      console.log(`[CharacterService] Initialized combat stats for character ${characterId} (AC ${baseAC}, HP ${baseHP})`);
    } catch (combatError) {
      console.error('[CharacterService] Failed to initialize combat stats (non-fatal):', combatError.message);
    }

    // Get character with computed stats from view
    const character = await this.getCharacterById(characterId);

    // Generate AI welcome narrative (async, non-blocking)
    this.generateAndStoreWelcomeNarrative(characterId, {
      id: characterId,
      name: name.trim(),
      character_class: characterClass,
      class: characterClass
    }).catch(err => {
      console.error('[CharacterService] Welcome narrative generation failed (non-fatal):', err.message);
    });

    return character;
  }

  /**
   * Generate and store AI-powered welcome narrative for new character
   */
  async generateAndStoreWelcomeNarrative(characterId, character) {
    try {
      const dmNarrator = require('./dmNarrator');
      const memoryManager = require('./memoryManager');

      console.log(`[CharacterService] Generating welcome narrative for character ${characterId}`);

      // Generate the AI narrative
      const welcomeNarrative = await dmNarrator.generateWelcomeNarrative({
        character,
        goals: [] // No goals yet at character creation
      });

      // Store as a narrative event
      await memoryManager.storeInWorkingMemory(characterId, {
        eventType: 'welcome_narrative',
        description: welcomeNarrative.fullText,
        participants: ['Warden Kael'],
        statChanges: {},
        questId: null,
        context: {
          narrativeType: 'welcome',
          source: welcomeNarrative.source,
          hook: welcomeNarrative.hook
        }
      });

      // Initialize world state with the welcome narrative
      try {
        await pool.query(
          `INSERT INTO world_state (character_id, narrative_summary, npc_relationships, unlocked_locations, story_flags)
           VALUES ($1, $2, '{"Warden Kael": {"met": true, "relationship": "mentor"}}', ARRAY['The Waystation'], '{"tutorial_started": true}')
           ON CONFLICT (character_id) DO UPDATE
           SET narrative_summary = $2`,
          [characterId, welcomeNarrative.narrative]
        );
      } catch (worldStateError) {
        console.log('[CharacterService] World state update skipped:', worldStateError.message);
      }

      console.log(`[CharacterService] Welcome narrative stored for character ${characterId}`);
      return welcomeNarrative;

    } catch (error) {
      console.error('[CharacterService] Welcome narrative error:', error.message);
      // Non-fatal - character was still created
      return null;
    }
  }

  /**
   * Get character by ID with computed stats
   */
  async getCharacterById(characterId) {
    const result = await pool.query(
      'SELECT * FROM character_stats WHERE id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Character not found');
    }

    return this.formatCharacter(result.rows[0]);
  }

  /**
   * Get character by user ID
   */
  async getCharacterByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM character_stats WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatCharacter(result.rows[0]);
  }

  /**
   * Update character's last active timestamp
   */
  async updateLastActive(characterId) {
    await pool.query(
      'UPDATE characters SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [characterId]
    );
  }

  /**
   * Award XP to a character stat
   */
  async awardXP(characterId, stat, xp) {
    // Validate stat
    const validStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    if (!validStats.includes(stat.toUpperCase())) {
      throw new Error(`Invalid stat: ${stat}. Must be one of: ${validStats.join(', ')}`);
    }

    if (xp <= 0) {
      throw new Error('XP must be positive');
    }

    const statColumn = `${stat.toLowerCase()}_xp`;

    await pool.query(
      `UPDATE characters
       SET ${statColumn} = ${statColumn} + $1
       WHERE id = $2`,
      [xp, characterId]
    );

    // Get updated character
    return await this.getCharacterById(characterId);
  }

  /**
   * Calculate character level from stats
   * Level = (Sum of all stat points - 60) / 6
   * All stats start at 10, so base sum is 60
   */
  calculateLevel(stats) {
    const totalStatPoints = stats.str + stats.dex + stats.con +
                           stats.int + stats.wis + stats.cha;
    return Math.floor((totalStatPoints - 60) / 6) + 1;
  }

  /**
   * Calculate XP needed for next stat point
   * Costs: 100, 120, 140, 160, 180, 200 (capped)
   */
  calculateXPNeeded(currentXP) {
    let totalXPNeeded = 0;
    let cost = 100;
    let points = 0;

    // Calculate how many points earned and total XP spent
    let remaining = currentXP;
    while (remaining >= cost) {
      remaining -= cost;
      totalXPNeeded += cost;
      points++;
      if (cost < 200) {
        cost += 20;
      }
    }

    // XP needed for next point
    return {
      current: currentXP,
      spent: totalXPNeeded,
      remaining: remaining,
      nextCost: cost,
      statValue: 10 + points
    };
  }

  /**
   * Format character object with additional computed fields
   */
  formatCharacter(char) {
    const level = this.calculateLevel({
      str: char.str,
      dex: char.dex,
      con: char.con,
      int: char.int,
      wis: char.wis,
      cha: char.cha
    });

    // Calculate XP info for each stat
    const strXP = this.calculateXPNeeded(char.str_xp);
    const dexXP = this.calculateXPNeeded(char.dex_xp);
    const conXP = this.calculateXPNeeded(char.con_xp);
    const intXP = this.calculateXPNeeded(char.int_xp);
    const wisXP = this.calculateXPNeeded(char.wis_xp);
    const chaXP = this.calculateXPNeeded(char.cha_xp);

    // Calculate total XP
    const total_xp = char.str_xp + char.dex_xp + char.con_xp +
                     char.int_xp + char.wis_xp + char.cha_xp;

    return {
      id: char.id,
      userId: char.user_id,
      name: char.name,
      class: char.class,
      level: level,
      gold: char.gold,
      totalXp: total_xp,

      // Flat stat values
      str: char.str,
      dex: char.dex,
      con: char.con,
      int: char.int,
      wis: char.wis,
      cha: char.cha,

      // XP values
      strXp: strXP.remaining,
      dexXp: dexXP.remaining,
      conXp: conXP.remaining,
      intXp: intXP.remaining,
      wisXp: wisXP.remaining,
      chaXp: chaXP.remaining,

      // XP needed for next level
      strXpNeeded: strXP.nextCost,
      dexXpNeeded: dexXP.nextCost,
      conXpNeeded: conXP.nextCost,
      intXpNeeded: intXP.nextCost,
      wisXpNeeded: wisXP.nextCost,
      chaXpNeeded: chaXP.nextCost,

      createdAt: char.created_at,
      lastActive: char.last_active
    };
  }
}

module.exports = new CharacterService();
