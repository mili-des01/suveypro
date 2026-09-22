'use strict';

const { Pool } = require('pg');
const environment = require('./environment');

let pool;

function getPool() {
  if (!pool) {
    if (!environment.databaseUrl) {
      throw new Error('DATABASE_URL is not configured. Copy .env.example to .env and set it.');
    }
    // Serverless platforms (e.g. Vercel) scale horizontally and need SSL —
    // keep the pool small and reuse connections across invocations.
    const isServerless = Boolean(process.env.VERCEL);
    pool = new Pool({
      connectionString: environment.databaseUrl,
      max: isServerless ? 3 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: /sslmode=(disable|verify-full)/.test(environment.databaseUrl)
        ? undefined
        : { rejectUnauthorized: false }
    });
    pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

/**
 * Run a parameterized query.
 */
function query(text, params = []) {
  return getPool().query(text, params);
}

/**
 * Run a set of statements inside a single transaction.
 * `fn` receives a client with query() bound to the transaction.
 */
async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getPool, query, withTransaction, closePool };
