const authService = require('../services/authService');

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

module.exports = {
  authenticateToken,
  optionalAuth
};
