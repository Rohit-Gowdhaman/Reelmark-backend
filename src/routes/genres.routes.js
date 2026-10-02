// src/routes/genres.routes.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /api/genres  -> [{ genre: "Drama", count: 2 }, ...]
router.get('/', async (req, res) => {
  const rows = await db.prepare('SELECT genre, COUNT(*) AS count FROM reviews GROUP BY genre ORDER BY genre').all();
  res.json(rows);
});

module.exports = router;