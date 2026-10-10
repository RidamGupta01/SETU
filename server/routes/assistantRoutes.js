const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const Complaint = require('../models/Complaint');
const openaiAssistantService = require('../services/openaiAssistantService');

// Custom in-memory rate-limiter (20 requests per hour per user)
const limitStore = new Map();

const hourlyLimit = (req, res, next) => {
  const userId = req.user._id.toString();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!limitStore.has(userId)) {
    limitStore.set(userId, []);
  }

  const timestamps = limitStore.get(userId).filter(t => now - t < oneHour);
  if (timestamps.length >= 20) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Citizens are limited to 20 AI assistant questions per hour to optimize API costs.' 
    });
  }

  timestamps.push(now);
  limitStore.set(userId, timestamps);
  next();
};

// POST /api/assistant/ask
router.post('/ask', requireAuth, hourlyLimit, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // Pull citizen's complaints as grounding context
    const complaints = await Complaint.find({ 
      citizen: req.user._id, 
      isDeleted: { $ne: true } 
    }).populate('department');

    const reply = await openaiAssistantService.answerQuestion(question, complaints);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
