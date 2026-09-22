'use strict';

const { query } = require('../config/database');

const ALLOWED_ROLES = ['admin', 'manager', 'surveyor', 'staff'];

function sanitize(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function list({ page = 1, limit = 20, role, status, search } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (role) { params.push(role); where.push(`role = $${params.length}`); }
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT id, name, email, role, status, created_at, updated_at
     FROM users ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM users ${whereSql}`, params);
  return { data: rows.map(sanitize), total: countRows[0].n, page, limit };
}

async function create({ name, email, password_hash, role = 'staff' }) {
  if (!ALLOWED_ROLES.includes(role)) throw new Error(`Invalid role: ${role}`);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, status, created_at`,
    [name, email.toLowerCase(), password_hash, role]
  );
  return rows[0];
}

async function updateProfile(id, { name, email }) {
  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($2, name),
       email = COALESCE($3, email),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, role, status, updated_at`,
    [id, name || null, email ? email.toLowerCase() : null]
  );
  return rows[0];
}

async function updatePassword(id, password_hash) {
  await query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, password_hash]);
}

async function updateRoleStatus(id, { role, status }) {
  const { rows } = await query(
    `UPDATE users SET
       role = COALESCE($2, role),
       status = COALESCE($3, status),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, role, status`,
    [id, role || null, status || null]
  );
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  ALLOWED_ROLES,
  findByEmail,
  findById,
  list,
  create,
  updateProfile,
  updatePassword,
  updateRoleStatus,
  remove,
  sanitize
};
