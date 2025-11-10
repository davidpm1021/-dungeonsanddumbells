const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middleware/auth');

// All goal routes require authentication
router.post('/', authenticateToken, goalController.create);
router.get('/', authenticateToken, goalController.list);
router.get('/:id', authenticateToken, goalController.getById);
router.post('/:id/complete', authenticateToken, goalController.complete);
router.get('/:id/streak', authenticateToken, goalController.getStreak);
router.get('/:id/completions', authenticateToken, goalController.getCompletions);
router.patch('/:id', authenticateToken, goalController.update);
router.delete('/:id', authenticateToken, goalController.delete);

module.exports = router;
