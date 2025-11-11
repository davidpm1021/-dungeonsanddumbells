const authService = require('../services/authService');

class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req, res) {
    try {
      const { email, username, password } = req.body;

      const user = await authService.register(email, username, password);

      // Auto-login: Generate token after successful registration
      const token = authService.generateToken(user.id, username, email);

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      // Check for specific error types
      if (err.message.includes('already exists')) {
        return res.status(409).json({ error: err.message });
      }

      if (err.message.includes('required') || err.message.includes('must be')) {
        return res.status(400).json({ error: err.message });
      }

      console.error('Registration error:', err);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login and receive JWT token
   */
  async login(req, res) {
    try {
      const { emailOrUsername, password } = req.body;

      const result = await authService.login(emailOrUsername, password);

      res.json({
        message: 'Login successful',
        token: result.token,
        user: result.user
      });
    } catch (err) {
      if (err.message === 'Invalid credentials') {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email/username or password is incorrect'
        });
      }

      console.error('Login error:', err);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user
   * Requires authentication
   */
  async me(req, res) {
    try {
      // req.user is set by authenticateToken middleware
      const user = await authService.getUserById(req.user.userId);

      res.json({ user });
    } catch (err) {
      if (err.message === 'User not found') {
        return res.status(404).json({ error: err.message });
      }

      console.error('Get user error:', err);
      res.status(500).json({
        error: 'Failed to retrieve user',
        message: 'An error occurred while fetching user data'
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout (client-side token deletion)
   * This is mainly for documentation - JWT logout happens client-side
   */
  async logout(req, res) {
    res.json({
      message: 'Logout successful',
      note: 'Please delete the token from client storage'
    });
  }
}

module.exports = new AuthController();
