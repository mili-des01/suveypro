'use strict';

const { query } = require('../config/database');

/**
 * Finds or creates a client record from booking/contact submission data.
 * Matching is done by email, falling back to phone.
 */
async function findOrCreate({ name, email, phone, address }, client = null) {
  const q = client ? client.query.bind(client) : query;

  if (email) {
    const { rows } = await q('SELECT * FROM clients WHERE lower(email) = lower($1) LIMIT 1', [email]);
    if (rows[0]) {
      // Update name/phone if they arrived empty before
      // ($2/$3 are used in IS NOT NULL contexts where pg can't infer their
      // type — explicit ::text casts avoid pg error 42P08.)
      await q(
        `UPDATE clients SET
           name = CASE WHEN name IS NULL OR name = '' THEN $2::text ELSE name END,
           phone = CASE WHEN (phone IS NULL OR phone = '') AND $3::text IS NOT NULL THEN $3::text ELSE phone END,
           updated_at = NOW()
         WHERE id = $1`,
        [rows[0].id, name || null, phone || null]
      );
      return rows[0].id;
    }
  }

  if (!email && phone) {
    const { rows } = await q('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [phone]);
    if (rows[0]) return rows[0].id;
  }

  const { rows } = await q(
    `INSERT INTO clients (name, email, phone, address)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, email || null, phone || null, address || null]
  );
  return rows[0].id;
}

async function list({ page = 1, limit = 20, search } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(c.name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT c.*,
            COUNT(b.id)::int AS total_bookings,
            COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed_bookings,
            COUNT(b.id) FILTER (WHERE b.status IN ('pending','confirmed','assigned','in_progress'))::int AS pending_bookings,
            MAX(b.created_at) AS last_booking_at
     FROM clients c
     LEFT JOIN bookings b ON b.client_id = c.id
     ${whereSql}
     GROUP BY c.id
     ORDER BY MAX(b.created_at) DESC NULLS LAST, c.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS n FROM clients c ${whereSql}`,
    params
  );
  return { data: rows, total: countRows[0].n, page, limit };
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM clients WHERE id = $1', [id]);
  return rows[0] || null;
}

async function getBookingHistory(id) {
  const { rows } = await query(
    `SELECT b.id, b.booking_reference, b.status, b.property_address, b.city, b.preferred_date, b.created_at,
            s.name AS service_name
     FROM bookings b
     LEFT JOIN services s ON s.id = b.service_id
     WHERE b.client_id = $1
     ORDER BY b.created_at DESC`,
    [id]
  );
  return rows;
}

async function update(id, { name, email, phone, address }) {
  const { rows } = await query(
    `UPDATE clients SET
       name = COALESCE($2, name),
       email = COALESCE($3, email),
       phone = COALESCE($4, phone),
       address = COALESCE($5, address),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, name || null, email || null, phone || null, address || null]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM clients WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findOrCreate, list, findById, getBookingHistory, update, remove };
