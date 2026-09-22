#!/usr/bin/env node
'use strict';

/**
 * Simple, portable SQL migration runner.
 * Applies migrations in filename order; tracks applied files in schema_migrations.
 */

const fs = require('fs');
const path = require('path');

// Load env (database url)
require('dotenv').config();

const db = require('../backend/config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    process.exit(0);
  }

  await db.getPool().query('SELECT 1'); // fail fast if DB unreachable
  await db.withTransaction(ensureTrackingTable);
  const { rows } = await db.query('SELECT name FROM schema_migrations');

  const applied = new Set(rows.map((r) => r.name));
  let ran = 0;

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`Applying ${file} ... `);
    try {
      await db.withTransaction(async (client) => {
        await ensureTrackingTable(client);
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      });
      console.log('done');
      ran += 1;
    } catch (err) {
      console.log('FAILED');
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log(ran === 0 ? 'Database is up to date.' : `Applied ${ran} migration(s).`);
  await db.closePool();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
