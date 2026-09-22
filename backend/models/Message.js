'use strict';

const { query } = require('../config/database');

const STATUSES = ['unread', 'read', 'replied', 'archived'];

function toCamel(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at
  };
}

async function create(data, client = null) {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(
    `INSERT INTO messages (name, email, phone, subject, message)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [data.name, data.email, data.phone || null, data.subject || null, data.message]
  );
  return rows[0];
}

async function list({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT * FROM messages ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM messages ${whereSql}`, params);
  return { data: rows.map(toCamel), total: countRows[0].n, page, limit };
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM messages WHERE id = $1', [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function updateStatus(id, status) {
  const { rows } = await query(
    'UPDATE messages SET status = $2 WHERE id = $1 RETURNING id, status',
    [id, status]
  );
  return rows[0] || null;
}

async function unreadCount() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM messages WHERE status = 'unread'");
  return rows[0].n;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM messages WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { STATUSES, create, list, findById, updateStatus, unreadCount, remove, toCamel };
