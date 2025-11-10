const characterService = require('../services/characterService');

class CharacterController {
  /**
   * POST /api/characters
   * Create a new character
   */
  async create(req, res) {
    try {
      const { name, class: characterClass } = req.body;
      const userId = req.user.userId;

      if (!name || !characterClass) {
        return res.status(400).json({
          error: 'Name and class are required'
        });
      }

      const character = await characterService.createCharacter(
        userId,
        name,
        characterClass
      );

      res.status(201).json(character);
    } catch (err) {
      if (err.message.includes('already has a character')) {
        return res.status(409).json({ error: err.message });
      }

      if (err.message.includes('Invalid') || err.message.includes('must be')) {
        return res.status(400).json({ error: err.message });
      }

      console.error('Create character error:', err);
      res.status(500).json({
        error: 'Failed to create character',
        message: 'An error occurred while creating the character'
      });
    }
  }

  /**
   * GET /api/characters/me
   * Get current user's character
   */
  async getMyCharacter(req, res) {
    try {
      const userId = req.user.userId;
      const character = await characterService.getCharacterByUserId(userId);

      if (!character) {
        return res.status(404).json({
          error: 'No character found',
          message: 'Create a character to get started'
        });
      }

      // Update last active
      await characterService.updateLastActive(character.id);

      res.json(character);
    } catch (err) {
      console.error('Get character error:', err);
      res.status(500).json({
        error: 'Failed to retrieve character',
        message: 'An error occurred while fetching character data'
      });
    }
  }

  /**
   * GET /api/characters/:id
   * Get character by ID (for admin or viewing other characters)
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const character = await characterService.getCharacterById(parseInt(id));

      res.json(character);
    } catch (err) {
      if (err.message === 'Character not found') {
        return res.status(404).json({ error: err.message });
      }

      console.error('Get character by ID error:', err);
      res.status(500).json({
        error: 'Failed to retrieve character'
      });
    }
  }
}

module.exports = new CharacterController();
