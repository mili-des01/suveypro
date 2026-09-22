'use strict';

const { query } = require('../config/database');

async function create({ userId = null, title, message = null, type = 'info' }) {
  const { rows } = await query(
    'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4) RETURNING id',
    [userId, title, message, type]
  );
  return rows[0];
}

async function list({ userId = null, limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT * FROM notifications
     WHERE ($1::int IS NULL AND user_id IS NULL) OR user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function unreadCount(userId = null) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM notifications
     WHERE read = FALSE AND (($1::int IS NULL AND user_id IS NULL) OR user_id = $1)`,
    [userId]
  );
  return rows[0].n;
}

async function markRead(id) {
  await query('UPDATE notifications SET read = TRUE WHERE id = $1', [id]);
}

module.exports = { create, list, unreadCount, markRead };
