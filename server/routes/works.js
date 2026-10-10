const express = require('express');
const router = express.Router();
const DeptWork = require('../models/DeptWork');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const works = await DeptWork.find().sort({ startsOn: 1 });
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const work = await DeptWork.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(work);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
