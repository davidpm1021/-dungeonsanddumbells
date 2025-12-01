const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const redisClient = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const goalRoutes = require('./routes/goals');
const narrativeRoutes = require('./routes/narrative');
const questRoutes = require('./routes/quests');
const storyRoutes = require('./routes/story');
const lorekeeperRoutes = require('./routes/lorekeeper');
const monitoringRoutes = require('./routes/monitoring');
const worldEventRoutes = require('./routes/worldEvents');
const agentLabRoutes = require('./routes/agentLab');
const dmRoutes = require('./routes/dm');
const healthRoutes = require('./routes/health');
const wearablesRoutes = require('./routes/wearables');
const achievementsRoutes = require('./routes/achievements');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/narrative', narrativeRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/story', storyRoutes);
app.use('/api/lorekeeper', lorekeeperRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/world-events', worldEventRoutes);
app.use('/api/agent-lab', agentLabRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/wearables', wearablesRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize server with Redis connection
async function startServer() {
  try {
    // Initialize Redis (non-blocking, will fallback to PostgreSQL if fails)
    console.log('[Server] Initializing Redis...');
    await redisClient.connect();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Dumbbells & Dragons API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`💾 Redis: ${redisClient.isAvailable() ? 'Connected' : 'Unavailable (using PostgreSQL fallback)'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('[Server] HTTP server closed');

        // Close Redis connection
        await redisClient.disconnect();

        console.log('[Server] Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;

