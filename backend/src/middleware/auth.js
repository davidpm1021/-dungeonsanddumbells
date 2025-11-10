const authService = require('../services/authService');
const pool = require('../config/database');

/**
 * Middleware to authenticate JWT tokens
 * Expects Authorization header: "Bearer <token>"
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const decoded = await authService.verifyToken(token);
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid or expired token',
      message: err.message
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = await authService.verifyToken(token);
      req.user = decoded;
    } catch (err) {
      // Token invalid, but that's okay for optional auth
      req.user = null;
    }
  }

  next();
}

/**
 * Middleware to load character data for the authenticated user
 * Must be used after authenticateToken
 * Expects characterId query param or loads user's active character
 */
async function loadCharacter(req, res, next) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate before accessing character data'
    });
  }

  try {
    const characterId = req.query.characterId || req.params.characterId;

    let query;
    let params;

    if (characterId) {
      // Load specific character and verify ownership
      query = `
        SELECT c.*, cs.str, cs.dex, cs.con, cs.int, cs.wis, cs.cha,
               cs.str_xp, cs.dex_xp, cs.con_xp, cs.int_xp, cs.wis_xp, cs.cha_xp
        FROM characters c
        JOIN character_stats cs ON c.id = cs.character_id
        WHERE c.id = $1 AND c.user_id = $2
      `;
      params = [characterId, req.user.userId];
    } else {
      // Load user's most recent character
      query = `
        SELECT c.*, cs.str, cs.dex, cs.con, cs.int, cs.wis, cs.cha,
               cs.str_xp, cs.dex_xp, cs.con_xp, cs.int_xp, cs.wis_xp, cs.cha_xp
        FROM characters c
        JOIN character_stats cs ON c.id = cs.character_id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
        LIMIT 1
      `;
      params = [req.user.userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Character not found',
        message: 'No character found for this user'
      });
    }

    req.character = result.rows[0];
    next();
  } catch (err) {
    console.error('Error loading character:', err);
    return res.status(500).json({
      error: 'Failed to load character',
      message: err.message
    });
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  loadCharacter
};
