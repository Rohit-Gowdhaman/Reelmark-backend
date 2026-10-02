// src/db.js
// PostgreSQL connection + schema setup using the "pg" package.
//
// The rest of the app uses the same call style it used with SQLite:
//   await db.prepare('SELECT * FROM users WHERE id = ?').get(id)
//   await db.prepare('SELECT * FROM reviews').all()
//   await db.prepare('INSERT INTO ...').run(a, b, c)   -> { changes, lastInsertRowid }
// The only difference is that every call is now async, so it needs "await".
// "?" placeholders are converted to Postgres "$1, $2, ..." automatically.

require('dotenv').config();
const { Pool, types } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Add your Neon/Postgres connection string to the environment variables.'
  );
}

// COUNT(*) returns a bigint, which pg gives back as a string by default.
// Parse it as a normal number so the API output stays the same as before.
types.setTypeParser(20, (value) => parseInt(value, 10));

const connectionString = process.env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  // Neon and most hosted databases require SSL. If the connection string
  // already contains "sslmode", pg handles it; otherwise we enable SSL here.
  ssl: isLocal || /sslmode=/.test(connectionString) ? undefined : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
});

// An idle connection can be dropped when the database goes to sleep.
// Log it instead of crashing the server; the pool opens a new one on demand.
pool.on('error', (err) => {
  console.error('Postgres pool error (will reconnect):', err.message);
});

// Convert "?" placeholders to $1, $2, ...
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Postgres would turn a JS array into its own array format ({"a","b"}).
// This app stores arrays (colors, tags) as JSON text, so convert them here.
function normalizeParams(params) {
  return params.map((p) => (Array.isArray(p) ? JSON.stringify(p) : p));
}

const TRANSIENT = /Connection terminated|ECONNRESET|ETIMEDOUT|EPIPE|timeout exceeded/i;

async function runQuery(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    // The database may have been asleep; retry once.
    if (TRANSIENT.test(err.message || '')) {
      return pool.query(sql, params);
    }
    throw err;
  }
}

// ----------------------------------------------------------
// Schema setup (runs once; every query waits for it)
// ----------------------------------------------------------
const NOW_TEXT = `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')`;

const ready = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password      TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      created_at    TEXT NOT NULL DEFAULT (${NOW_TEXT})
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL,
      title         TEXT NOT NULL,
      year          INTEGER NOT NULL,
      genre         TEXT NOT NULL,
      director      TEXT NOT NULL,
      runtime       INTEGER NOT NULL,
      rating        DOUBLE PRECISION NOT NULL,
      blurb         TEXT NOT NULL,
      review        TEXT NOT NULL,
      verdict       TEXT NOT NULL,
      icon          TEXT NOT NULL,
      colors        TEXT NOT NULL,   -- JSON array, e.g. ["#3a2a18","#000000"]
      tags          TEXT NOT NULL,   -- JSON array, e.g. ["Slow Burn","Family Drama"]
      critic        TEXT NOT NULL,
      published     TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      created_at    TEXT NOT NULL DEFAULT (${NOW_TEXT}),
      imdb_id       TEXT,
      poster        TEXT
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      created_at    TEXT NOT NULL DEFAULT (${NOW_TEXT})
    );
  `);

  // Safe on databases created before these columns existed
  await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS imdb_id TEXT');
  await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS poster TEXT');
})();

// Fail loudly (once) if the schema could not be created, e.g. wrong DATABASE_URL
ready.catch((err) => {
  console.error('Database setup failed:', err.message);
});

// ----------------------------------------------------------
// SQLite-style API
// ----------------------------------------------------------
function prepare(sql) {
  const pgSql = toPgSql(sql);
  const isInsert = /^\s*INSERT\b/i.test(sql);
  const hasReturning = /\bRETURNING\b/i.test(sql);

  return {
    // First row or undefined
    async get(...params) {
      await ready;
      const result = await runQuery(pgSql, normalizeParams(params));
      return result.rows[0];
    },

    // All rows
    async all(...params) {
      await ready;
      const result = await runQuery(pgSql, normalizeParams(params));
      return result.rows;
    },

    // INSERT / UPDATE / DELETE -> { changes, lastInsertRowid }
    async run(...params) {
      await ready;
      const finalSql = isInsert && !hasReturning ? `${pgSql} RETURNING id` : pgSql;
      const result = await runQuery(finalSql, normalizeParams(params));
      return {
        changes: result.rowCount,
        lastInsertRowid: isInsert && result.rows[0] ? result.rows[0].id : undefined,
      };
    },
  };
}

// Run several statements as one all-or-nothing transaction.
// fn receives a client with a query(sql, params) method.
async function transaction(fn) {
  await ready;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function close() {
  await pool.end();
}

module.exports = { prepare, transaction, close, ready, pool };
