const express = require('express');
const {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  decideRequest
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, createOrGetConversation);
router.get('/conversations/:id', protect, getMessages);
router.post('/conversations/:id/messages', protect, sendMessage);
router.put('/messages/:id/decision', protect, decideRequest);

module.exports = router;
