// src/db.js
// SQLite connection + schema setup using better-sqlite3 (synchronous, zero-config).
// Swapping to Postgres/MySQL/Mongo later only means rewriting this file and the
// query calls inside src/routes/*.js — the route handlers themselves stay the same shape.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const DB_FILE = process.env.DB_FILE || './data/reelmark.db';
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    title         TEXT NOT NULL,
    year          INTEGER NOT NULL,
    genre         TEXT NOT NULL,
    director      TEXT NOT NULL,
    runtime       INTEGER NOT NULL,
    rating        REAL NOT NULL,
    blurb         TEXT NOT NULL,
    review        TEXT NOT NULL,
    verdict       TEXT NOT NULL,
    icon          TEXT NOT NULL,
    colors        TEXT NOT NULL,   -- JSON array, e.g. ["#3a2a18","#000000"]
    tags          TEXT NOT NULL,   -- JSON array, e.g. ["Slow Burn","Family Drama"]
    critic        TEXT NOT NULL,
    published     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );


    CREATE TABLE IF NOT EXISTS users (

    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password      TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))

  );
`);

// Add OMDb fields to reviews table if they don't already exist
try {
    db.exec(`
        ALTER TABLE reviews ADD COLUMN imdb_id TEXT;
    `);
} catch (error) {
    // Column already exists
}

try {
    db.exec(`
        ALTER TABLE reviews ADD COLUMN poster TEXT;
    `);
} catch (error) {
    // Column already exists
}

module.exports = db;