// src/routes/newsletter.routes.js
const express = require('express');
const db = require('../db');
const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/newsletter  { email }
router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  try {
    await db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)').run(email.toLowerCase().trim());
    res.status(201).json({ message: "You're on the list." });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(200).json({ message: 'Already subscribed.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;