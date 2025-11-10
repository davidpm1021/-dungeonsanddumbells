const express = require('express');
const router = express.Router();
const narrativeController = require('../controllers/narrativeController');
const { authenticateToken, loadCharacter } = require('../middleware/auth');

/**
 * Narrative & Memory Routes
 * All routes require authentication and character context
 */

// Get complete narrative context (all memory tiers + world state)
router.get('/context', authenticateToken, loadCharacter, narrativeController.getCompleteContext);

// Working memory (last 10 interactions)
router.get('/memory/working', authenticateToken, loadCharacter, narrativeController.getWorkingMemory);

// Episode memory (compressed summaries)
router.get('/memory/episodes', authenticateToken, loadCharacter, narrativeController.getEpisodeMemory);

// Long-term memory (important facts)
router.get('/memory/longterm', authenticateToken, loadCharacter, narrativeController.getLongTermMemory);
router.post('/memory/longterm', authenticateToken, loadCharacter, narrativeController.storeLongTermMemory);

// Search memories
router.get('/memory/search', authenticateToken, loadCharacter, narrativeController.searchMemories);

// World state
router.get('/world-state', authenticateToken, loadCharacter, narrativeController.getWorldState);
router.put('/world-state', authenticateToken, loadCharacter, narrativeController.updateWorldState);

// Narrative summary
router.get('/summary', authenticateToken, loadCharacter, narrativeController.getNarrativeSummary);

// Store custom narrative event
router.post('/events', authenticateToken, loadCharacter, narrativeController.storeNarrativeEvent);

// Compress old events into episode
router.post('/compress', authenticateToken, loadCharacter, narrativeController.compressEpisode);

// Get World Bible (immutable ground truth)
router.get('/world-bible', narrativeController.getWorldBible); // No auth required - it's public lore

// Get narrative summary with stats (for E2E testing)
router.get('/summary/:characterId', narrativeController.getNarrativeSummaryWithStats); // No auth for testing

// Get narrative events (for E2E testing)
router.get('/events/:characterId', narrativeController.getNarrativeEvents); // No auth for testing

// RAG retrieval (for E2E testing)
router.post('/rag/retrieve', narrativeController.retrieveRelevantEvents); // No auth for testing

module.exports = router;
