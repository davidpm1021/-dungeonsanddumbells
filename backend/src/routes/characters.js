const express = require('express');
const router = express.Router();
const characterController = require('../controllers/characterController');
const { authenticateToken } = require('../middleware/auth');

// All character routes require authentication
router.post('/', authenticateToken, characterController.create);
router.get('/me', authenticateToken, characterController.getMyCharacter);
router.get('/:id', authenticateToken, characterController.getById);

module.exports = router;
