'use strict';

const { query } = require('../config/database');

async function getAll() {
  const { rows } = await query('SELECT setting_key, setting_value FROM settings ORDER BY setting_key');
  const out = {};
  for (const r of rows) out[r.setting_key] = r.setting_value;
  return out;
}

async function set(key, value) {
  await query(
    `INSERT INTO settings (setting_key, setting_value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
    [key, value === undefined || value === null ? null : String(value)]
  );
}

async function setMany(entries) {
  for (const [key, value] of Object.entries(entries)) {
    await set(key, value);
  }
}

module.exports = { getAll, set, setMany };
