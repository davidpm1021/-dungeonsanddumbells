const pool = require('../config/database');

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

    // Get character with computed stats from view
    const character = await this.getCharacterById(result.rows[0].id);
    return character;
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

    return {
      id: char.id,
      userId: char.user_id,
      name: char.name,
      class: char.class,
      level: level,
      gold: char.gold,
      stats: {
        str: char.str,
        dex: char.dex,
        con: char.con,
        int: char.int,
        wis: char.wis,
        cha: char.cha
      },
      xp: {
        str: this.calculateXPNeeded(char.str_xp),
        dex: this.calculateXPNeeded(char.dex_xp),
        con: this.calculateXPNeeded(char.con_xp),
        int: this.calculateXPNeeded(char.int_xp),
        wis: this.calculateXPNeeded(char.wis_xp),
        cha: this.calculateXPNeeded(char.cha_xp)
      },
      createdAt: char.created_at,
      lastActive: char.last_active
    };
  }
}

module.exports = new CharacterService();
